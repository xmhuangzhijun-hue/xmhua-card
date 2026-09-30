# Video publishing verification

Implementation based on master f1e46b3. Upstream social-auto-upload pinned at 0012d2c355f88f683cc38dde2a2db209e14091bc, with Python 3.12 and isolated playwright 1.58.0. Existing Chrome runtime launches successfully. No upstream source modifications.

## Verified

- API check: TypeScript, existing security regression and production compilation.
- Publishing regression: unauthorized access, tenant isolation, private streamed upload validation, account gating, idempotent multi-platform jobs, serialized claim, receipt ownership, recovery isolation, revocation and no automatic replay.
- Frontend ESLint, TypeScript, production build (69 generated pages).
- Candidate frontend/API start, authenticated publishing schema query and anonymous rejection. Retained old frontend/API start against additive database migration.
- Production native admin tab, local worker online heartbeat, browser-triggered five-account check and five terminal receipts. All accounts currently unauthenticated; no fictitious success.
- Existing overview still shows 56 public notes / 117 total, 7 projects, 10 social entries, 4 pages. Homepage, notes, work, about and sitemap return HTTP 200.
- Desktop 1440px and mobile 390px layouts; mobile document scrollWidth equals viewport width. Account checks do not publish any content.
- A generated 1-second, 2,295-byte MP4 was selected in the production browser UI. Upload completed without errors; authenticated worker download matched every byte and anonymous download returned 401. The exact QA asset and database row were subsequently removed. No publish job was created.

Web archive SHA-256: `70804d1bb5eb1786ff42d746d9fb04ab40944d6a2dc9c51aec71d3fa5220ed98`.
API code archive SHA-256: `5e614f1f8f651824e8446dc02201b2237e267630c7b4c1e3c98375faab25541e`.

## Limits and rollback

Actual platform authentication, video upload/publication and moderation outcomes require the owner's accounts and chosen video. Upstream browser automation can break when platform pages change. A successful CLI return means submitted, not verified public. No automatic retry after uncertain publication.

Only three new tables were migrated; existing content tables remain compatible with the retained frontend/API releases. Roll back by restoring each service's previous release link and the backed-up Nginx configuration, then restart and verify. Keep the old API dependency release while the new release links its unchanged dependencies. Stop or revoke the local worker before rollback. Queued publication must be reviewed explicitly on forward recovery.

Video upload reserves 256 MiB free disk. The 512 MiB per-file limit is additionally bounded by actual free storage. No filesystem capacity or service permissions were expanded. Platform credentials and private runtime paths are excluded from this public receipt.
