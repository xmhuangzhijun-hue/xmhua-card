# Development log

This file is the durable engineering trail for each iteration. User-facing release summaries belong in [`CHANGELOG.md`](../CHANGELOG.md).

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
