# Development log

This file is the durable engineering trail for each iteration. User-facing release summaries belong in [`CHANGELOG.md`](../CHANGELOG.md).

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
- GitHub push and live workflow receipts remain pending until the commit is published.

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
