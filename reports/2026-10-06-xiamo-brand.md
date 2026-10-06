# Public display name: 夏末

The owner selected 夏末 as the public creator name. Replace the previous display name in route metadata, admin entry points and the fallback XM mark. Keep domain names, repository addresses, account IDs and content URLs stable.

CMS-managed homepage, author, footer and about-page text and the uploaded header logo were updated separately and read back from the live site. This source change does not migrate or overwrite CMS data.

## Validation

- ESLint, TypeScript and governance regression checks passed.
- Production webpack build completed; 69 static pages generated against the live public content API.
- Local dependency caveat: the existing shared runtime reports Next.js 16.3.0, while the repository pins 16.3.5. No dependency installation or lockfile change was made. CI with locked dependencies remains required.
- Source diff is limited to public display text, SVG paths, and documentation.

## Release and rollback

This patch is based on the protected master branch. The production deployment contains additional video-publishing and game work; do not deploy this checkout over production. Integrate the reviewed patch into the current release while retaining those features. CODEOWNER approval and required CI apply before merge/release.

Revert the source commit to undo metadata/admin/fallback-logo changes. Restore the separately captured settings/about data to undo the CMS changes. Neither operation requires changing public URLs.
