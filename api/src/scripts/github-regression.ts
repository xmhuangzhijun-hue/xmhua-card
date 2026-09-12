import assert from "node:assert/strict";
import { Octokit } from "@octokit/rest";
import { classifyPull, fetchProject, refreshSnapshot, repositoryFromHref, type ProjectFact } from "../services/github.js";

const previous: ProjectFact = { repo: "owner/repo", url: "https://github.com/owner/repo", stars: 12, language: "TypeScript", license: "MIT", pushedAt: null, release: null, syncedAt: "2026-09-01T00:00:00Z" };
const failed = await refreshSnapshot({ projects: { "owner/repo": previous }, failed: [] }, [{ repo: "owner/repo" }], async () => { throw new Error("rate limited"); });
assert.deepEqual(failed.projects["owner/repo"], previous, "failure must preserve last known good facts and date");
assert.deepEqual(failed.failed, ["owner/repo"]);
const emptyFailure = await refreshSnapshot({ projects: {}, failed: [] }, [{ repo: "owner/repo" }], async () => { throw new Error("offline"); });
assert.equal(Object.keys(emptyFailure.projects).length, 0, "no invented zero counts on first failure");
assert.equal(classifyPull(1, "Fix", "https://github.com/owner/repo/pull/1", "closed", false).state, "closed");
assert.equal(repositoryFromHref("https://github.com/Owner/Repo/pulls?q=test"), "owner/repo");
assert.equal(repositoryFromHref("https://github.com.evil.test/owner/repo"), null);
assert.equal(repositoryFromHref("file:///owner/repo"), null);

let incomplete = false;
const client = new Octokit({ request: { fetch: async (input: string | URL | Request) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  let data: unknown;
  let status = 200;
  if (url.pathname.endsWith("/releases/latest")) { data = { message: "Not Found" }; status = 404; }
  else if (url.pathname === "/search/issues") data = { total_count: incomplete ? 2 : 1, incomplete_results: false, items: [{ number: 1 }] };
  else if (url.pathname.endsWith("/pulls/1")) data = { number: 1, title: "Original", html_url: "https://github.com/owner/repo/pull/1", user: { login: "author" }, state: "closed", merged: false };
  else if (url.pathname.endsWith("/pulls/2")) data = { merged: true, html_url: "https://github.com/owner/repo/pull/2" };
  else data = { private: false, html_url: "https://github.com/owner/repo", stargazers_count: 15, language: "TypeScript", license: { spdx_id: "MIT" }, pushed_at: null };
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
} } });
const source = { repo: "owner/repo", author: "author", adoptions: [{ original: 1, mergedVia: 2 }] };
const fact = await fetchProject(source, client, "2026-09-12T00:00:00Z");
assert.equal(fact.pulls?.[0]?.state, "closed", "preserve original PR state");
assert.equal(fact.pulls?.[0]?.mergedVia?.number, 2, "record verified adoption separately");
assert.equal(fact.release, null, "404 release means no published release");
incomplete = true;
await assert.rejects(fetchProject(source, client, "2026-09-12T00:00:00Z"), /Incomplete/);
console.log("GitHub regression passed: stale retention, first failure, host boundary, adoption and incomplete counts");
