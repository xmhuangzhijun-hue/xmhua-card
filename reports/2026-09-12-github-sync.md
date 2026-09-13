# GitHub automatic project status

CHG-20260912-007. Scope: public GitHub facts, hourly API scheduler, persisted tenant snapshots and homepage panels. Editorial descriptions remain CMS-owned.

Validation before release: API typecheck/build/security checks, frontend targeted lint, Linux production build (81 static tasks), deterministic Octokit regression (failure retention, incomplete search, explicit adopted PRs), PGlite reopen/published filtering/tenant isolation passed. Initial storage test used multiple statements in a prepared query and failed in test setup; separated statements, rerun passed. Production backend dist comparison found only the intended index/public-route changes.

Candidate API and frontend: 20260912T0620Z-github-sync. Rollback frontend: 20260911T1845Z-glass; API: 20260909T132721Z-b466c54. Deployment and real-browser checks pending.

Known baseline: full GitHub CI 34676263151 failed on two existing set-state-in-effect lint errors in notes-library and reading-progress. This change's targeted lint passes; no full-CI success claim.
## Release acceptance

- API release 20260912T0620Z-github-sync; final frontend 20260912T0935Z-github-sync. Old API/frontend restart probes passed before switches; all four services active.
- Initial upstream sync: five projects, zero failures, timestamp 2026-09-12T09:29:46.068Z; persisted snapshot survived API startup. Public endpoint readback matches; unauthenticated admin returns 401 and unknown tenant returns 404.
- First browser acceptance exposed inherited pointer-events:none on the new panel. Scoped specificity was corrected, frontend rebuilt and released; desktop and 390px mobile contribution expansion now open=true, pointer-events:auto and no horizontal overflow.
- Hermes original #97572 remains closed with explicit adopted-via #101570; three open, one other closed. pnpm two merged. CMS products 8 and 11 were backed up before removing fixed counts; authenticated save/readback and public content verified.
- Hourly scheduler is installed in the existing API process; the first run and restart retention are verified. A full next hourly interval has not been observed in this session. Failure retention and tenant isolation were verified by regression tests.

