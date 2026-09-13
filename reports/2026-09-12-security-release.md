# Security dependency validation — 2026-09-12

- Scope: Next.js / eslint-config-next 16.3.0 → 16.3.5 and compatible transitive dependency patches. No forced major upgrade; API manifest and lockfile unchanged.
- Installation: fresh isolated Linux directory, Node 24.20.0; no changes to shared checkout dependencies.
- Passed: frontend lint/typecheck/security regression; API typecheck/security/build; GitHub failure retention, adoption, completeness and persistent tenant/published-only regressions.
- npm audit: frontend 0, API 0 vulnerabilities at verification time. This is a dependency advisory check, not a claim that all application vulnerabilities are excluded.
- Live hourly snapshot confirmed: five projects, zero failures, second scheduled sync at 2026-09-12T10:29:58.102Z.
- Production build, browser verification, required CI and release receipts follow after completion.

The initial webpack build passed (81 generated pages). Browser classification 6 → tag intersection 2 → clear 68 and readable article body passed. CI 34689842204 independently passed audits/tests but caught invalid Waves CSS under Turbopack. The fix restores the existing mouse coordinate custom properties, with fallback positions; verification is being repeated with the default bundler.
