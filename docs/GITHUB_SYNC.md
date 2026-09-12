# Public GitHub project status

The API uses `@octokit/rest` to refresh a reviewed portfolio mapping every hour.
It only reads public GitHub data, without a token. Repository facts and complete
author PR results are saved under the tenant-scoped `github-public-snapshot-v1`
key in the existing PostgreSQL `site_settings` table. No schema migration or new
service is required. Startup checks the persisted attempt time before fetching;
concurrent ticks in one process are coalesced. Run one API scheduler instance.

`GET /api/github?tenant=xmhua` reads only the stored snapshot. It never initiates
upstream requests. Both syncing and serving are limited to published project
links. Other tenants cannot retrieve this tenant's snapshot. The homepage fetches
one snapshot for all cards, refreshes every five minutes while visible, and shows
the successful timestamp (UTC+8). On failure it retains prior facts and labels
them delayed; it never invents zero counts. A first failure displays an unavailable
message and a direct GitHub link. Partial search results are rejected.

The allowlist in `api/src/services/github.ts` is explicit, not inferred from prose.
Adding a new project or author requires reviewing its mapping. For Hermes, the
verified mapping #97572 -> #101570 is recorded there. The original PR remains
Closed; adoption is displayed separately only while the associated PR reports
merged. Closed PRs alone are never counted as merged or adopted. This mapping
does not infer future equivalent patches, cherry-picks or reversions.

Stars, language, SPDX license, latest release, last repository push and PR state
are live facts. Project descriptions are editorial CMS content and are never
rewritten by the scheduler. Count-bearing descriptions should be edited into
durable descriptions when enabling the live panel.

The six configured repositories need roughly 20 unauthenticated GitHub requests
per successful hour at current PR volume, below the usual 60/hour allowance.
That allowance is shared by IP; rate limiting preserves the snapshot. Large PR
results exceeding one page deliberately fail closed instead of truncating totals.
Set `GITHUB_SYNC_DISABLED=true` to disable background requests (candidate probes,
rollback verification or a future secondary API replica).

Verify: `npm run typecheck --prefix api`, `node api/node_modules/tsx/dist/cli.mjs
api/src/scripts/github-regression.ts`, and `GET /api/github`. Check non-default
tenant isolation, restart persistence, delayed-sync behavior and real homepage
contribution links. No credential is shipped to browsers.
