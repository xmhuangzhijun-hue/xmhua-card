# Whole-site observatory redesign

Scope: public home, notes, reading, work, about, shared navigation/footer. CMS data, backend and admin remain outside this change.

Reference: public React Bits adaptations (retained license) and AgentOS portfolio interaction-source analysis. Original knowledge scene uses native SVG/Canvas/CSS, no third-party model or copied personal assets.

Validation in progress: Linux production build and targeted TypeScript/lint pass. Real browser checked desktop home, 390px mobile home and reading, notes search (Harness -> 8 results), focus mode and font size (19px), project covers, about and work layout. Browser acceptance found and fixed paused reveal invisibility, shrinking covers, inherited TOC order and project description pointer-events; final verification pending.

Known check boundary: full lint has existing set-state-in-effect findings in notes-library and reading-progress. No claim of a passing full lint suite.

Rollback: 20260911T1440Z-reactbits. Deployment receipt pending.

## Deployment receipt (2026-09-12T01:47:00+08:00)

- Live release: 20260911T1735Z-observatory.
- Complete artifact SHA256: 51cc97c255e881c8d37b3bdab93f61f3dceefac346c1ee400f1335fb6b9e711f.
- Old-release restart probe and candidate probe passed before atomic switch; frontend/API/nginx/gateway remain active.
- Final build: 81 static generation tasks passed. Public sitemap: all 75 URLs reachable with correct canonical; admin noindex retained.
- Browser: 390px home/notes/reading without document horizontal overflow; desktop project covers, reading and about layouts checked. Notes search Harness yielded 8 results. Reading focus and 19px font verified. Final project expansion data-expanded=true, case details open, inner-page product navigation returns /#products. Pause no longer hides product content.
- Public path after fresh reload: notes -> work (5 case details) -> /#products -> description expanded=true.
- A browser tab that had visited the previous release encountered a module error on its first post-deploy client navigation; full reload resolved it, and subsequent cross-page navigation passed. Existing old tabs may need refresh. This is not recorded as a never-failed rollout.
- One read-only SEO invocation omitted its required base argument and failed before doing checks; corrected invocation passed.
