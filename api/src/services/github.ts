import { Octokit } from "@octokit/rest";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../db/client.js";
import { products, siteSettings, tenants } from "../db/schema.js";

export const syncInterval = 60 * 60 * 1000;
const key = "github-public-snapshot-v1";
// Explicit, reviewed contribution provenance; never infer adoption from a closed PR.
export const projectSources = [
  { repo: "xmhuangzhijun-hue/xmhua-card" },
  { repo: "NousResearch/hermes-agent", author: "xmhuangzhijun-hue", adoptions: [{ original: 97572, mergedVia: 101570 }] },
  { repo: "xmhuangzhijun-hue/ruoxi-shell" },
  { repo: "xmhuangzhijun-hue/organic-agent-os" },
  { repo: "pnpm/pnpm", author: "xmhuangzhijun-hue" },
] satisfies Source[];
export type Source = { repo: string; author?: string; adoptions?: { original: number; mergedVia: number }[] };
export type PullFact = { number: number; title: string; url: string; state: "open" | "merged" | "closed"; mergedVia?: { number: number; url: string } };
export type ProjectFact = {
  repo: string; url: string; stars: number; language: string | null; license: string | null;
  pushedAt: string | null; release: { tag: string; url: string } | null; pulls?: PullFact[]; syncedAt: string;
};
export type Snapshot = { projects: Record<string, ProjectFact>; attemptedAt?: string; failed: string[] };

export function repositoryFromHref(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.hostname !== "github.com" || url.protocol !== "https:") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}`.toLowerCase() : null;
  } catch { return null; }
}

export function classifyPull(number: number, title: string, url: string, state: string, merged: boolean): PullFact {
  return { number, title, url, state: merged ? "merged" : state === "open" ? "open" : "closed" };
}

export async function fetchProject(source: Source, client: Octokit, now: string): Promise<ProjectFact> {
  const [owner, repo] = source.repo.split("/");
  if (!owner || !repo) throw new Error("Invalid repository mapping");
  const { data: repository } = await client.repos.get({ owner, repo });
  if (repository.private) throw new Error("Private repositories are excluded");
  let release: ProjectFact["release"] = null;
  try {
    const { data } = await client.repos.getLatestRelease({ owner, repo });
    release = { tag: data.tag_name, url: data.html_url };
  } catch (error) {
    if (!(error instanceof Error && "status" in error && error.status === 404)) throw error;
  }
  const fact: ProjectFact = {
    repo: source.repo, url: repository.html_url, stars: repository.stargazers_count,
    language: repository.language, license: repository.license?.spdx_id ?? null,
    pushedAt: repository.pushed_at, release, syncedAt: now,
  };
  if (source.author) {
    const result = await client.search.issuesAndPullRequests({ q: `repo:${source.repo} author:${source.author} is:pr`, per_page: 100 });
    // Never publish a partial count as a complete contribution list.
    if (result.data.incomplete_results || result.data.total_count > result.data.items.length) throw new Error("Incomplete contribution result");
    fact.pulls = [];
    for (const item of result.data.items) {
      const { data } = await client.pulls.get({ owner, repo, pull_number: item.number });
      if (data.user?.login.toLowerCase() !== source.author.toLowerCase()) throw new Error("Unexpected contribution author");
      const pull = classifyPull(data.number, data.title, data.html_url, data.state, data.merged);
      const adoption = source.adoptions?.find(entry => entry.original === data.number);
      if (adoption && pull.state === "closed") {
        const replacement = await client.pulls.get({ owner, repo, pull_number: adoption.mergedVia });
        if (replacement.data.merged) pull.mergedVia = { number: adoption.mergedVia, url: replacement.data.html_url };
      }
      fact.pulls.push(pull);
    }
  }
  return fact;
}

export async function refreshSnapshot(previous: Snapshot, sources: Source[], fetcher: (source: Source, now: string) => Promise<ProjectFact>, now = new Date().toISOString()): Promise<Snapshot> {
  const next: Snapshot = { projects: { ...previous.projects }, attemptedAt: now, failed: [] };
  for (const source of sources) {
    try { next.projects[source.repo.toLowerCase()] = await fetcher(source, now); }
    catch { next.failed.push(source.repo.toLowerCase()); }
  }
  return next;
}

export async function readGithubSnapshot(tenantId: number): Promise<Snapshot> {
  const rows = await getDatabase().select().from(siteSettings).where(and(eq(siteSettings.tenantId, tenantId), eq(siteSettings.key, key))).limit(1);
  return (rows[0]?.value as Snapshot | undefined) ?? { projects: {}, failed: [] };
}

export async function publicGithubSnapshot(tenantId: number) {
  const snapshot = await readGithubSnapshot(tenantId);
  const visible = await getDatabase().select({ href: products.href }).from(products).where(and(eq(products.tenantId, tenantId), eq(products.published, true)));
  const allowed = new Set(visible.map(row => repositoryFromHref(row.href)));
  return { ...snapshot, projects: Object.fromEntries(Object.entries(snapshot.projects).filter(([repo]) => allowed.has(repo))), failed: snapshot.failed.filter(repo => allowed.has(repo)) };
}

let running = false;
export async function syncGithub() {
  if (running) return;
  running = true;
  try {
    const db = getDatabase();
    // This reviewed portfolio mapping belongs only to this tenant.
    const [tenant] = await db.select().from(tenants).where(and(eq(tenants.slug, "xmhua"), eq(tenants.active, true))).limit(1);
    if (!tenant) return;
    const previous = await readGithubSnapshot(tenant.id);
    if (previous.attemptedAt && Date.now() - Date.parse(previous.attemptedAt) < syncInterval) return;
    const visible = await db.select({ href: products.href }).from(products).where(and(eq(products.tenantId, tenant.id), eq(products.published, true)));
    const allowed = new Set(visible.map(row => repositoryFromHref(row.href)));
    const sources = projectSources.filter(source => allowed.has(source.repo.toLowerCase()));
    const client = new Octokit({ request: { timeout: 10000 }, userAgent: "xmhua-card-public-status" });
    const next = await refreshSnapshot(previous, sources, (source, now) => fetchProject(source, client, now));
    await db.insert(siteSettings).values({ tenantId: tenant.id, key, value: next, updatedAt: new Date() }).onConflictDoUpdate({ target: [siteSettings.tenantId, siteSettings.key], set: { value: next, updatedAt: new Date() } });
    console.info("GitHub sync", { updated: sources.length - next.failed.length, failed: next.failed.length });
  } finally { running = false; }
}

export function startGithubSync() {
  if (process.env.GITHUB_SYNC_DISABLED === "true") return;
  const tick = () => { void syncGithub().catch(() => console.error("GitHub sync unavailable; retained last snapshot")); };
  tick();
  const timer = setInterval(tick, syncInterval);
  timer.unref();
}
