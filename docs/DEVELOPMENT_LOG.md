# Development log

This file is the durable engineering trail for each iteration. User-facing release summaries belong in [`CHANGELOG.md`](../CHANGELOG.md).

## 2026-09-01 — Public notes library

### Source feedback and scope

- The homepage exposed a short development-record section but had no durable place to browse a growing body of public notes.
- The requested reference used a compact numbered index; this iteration borrows that information architecture while retaining XMHUA branding, content, and the existing blue-gray visual system.
- Existing homepage, `/work`, content API, database schema, and management permissions remain unchanged.

### Changes

- Added a statically rendered `/notes` route that reads the existing tenant-aware `/api/content` article collection instead of introducing a second content source.
- Added category filters, title/summary search, empty-state feedback, article numbering, published dates, dark mode, and responsive mobile behavior.
- Rows with a real content link remain navigable; placeholder `#` rows are intentionally non-clickable so the interface does not imply that article bodies already exist.
- Added a persistent “笔记” link to the public homepage navigation and pointed the seed homepage’s “查看全部笔记” action to `/notes`.

### Verification

- `npm run check` passed ESLint with the existing homepage image warnings and zero errors, TypeScript, and the Next.js production build; `/notes` is statically prerendered.
- Production-mode browser acceptance found six notes and six derived categories at desktop width, with no horizontal page overflow.
- Filtering “数据产品” produced one row; an unmatched query displayed the intentional empty state; clearing the query restored six rows.
- At a 375 px viewport, `/notes` and the homepage had no horizontal page overflow, and the homepage “笔记” navigation entry remained visible.

### Deferred

- Current seed articles contain summaries but no body field, so this iteration does not invent full article pages. Those can be added as a separate content-model extension when real Markdown or rich-text bodies are ready.
- No remote push or production deployment was performed.

## 2026-08-31 — Evidence-first AI capability page and isolated business demo

### Source feedback and state before changes

- The first portfolio iteration still felt abstract: a recruiter could read project names but could not quickly judge the depth of AI use.
- The separate `ai-product-builder-portfolio` repository obscured the work and was explicitly rejected as a public entry point.
- The IAA frontend was useful evidence only if reviewers could enter a privacy-safe environment themselves.

### Changes

- Rebuilt `/work` around one visible capability chain: source intake → governed external memory → long-running Agent → business execution.
- Added implementation details and direct public evidence for Codex/Claude memory coordination, knowledge compilation, the Qinghe Hermes instance, five upstream PRs, and the IAA product.
- Embedded a separately built Vite demo at `/demo/iaa/`; its public login is client-only, fixed-seed, session-scoped, and explicitly disconnected from production.
- Excluded only `public/demo/**` from this repository's lint because those minified assets are validated in their source repository.

### Verification

- IAA source: `npm run build -- --base=/demo/iaa/` passed (1,590 modules).
- Embedded output scan found no production domain, production account marker, database URL, admin key, or rejected portfolio URL.
- `npm run check` passed ESLint (four pre-existing homepage image warnings), TypeScript, and the Next.js production build; `/work` remains statically prerendered.
- Browser acceptance opened `/work`, followed the local Demo link, used the published demo credentials, and rendered the operational table and filters. No application error was observed; the browser reported only Next development-mode CSP/eval diagnostics that do not occur in production builds.

### Deferred

- No production deployment or remote push was performed in this iteration.
- Deletion of the rejected separate portfolio repository remains a distinct incomplete action.

## 2026-08-31 — Public AI work portfolio

### Source feedback and state before changes

- The existing personal blog described projects at a high level but did not provide a recruiter-facing case-study route.
- A separate Hermes-only document was too narrow; the requested public presentation needed to reuse this blog and include Obsidian, AI coding collaboration, advertising data products, and other verified work.
- The homepage, content API, multi-tenant backend, and management routes had to remain unchanged.

### Changes

- Added a statically rendered `/work` route with five evidence-led case studies: Hermes, Obsidian, Codex/Claude Code engineering, an advertising data workbench, and XMHUA Card itself.
- Each case separates context, responsibility, implementation, verification evidence, and honest limits. Internal product names, credentials, production addresses, customer accounts, and private life data are excluded.
- Added a `案例` link to the existing homepage navigation and route-specific metadata for search and sharing.
- Added responsive mobile layouts, keyboard focus states, 44-pixel navigation targets, and reduced-motion handling while preserving the existing blue-gray visual system.

### Verification

- `npm run check` passed ESLint with the four pre-existing homepage image warnings, TypeScript, and the Next.js production build; `/work` is statically prerendered.
- Production-mode browser verification at `http://127.0.0.1:3018/work` found five case studies, the expected title and no Next.js development overlay.
- Browser checks at 778-pixel and 375-pixel viewports found no horizontal overflow. Desktop and mobile screenshots were visually inspected, including the first case-study body.
- The original homepage still renders its existing hero and exposes one `/work` navigation link at the mobile viewport.

### Failed attempts and recovery

- The first validation command used the bundled fallback pnpm even though this repository is npm-managed. pnpm began moving dependencies and left `.pnpm` resolution residue.
- The pnpm processes were stopped, the affected dependency directory was moved out of the repository, and `npm ci` rebuilt `node_modules` from `package-lock.json` before final checks.

### Deferred

- No public deployment or push was performed in this iteration. Publishing remains a separate external action.

## 2026-08-26 — Issue #2 security follow-up

### Feedback and evidence before changes

- Contributor `qiran6919-oss` reported that the safe-download CLI silently skipped execution on macOS/Linux, invalid invitations could exhaust the shared signup quota, and CI did not execute the security regression or dependency audit.
- Source inspection identified the cross-platform CLI mismatch: an absolute POSIX path was manually prefixed with `file:///`, producing a different URL than `import.meta.url`. The same path happened to work on Windows.
- The signup route called `enforceSignupRateLimit` before reading and validating the invitation.
- The downloader validated DNS with `lookup` but then used `fetch`, which independently resolved the hostname at connection time.
- `.github/workflows/ci.yml` ran lint, type checking, and build only.

### Changes

- Replaced manual CLI URL construction with `pathToFileURL` and added a spawned-process regression requiring unsafe input to fail visibly with status 1.
- Replaced the independently resolving `fetch` path with HTTP/HTTPS requests whose lookup callback returns the already validated address; redirects repeat validation and address binding.
- Expanded non-public address rejection to IPv4-mapped IPv6, carrier-grade NAT, documentation, benchmark, multicast, and other non-global ranges.
- Moved constant-time invitation validation before the valid-creation limiter and added quota-isolation regression coverage.
- Added `npm run security:check` and `npm audit --audit-level=moderate` to required CI.
- Prepared product `0.5.1` and backend/API `1.1.1`; frontend remains `1.0.1`.

### Verification

- `npm run security:check` passed CLI failure, signup quota isolation, mapped-address blocking, pinned-address use, authorization, schema, and private-target checks.
- `npm run typecheck` passed.
- Full local checks, real public download, Ubuntu PR CI, release publication, and Issue closure remain pending.

## 2026-08-26 — Founder-controlled PLM governance

### State before changes

- The repository was owned and administered only by `xmhuangzhijun-hue`, but `master` had no branch protection or ruleset.
- No external collaborators existed. Feedback contributor `qiran6919-oss` had opened two substantive security Issues.
- Issue, PR, CI, and Release automation existed, but there was no explicit decision-rights document, CODEOWNERS rule, milestone contract, or end-to-end product lifecycle.
- The active GitHub credential lacked Projects scope, so creating a GitHub Project would require an explicit account-permission change.

### Changes

- Added founder-only administration and decision-rights rules, least-privilege collaborator roles, access review, and continuity boundaries.
- Added CODEOWNERS coverage requiring `xmhuangzhijun-hue` review for every change and explicitly listing sensitive control-plane paths.
- Added an Issue-to-Release PLM lifecycle with priority, status, milestone, verification, release, and observation gates.
- Expanded contributor and Pull Request contracts with accepted-Issue, milestone, impact, evidence, security, and rollback requirements.

### Verification

- `git diff --check` passed and a governance term scan confirmed the founder, role, priority, status, milestone, CODEOWNER, and rollback rules are present in the intended files.
- `npm run governance:test` passed.
- `npm run check` passed lint (four pre-existing image optimization warnings, zero errors), type checking, and the production build.
- Commit `a4eeceb` is present on `origin/master`; GitHub CI run `32959988937` completed successfully.
- GitHub API confirmed `xmhuangzhijun-hue` remains the repository owner and sole accepted administrator; the pending `qiran6919-oss` invitation grants `write`, not `maintain` or `admin`.
- `master` now requires strict `quality` and `development-log` checks, one CODEOWNER approval, stale-review dismissal, last-push approval, resolved conversations, and linear history; force pushes and deletion are disabled. Repository administrators retain an explicit bootstrap/recovery bypass so the founder cannot be locked out.
- Nine lifecycle/priority/security labels and milestone `v0.5.1 - Security follow-up` were created. Issue #2 is open, P1, security-scoped, planned into that milestone, and has a public collaboration reply.

### Deferred

- GitHub Projects board creation remains blocked on explicit `read:project`/`project` authorization; no account permission will be expanded implicitly.

## 2026-08-26 — Open-source feedback workflow

### State before changes

- Bug and feature Issue forms and a basic PR template existed, but new feedback had no common triage status.
- Pull requests did not enforce the project's development-log policy.
- Version tags did not create GitHub Releases or grouped release notes.
- The installed GitHub CLI credential can manage repository content and workflows, but it does not have GitHub Projects scope.

### Changes

- Added an Issue workflow that creates and applies `status: needs triage` without posting automated public comments.
- Added a pull-request governance check requiring every iteration to update this development log, and requiring `CHANGELOG.md` when version metadata changes.
- Added generated release-note categories and an idempotent `v*` tag workflow that publishes overall GitHub Releases.
- Expanded the PR checklist and contribution guide with the feedback, security-reporting, logging, testing, and release paths.
- Added deterministic regression coverage for the governance rules.

### Verification

- `npm run governance:test` passed positive and negative cases for development-log and version-log enforcement.
- Python `yaml.safe_load` parsed all 10 GitHub YAML files.
- `git diff --check` passed.
- `npm run check` passed lint (four pre-existing image optimization warnings, zero errors), type checking, and the production build.
- Commit `43ed327` is present on `origin/master`; GitHub CI run `32938540864` completed successfully.
- GitHub API reads confirmed all three status labels, all four workflow files, and the public non-draft `v0.5.0` Release.

### Deferred

- A GitHub Projects board requires `read:project`/`project` authorization. No account permission was changed in this iteration.

## 2026-08-26 — Security feedback hardening

### Feedback and evidence before changes

- A contributor reported that `LOCAL_OWNER_ACCESS=true` trusted the request URL hostname and could bypass administrator and tenant authentication behind an exposed service or proxy.
- Reproduction against the running app: unauthenticated `GET /api/admin/tenants` returned HTTP 200 for loopback, a forged loopback Host, and a non-loopback Host while the option was enabled.
- The homepage response lacked CSP, `X-Content-Type-Options`, referrer, and frame-embedding protections.
- `npm audit` reported four moderate development-chain findings from the old esbuild nested under `drizzle-kit`; production dependencies reported zero.
- The clone Agent instructions downloaded arbitrary discovered assets without a shared SSRF, redirect, media-type, or size boundary.

### Changes

- Deleted hostname-based owner access and require normal admin or tenant Bearer credentials on every management request.
- Added signup invitation, in-process rate limiting, tenant quota, bounded JSON-body parsing, and bounded Zod fields/arrays.
- Added default security response headers and loopback-only Docker Compose port publishing.
- Added `scripts/safe-download.mjs` and synchronized its mandatory use across supported Agent skill formats.
- Overrode the vulnerable nested esbuild with the audited current package while retaining stable Drizzle ORM/Kit versions.
- Corrected `SECURITY.md`, API/backend docs, UI credential labels, environment examples, and version metadata.
- Added this development-log requirement to `AGENTS.md` and introduced `CHANGELOG.md`.

### Verification

- `npm run check` passed lint (four pre-existing image optimization warnings, zero errors), type checking, and the production build.
- `npm run security:check` passed forged-Host authentication, schema quota, signup invite/rate-limit, and private/non-HTTP download regression checks.
- Real HTTP checks returned 401 for both ordinary unauthenticated and forged-loopback-Host administrator requests, and 200 with the registered administrator credential.
- Authenticated PostgreSQL save/read/restore passed: a temporary page-title probe was saved and read, then the original value was restored and read again.
- Browser checks confirmed the existing homepage hero, article section and navigation remain visible; `/start` shows the required invite field and disables incomplete creation; `/admin` shows the platform-key input.
- Homepage responses contain CSP, `nosniff`, strict referrer, deny-frame, and restrictive permissions headers.
- `docker compose config` resolved both app and dev published ports with `host_ip: 127.0.0.1`.
- `npm run db:generate` found all six tables and reported no schema changes. A beta-upgrade attempt was rejected after it broke stable ORM compatibility; a clean `npm ci` restored the stable pair before final verification.
- `npm audit --audit-level=moderate` returned zero vulnerabilities after overriding only the vulnerable nested esbuild; `gitleaks detect --redact` found no secrets.

### Deferred or deployment-dependent

- In-process signup limiting is intentionally only a first boundary; multi-instance public deployments still require a shared gateway limit and abuse monitoring.
- Real database write verification is only complete after the authenticated save/read/restore check succeeds against local PostgreSQL.

## 2026-08-26 — Issue #2 security follow-up

### Feedback and evidence before changes

- Direct invocation of `scripts/safe-download.mjs` constructed its entry URL manually, so POSIX absolute paths could miss the CLI entry comparison and exit silently.
- Signup rate limiting ran before invitation verification; with untrusted proxy headers disabled, invalid invitations could exhaust the shared `global` creation bucket.
- DNS safety validation and the later network connection were separate resolutions, and IPv4-mapped IPv6 addresses were not normalized before policy checks.
- CI did not execute the repository security regression or moderate dependency audit.

### Changes

- Switched direct-entry detection to `pathToFileURL` and added a cross-platform spawned CLI regression.
- Bound invitation verification before signup quota consumption in one route-level guard.
- Replaced downloader `fetch` with HTTP(S) requests whose lookup callback is pinned to the validated address; every redirect is revalidated and repinned.
- Normalized IPv4-mapped IPv6 and rejected loopback, private, link-local, documentation, benchmark, multicast, and cloud-metadata address space.
- Added security regression and `npm audit --audit-level=moderate` to CI.
- Released backend/API contract version 1.1.1 without changing frontend version 1.0.1 or homepage content/layout.

### Verification

- `npm run security:check`, `npm run governance:test`, `npm run db:generate`, and `git diff --check` passed.
- `npm run check` passed lint (four pre-existing image optimization warnings, zero errors), type checking, and the production build.
- `npm audit --audit-level=moderate` returned zero vulnerabilities.
- A real public HTTPS image download completed through the pinned-address downloader (`image/png`, 1,600 bytes).
- Browser verification against `http://127.0.0.1:3001/?tenant=xmhua` confirmed the existing XMHUA hero, navigation, articles, projects, resources, about, social, and footer sections remain visible.
- The running public content API returned HTTP 200, `X-API-Version: 1.1.1`, tenant `xmhua`, and `meta.source: postgresql`.

### Remote release receipts

- Pull request #4 passed required `development-log` and `quality` checks and was squash-merged as `01409fa` using the documented founder recovery bypass because the founder cannot self-approve the required CODEOWNER review.
- Master CI run `32961620282` passed generated-file sync, lint, type checking, security regression, dependency audit, and production build.
- Tags `v0.5.1` and `backend-v1.1.1` point to the merge; the public non-draft v0.5.1 GitHub Release was published successfully.
- Issue #2 was closed by the merge, updated to `status: released`, and received a public response linking the fix, automated guards, verification receipts, and Release. Milestone `v0.5.1 - Security follow-up` was closed.

## 2026-08-31 — Product-detail portfolio walkthroughs

### Feedback and scope

- The first `/work` iteration named capabilities and technologies but did not let a recruiter understand what each product does or how a user operates it.
- Kept the existing blog route and public privacy boundary. Reworked only the portfolio case component and its route-scoped stylesheet.

### Changes

- Replaced five text-heavy capability cards with four concrete product walkthroughs: Hermes, Obsidian Personal OS, IAA 投放 OS, and XMHUA Card.
- Added, for every product, a named user, core task, owner role, four-step usage flow, shipped feature set, exception behavior, and result evidence.
- Added four CSS-rendered product interface models using real field names and flows: chat/tool receipt, Vault/automation receipt, advertising operations dashboard, and tenant content Studio.
- Labeled every product model as a privacy-safe interaction structure so it cannot be mistaken for a production screenshot.
- Rebuilt the hero and product index around the page's hiring purpose and added responsive layouts for the embedded product interfaces.

### Verification

- `npm run check` passed lint with four pre-existing homepage image warnings and zero errors, TypeScript checking, and the Next.js production build.
- Browser verification confirmed the new heading, four case studies, no console errors, and a 375 px viewport with no horizontal overflow.
- The local production preview returned the rebuilt static `/work` page at `http://127.0.0.1:3018/work`.

### Deferred

- This iteration updates the local public-facing site implementation only; no remote deployment was performed.
