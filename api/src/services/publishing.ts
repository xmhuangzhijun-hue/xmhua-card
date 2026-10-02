import { randomBytes, randomUUID, createHash } from "node:crypto";
import { and, eq, desc, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../db/client.js";
import { publishWorkers, publishJobs, publishAssets } from "../db/schema.js";
import { conflict, notFound, unauthorized } from "../lib/http.js";

export const platforms = ["xiaohongshu", "tencent", "douyin", "bilibili", "youtube"] as const;
export const jobInput = z.object({
  requestId: z.string().uuid(), workerId: z.string().uuid(),
  kind: z.enum(["login", "check", "publish"]),
  platforms: z.array(z.enum(platforms)).min(1).max(5),
  assetId: z.string().uuid().optional(), title: z.string().trim().max(100).default(""),
  description: z.string().max(1000).default(""), tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  category: z.number().int().min(1).max(9999).default(249),
  original: z.boolean().default(true),
});
export const reportInput = z.object({
  state: z.enum(["completed", "submitted", "failed", "needs_attention"]),
  message: z.string().max(300),
  authenticated: z.boolean().optional(),
});
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createWorker(tenantId: number, name: string) {
  const token = randomBytes(32).toString("hex");
  const id = randomUUID();
  await getDatabase().insert(publishWorkers).values({ id, tenantId, name, tokenHash: hashToken(token) });
  return { id, token };
}

export async function authenticateWorker(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw unauthorized();
  const [worker] = await getDatabase().select().from(publishWorkers).where(eq(publishWorkers.tokenHash, hashToken(token))).limit(1);
  if (!worker || !worker.active) throw unauthorized();
  return worker;
}

export async function overview(tenantId: number) {
  const db = getDatabase();
  const [workers, jobs, assets] = await Promise.all([
    db.select({ id: publishWorkers.id, name: publishWorkers.name, lastSeen: publishWorkers.lastSeen, accounts: publishWorkers.accounts, active: publishWorkers.active }).from(publishWorkers).where(eq(publishWorkers.tenantId, tenantId)),
    db.select().from(publishJobs).where(eq(publishJobs.tenantId, tenantId)).orderBy(desc(publishJobs.createdAt)).limit(100),
    db.select({ id: publishAssets.id, name: publishAssets.name, size: publishAssets.size, createdAt: publishAssets.createdAt }).from(publishAssets).where(eq(publishAssets.tenantId, tenantId)).orderBy(desc(publishAssets.createdAt)).limit(50),
  ]);
  const cloudWorkerId = workers.find(worker => worker.active && worker.id === process.env.PUBLISHING_CLOUD_WORKER_ID)?.id ?? null;
  return { workers, jobs, assets, cloudWorkerId };
}

export async function enqueue(tenantId: number, input: z.infer<typeof jobInput>) {
  const db = getDatabase();
  const [worker] = await db.select().from(publishWorkers).where(and(eq(publishWorkers.id, input.workerId), eq(publishWorkers.tenantId, tenantId), eq(publishWorkers.active, true)));
  if (!worker) throw notFound("WORKER_NOT_FOUND");
  if (!worker.lastSeen || Date.now() - worker.lastSeen.getTime() > 45000) throw conflict("WORKER_OFFLINE");
  if (input.kind === "publish") {
    if (!input.assetId || !input.title) throw conflict("VIDEO_AND_TITLE_REQUIRED");
    const [asset] = await db.select().from(publishAssets).where(and(eq(publishAssets.id, input.assetId), eq(publishAssets.tenantId, tenantId)));
    if (!asset) throw notFound("ASSET_NOT_FOUND");
    if (input.platforms.includes("xiaohongshu") && [...input.title].length > 20) throw conflict("XHS_TITLE_TOO_LONG");
    for (const platform of input.platforms) {
      const account = worker.accounts[platform];
      if (!account?.authenticated || Date.now() - Date.parse(account.checkedAt) > 86400000) throw conflict("ACCOUNT_CHECK_REQUIRED");
    }
  }
  await db.transaction(async tx => {
    // Serialize account-task submissions on the same worker, including separate tabs.
    await tx.update(publishWorkers).set({ id: worker.id }).where(eq(publishWorkers.id, worker.id));
    const pending = input.kind === "publish" ? [] : await tx.select({ platform: publishJobs.platform }).from(publishJobs).where(and(
      eq(publishJobs.workerId, worker.id), inArray(publishJobs.kind, ["login", "check"]), inArray(publishJobs.state, ["queued", "running"]),
    ));
    const targets = [...new Set(input.platforms)].filter(platform => !pending.some(job => job.platform === platform));
    if (targets.length) await tx.insert(publishJobs).values(targets.map(platform => ({
      id: randomUUID(), tenantId, workerId: worker.id, requestId: input.requestId,
      platform, kind: input.kind, payload: { ...input, platforms: undefined },
    }))).onConflictDoNothing();
  });
  return overview(tenantId);
}

/** A claimed job is never automatically requeued: a lost receipt may follow a real publication. */
export async function claim(workerId: string) {
  const db = getDatabase();
  return db.transaction(async tx => {
    await tx.update(publishWorkers).set({ lastSeen: new Date() }).where(eq(publishWorkers.id, workerId));
    // Serialize claims on the worker row (including requests from a second accidental process).
    const running = await tx.select().from(publishJobs).where(and(eq(publishJobs.workerId, workerId), eq(publishJobs.state, "running"))).limit(1);
    if (running.length) return null;
    const [job] = await tx.select().from(publishJobs).where(and(eq(publishJobs.workerId, workerId), eq(publishJobs.state, "queued"))).orderBy(publishJobs.createdAt).limit(1);
    if (!job) return null;
    const [claimed] = await tx.update(publishJobs).set({ state: "running", updatedAt: new Date() }).where(and(eq(publishJobs.id, job.id), eq(publishJobs.state, "queued"))).returning();
    return claimed ?? null;
  });
}

export async function report(workerId: string, id: string, result: z.infer<typeof reportInput>) {
  const db = getDatabase();
  return db.transaction(async tx => {
    const [job] = await tx.update(publishJobs).set({ state: result.state, message: result.message, updatedAt: new Date() }).where(and(eq(publishJobs.id, id), eq(publishJobs.workerId, workerId), eq(publishJobs.state, "running"))).returning();
    if (!job) throw conflict("JOB_NOT_RUNNING");
    if (typeof result.authenticated === "boolean") {
      const update = JSON.stringify({ [job.platform]: { authenticated: result.authenticated, checkedAt: new Date().toISOString() } });
      await tx.update(publishWorkers).set({ accounts: sql`${publishWorkers.accounts} || ${update}::jsonb` }).where(eq(publishWorkers.id, workerId));
    }
    return { ok: true };
  });
}
