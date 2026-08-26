# Issue #2 security follow-up report

## Scope

GitHub Issue #2 covers four related security and verification gaps introduced or left unguarded in v0.5.0:

1. cross-platform safe-download CLI entry detection;
2. invalid-invitation exhaustion of the shared creation quota;
3. missing CI execution of security regression and dependency audit;
4. DNS validation not bound to the actual network connection, including mapped-address normalization.

The change must not modify tenant data, credentials, homepage content, or homepage layout.

## Reproduction and root cause

- POSIX absolute paths begin with `/`; manually prefixing them with `file:///` produces a four-slash URL and misses the direct-entry comparison. `pathToFileURL` is the platform-defined conversion.
- `POST /api/signup` consumed a rate-limit slot before body validation and constant-time invite comparison. With untrusted proxy headers disabled, every request shared the `global` bucket.
- DNS validation and `fetch` were separate operations. A hostname could resolve differently between the validation lookup and the connection lookup.
- CI did not call the repository's existing security script or `npm audit`.

## Acceptance contract

- Unsafe CLI input exits nonzero and writes a reason to stderr on supported operating systems.
- Ten invalid invitations do not consume the first valid creation slot when the configured creation limit is one.
- Every request and redirect connects through a lookup callback pinned to an address returned by the corresponding validated DNS result.
- IPv4-mapped loopback and metadata addresses are rejected.
- Local and Ubuntu CI execute security regression and the moderate dependency audit.
- The homepage build and visual baseline remain unchanged; no database write is needed for this change.

## Verification receipts

- `npm run security:check` passed the signup-ordering, address normalization, DNS-to-socket binding, redirect, size/type, authentication, and direct CLI regression cases.
- `npm run check` passed lint (four pre-existing image optimization warnings, zero errors), type checking, and the production build.
- `npm run governance:test`, `npm run db:generate`, and `git diff --check` passed; Drizzle found all six tables and no schema changes.
- `npm audit --audit-level=moderate` returned zero vulnerabilities.
- A real public HTTPS image download completed through the pinned-address downloader (`image/png`, 1,600 bytes).
- The running homepage at `http://127.0.0.1:3001/?tenant=xmhua` retained the XMHUA hero, navigation, article, project, resource, about, social, and footer sections.
- The running `GET /api/content?tenant=xmhua` returned HTTP 200, `X-API-Version: 1.1.1`, tenant `xmhua`, and `meta.source: postgresql`.

- Pull request #4 passed required `development-log` and `quality` checks and was squash-merged as `01409fa` using the documented founder recovery bypass because the founder cannot self-approve the required CODEOWNER review.
- Master CI run `32961620282` passed generated-file sync, lint, type checking, security regression, dependency audit, and production build.
- Tags `v0.5.1` and `backend-v1.1.1` point to the merge; the public non-draft v0.5.1 GitHub Release was published successfully.
- Issue #2 was closed by the merge, updated to `status: released`, and received a public response linking the fix, automated guards, verification receipts, and Release. Milestone `v0.5.1 - Security follow-up` was closed.
