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

### Production release

- Commit `7fa294a` was pushed to `origin/master`, built as a verified Linux x86_64 standalone artifact, and deployed as isolated release `/opt/xmhua-card/releases/20260901T1124Z-7fa294a`.
- Candidate-port checks passed before the `/opt/xmhua-card/current` symlink was switched and `xmhua-card.service` restarted.
- Public browser acceptance at `https://huangzhijun.online/notes` rendered the expected title and six rows; the homepage exposed the notes entry. The blog service, Nginx, and the adjacent Qinghe gateway remained active.
- The verified rollback target is the prior release `/opt/xmhua-card/releases/20260831T1940Z-d5fedfd`.

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

## 2026-09-01 — Personal-blog publishing workflow correction

### Feedback and first evidenced break

- The public article rows and homepage development records used `href: "#"`, so they were intentionally rendered as static display content and could not open a note.
- Articles had no slug or body in the schema or database, and the Studio exposed only title, category, excerpt, and a raw link. It therefore could not create, preview, draft, or publish a real blog post.
- Seeded social entries used placeholder handles and `#` links. They looked configured but could not reach the corresponding account.

### Changes

- Added article slugs, long-form bodies, and draft/published state to the validated content contract and PostgreSQL schema, with a safe migration for existing rows.
- Added `/notes/[slug]` article pages and connected both the homepage development-record rows and the public notes catalog to those pages.
- Rebuilt the Studio article editor around new draft, title, category, URL slug, date, excerpt, body, preview, and publish controls.
- Clarified social-account configuration in Studio and hid unconfigured placeholder links from the public site. Connected the confirmed GitHub account to its real public profile.
- Added six short initial note bodies derived from the existing public summaries so every current public note has readable content without inventing new project outcome claims.

### Verification

- `npm run typecheck`, `npm run lint`, and `npm run build` passed; the production build includes dynamic route `/notes/[slug]`.

### Deployment-dependent verification

- Production PostgreSQL was installed on the existing ECS host and bound to the dedicated `xmhua-card` operating-system/database role. The application now reports `meta.source: postgresql` instead of `seed`.
- Release `/opt/xmhua-card/releases/20260901T1300Z-5bed1ca` is active; the previous release remains available as the rollback target.
- Authenticated Studio GET, same-document PUT, and GET-after-write returned 200/200/200 with `saved: true`; unauthenticated Studio API access returned 401.
- The public article URL returned 200 through Nginx and contained its persisted body. The public Studio route returned 200.
- The confirmed GitHub profile is configured. Other placeholder social accounts remain hidden until their real profile or official add-contact links are saved in Studio.

## 2026-09-01 — 前后端分离与真实内容后台

### 反馈与改前证据

站点主人的判断是「有形无神，不是可用可对外展示的个人博客」，具体三条：笔记打不开、没有能自己编辑内容的后台、社交链接点了不跳转。改动前用生产接口核对：

- `GET /api/content` 返回 `meta.source: postgresql`，六篇笔记 `body` 长度 121–160 字符，即每篇只有一段占位文字。
- 九个社交账号中八个 `href` 为 `#`，三个项目 `href` 全部为 `#`，四张能力卡片 `href` 全部为 `#`。
- 首页共 13 个 `href="#"` 的死链（项目按钮、能力卡片、Email、隐私政策、服务条款、语言切换、站点标志）。
- `/admin` 存在但界面是一个装载整站 JSON 的 `textarea`，且首页没有入口；`/start` 多租户注册入口挂在个人博客首页主导航上。
- 首页与笔记页都是客户端挂载后再 `fetch`，服务端返回空壳，博客内容不可被抓取。

### 变更范围

后端拆成 `api/` 下的独立服务；前端移除全部数据访问；新增可视化内容后台。多租户能力按站点主人的决定保留在后端，只从公开站点移除入口。

### 变更

- 新增 `api/`：Hono + Drizzle + PostgreSQL 的独立服务，含公开只读接口、账号密码登录、管理增删改接口、多租户开通接口，自带类型检查、安全回归与构建。
- 前端删除 `src/app/api`、`src/db`、`src/server`、`drizzle/` 与 drizzle/postgres 依赖，改为通过 HTTP 读取后端；服务端渲染走内网地址，浏览器走同源 `/api`。
- 迁移 `0004` 新增 `pages`、`admin_users`、`admin_sessions` 三张表，全部是 `CREATE TABLE`，不改动既有表。
- 首页、笔记列表、笔记正文、独立页面改为服务端渲染 + ISR，笔记与独立页面在构建期静态预渲染。
- 新增 `/admin` 后台：账号密码登录、笔记 / 项目 / 社交账号 / 能力卡片 / 独立页面的增删改与排序、站点设置可视化编辑、修改密码；首页列出未完成项。
- 笔记与页面正文改用 Markdown，编辑器带实时预览；渲染器先整体转义再套用格式规则，不引入解析器依赖。
- 地址为空或 `#` 的社交账号在接口层被过滤；项目、能力卡片、页脚 Email、公告链接在前端不渲染成链接。
- 移除公开站点上的 `/start`、`/studio` 入口和重复导航项；新增 `/privacy`、`/terms`、`/cookies` 三个可后台编辑的页面。
- 主题偏好改用外部 store 加文档头内联脚本，消除首屏闪烁与挂载后的级联渲染。
- CI 拆成前端与后端两套安装、类型检查、安全回归与依赖审计；前端构建通过一个读取种子数据的桩服务完成，不需要数据库。
- 升级 `drizzle-orm` 到 0.45.2，修复其 SQL 标识符转义的高危告警。

### 验证

- 后端：`npm run typecheck --prefix api` 与 `npm run security:check --prefix api` 通过；`npm audit --audit-level=moderate --prefix api` 零漏洞。
- 前端：`npx eslint` 零错误零警告，`npx tsc --noEmit` 通过，`next build` 生成 16 个页面，其中 6 篇笔记与 3 个独立页面为静态预渲染。
- 接口：健康检查、内容、笔记详情、页面详情均 200；未登录访问管理接口返回 401；错误密码返回 401；重复 slug 返回 409；非法 slug 与非法日期返回 400；12 个并发请求全部 200。
- 浏览器实测（生产模式，`next start`）：用真实账号登录 `/admin`，在「社交账号」里给 X 填入主页地址并保存，后台待办从 8 条降到 7 条，公开首页在 20 秒内出现该链接，全程没有改代码、没有重新构建。
- 首页链接审计：改动前 13 个 `href="#"`，改动后 0 个。
- 笔记正文页渲染出标题、分类、日期、阅读时长、正文段落与上一篇 / 下一篇导航；`/privacy` 渲染出五个 Markdown 小标题。
- Markdown 渲染器对 `<img src=x onerror=...>` 全部转义，`javascript:` 链接不生成 `<a>`。
- 响应式：首页、笔记列表、笔记正文、后台在 375px 视口下均无横向溢出；1280px 同样无溢出。

### 未完成

- 尚未部署。生产发布、数据库迁移与 Nginx 路由调整见 `docs/DEPLOYMENT.md`，需要站点主人确认后执行。
- 六篇笔记的正文仍是每篇三段的占位内容。后台已经具备写作能力，但内容本身要由站点主人补。
- 项目卡片与能力卡片的链接仍为空，公开页面因此不渲染这些按钮；需要站点主人在后台补齐。
