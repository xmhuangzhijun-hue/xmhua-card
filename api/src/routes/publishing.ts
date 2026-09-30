import { Hono, type Context } from "hono";
import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, open, unlink, statfs } from "node:fs/promises";
import { resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../db/client.js";
import { publishAssets, publishJobs, publishWorkers } from "../db/schema.js";
import { env } from "../env.js";
import { ApiError, badRequest, notFound, parseBody, unauthorized } from "../lib/http.js";
import { requireAdmin } from "../middleware/auth.js";
import { requireTenant } from "../services/tenant.js";
import * as publishing from "../services/publishing.js";

export const publishingAdminRoutes = new Hono();
export const publishingWorkerRoutes = new Hono();
const uuid = z.string().uuid();
const storage = () => resolve(env.uploadDir, "private-video");
const maxBytes = 512 * 1024 * 1024;

publishingAdminRoutes.use("*", requireAdmin);
publishingAdminRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  const origin = c.req.header("origin");
  if (c.req.method !== "GET" && origin && !env.corsOrigins.includes(origin) && new URL(origin).host !== c.req.header("host")) throw new ApiError(403, "ORIGIN_REJECTED");
  await next();
});
async function tenantId(c: Context) {
  const tenant = await requireTenant(c.req.query("tenant"));
  const identity = c.get("identity");
  if (identity.tenantId !== null && identity.tenantId !== tenant.id) throw unauthorized();
  return tenant.id;
}
publishingAdminRoutes.get("/", async c => c.json({ data: await publishing.overview(await tenantId(c)) }));
publishingAdminRoutes.post("/workers", async c => {
  const body = await parseBody(c, z.object({ name: z.string().trim().min(1).max(60) }));
  return c.json({ data: await publishing.createWorker(await tenantId(c), body.name) }, 201);
});
publishingAdminRoutes.delete("/workers/:id", async c => {
  const tenant = await tenantId(c);
  const id = uuid.parse(c.req.param("id"));
  await getDatabase().update(publishWorkers).set({ active: false }).where(and(eq(publishWorkers.id, id), eq(publishWorkers.tenantId, tenant)));
  await getDatabase().update(publishJobs).set({ state: "cancelled", updatedAt: new Date() }).where(and(eq(publishJobs.workerId, id), eq(publishJobs.tenantId, tenant), eq(publishJobs.state, "queued")));
  return c.json({ data: { ok: true } });
});
publishingAdminRoutes.post("/jobs", async c => c.json({ data: await publishing.enqueue(await tenantId(c), await parseBody(c, publishing.jobInput)) }, 201));
publishingAdminRoutes.post("/jobs/:id/cancel", async c => {
  const tenant = await tenantId(c);
  const [row] = await getDatabase().update(publishJobs).set({ state: "cancelled", updatedAt: new Date() }).where(and(eq(publishJobs.id, uuid.parse(c.req.param("id"))), eq(publishJobs.tenantId, tenant), eq(publishJobs.state, "queued"))).returning();
  if (!row) throw new ApiError(409, "ONLY_QUEUED_CAN_CANCEL");
  return c.json({ data: { ok: true } });
});
publishingAdminRoutes.post("/assets", async c => {
  const tenant = await tenantId(c);
  const length = Number(c.req.header("content-length"));
  if (length > maxBytes) throw new ApiError(413, "VIDEO_TOO_LARGE");
  if (!c.req.raw.body) throw badRequest("VIDEO_REQUIRED");
  const name = decodeURIComponent(c.req.header("x-file-name") ?? "video.mp4").replace(/[\\/\x00-\x1f]/g, "_").slice(0, 160);
  const id = randomUUID();
  await mkdir(storage(), { recursive: true, mode: 0o700 });
  const disk = await statfs(storage());
  if (disk.bavail * disk.bsize < (length || maxBytes) + 256 * 1024 * 1024) throw new ApiError(507, "VIDEO_STORAGE_FULL");
  const path = resolve(storage(), id + ".mp4");
  let size = 0;
  try {
    const limit = new Transform({ transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length;
      callback(size > maxBytes ? new ApiError(413, "VIDEO_TOO_LARGE") : null, chunk);
    } });
    await pipeline(Readable.fromWeb(c.req.raw.body as never), limit, createWriteStream(path, { flags: "wx", mode: 0o600 }));
    const handle = await open(path, "r");
    const head = Buffer.alloc(12);
    try { await handle.read(head, 0, 12, 0); } finally { await handle.close(); }
    if (size < 12 || head.toString("ascii", 4, 8) !== "ftyp") throw badRequest("MP4_REQUIRED");
    await getDatabase().insert(publishAssets).values({ id, tenantId: tenant, name, size });
    return c.json({ data: { id, name, size } }, 201);
  } catch (error) { await unlink(path).catch(() => undefined); throw error; }
});

async function worker(c: Context) {
  return publishing.authenticateWorker((c.req.header("authorization") ?? "").replace(/^Bearer /, ""));
}
publishingWorkerRoutes.use("*", async (c, next) => { c.header("Cache-Control", "no-store"); await next(); });
publishingWorkerRoutes.post("/claim", async c => c.json({ data: await publishing.claim((await worker(c)).id) }));
publishingWorkerRoutes.post("/heartbeat", async c => {
  const current = await worker(c);
  await getDatabase().update(publishWorkers).set({ lastSeen: new Date() }).where(eq(publishWorkers.id, current.id));
  return c.json({ data: { ok: true } });
});
publishingWorkerRoutes.post("/recover", async c => {
  const current = await worker(c);
  await getDatabase().update(publishJobs).set({ state: "needs_attention", message: "执行器曾重启，请核验平台记录；任务没有自动重发。", updatedAt: new Date() }).where(and(eq(publishJobs.workerId, current.id), eq(publishJobs.state, "running")));
  return c.json({ data: { ok: true } });
});
publishingWorkerRoutes.post("/jobs/:id/report", async c => c.json({ data: await publishing.report((await worker(c)).id, uuid.parse(c.req.param("id")), await parseBody(c, publishing.reportInput)) }));
publishingWorkerRoutes.get("/assets/:id", async c => {
  const current = await worker(c);
  const id = uuid.parse(c.req.param("id"));
  const [asset] = await getDatabase().select().from(publishAssets).where(and(eq(publishAssets.id, id), eq(publishAssets.tenantId, current.tenantId)));
  if (!asset) throw notFound();
  c.header("Content-Type", "video/mp4");
  c.header("Content-Length", String(asset.size));
  return c.body(Readable.toWeb(createReadStream(resolve(storage(), id + ".mp4"))) as ReadableStream);
});
