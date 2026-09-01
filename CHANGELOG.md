# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 未发布

### 新增

- 社交条目支持二维码类型，微信等没有可跳转主页的平台可以在后台上传二维码，访客点击后弹出扫码窗口。
- 后台支持图片上传（PNG / JPG / WebP，按文件头校验，拒绝 SVG），图片经 `/api/media/` 提供。
- 笔记新增可选的「原文链接」，显示在正文上方。

### 修复

- 「链接地址」改名为「网址后缀」，显示最终公开地址、内联提示规则，并能把误粘贴的完整网址一键转成合法后缀。
- 表单校验失败时按中文字段名提示，不再只显示英文字段。

## [Unreleased]

### Added

- Split the backend into a standalone `api/` service (Hono + Drizzle + PostgreSQL) with its own build, type check, security regression and dependency audit.
- Added a real content console at `/admin`: username and password sign-in, full create/edit/delete/reorder for notes, products, social accounts, capability cards and standalone pages, a visual site-settings editor, and password change.
- Added a console dashboard that lists unfinished work: notes with a stub body, and products, social accounts and capability cards whose link is still a placeholder.
- Added Markdown bodies for notes and pages, with a live preview in the editor and a dependency-free renderer that escapes all input before formatting.
- Added editable `/privacy`, `/terms` and `/cookies` pages backed by a new `pages` table.
- Added previous/next navigation and reading time to note detail pages.
- Added `admin_users` and `admin_sessions` tables: scrypt password hashes, SHA-256 session tokens, HttpOnly cookies, and session revocation on password change.

### Changed

- The frontend no longer holds a database driver, API routes or credentials; it reads everything from the content API over HTTP.
- Home, notes index, note detail and standalone pages are server-rendered with ISR instead of fetching after mount, so the blog is indexable.
- Links that were never filled in are dropped instead of rendering as dead links: unbound social accounts are filtered by the API, and placeholder products, capability cards, email and announcement links are not rendered as anchors.
- Removed the multi-tenant signup and studio entries from the public site. The endpoints stay in the API behind `SELF_SERVICE_SIGNUP_ENABLED`.
- Theme preference moved to an external store plus an inline bootstrap script, removing the first-paint flash and the cascading render on mount.
- CI now installs, checks, audits and builds both packages, and builds the frontend against a seed-backed stub so it needs no database.

### Fixed

- Removed 13 dead `href="#"` links from the homepage.
- Upgraded `drizzle-orm` to 0.45.2, clearing the high-severity SQL identifier escaping advisory.

## [0.5.1 后续] - 未发布的既有条目

### Added

- Added real article detail pages and a Studio publishing workflow with drafts, editable long-form bodies, previews, stable slugs, and publish controls.
- Added a public `/notes` library with numbered entries, category filtering, title/summary search, dark mode, and responsive mobile behavior.
- Added a direct notes entry to the homepage navigation while continuing to use the existing tenant-aware article content source.
- Added a public `/work` portfolio route covering Hermes Agent engineering, Obsidian automation, AI coding collaboration, advertising data products, and the XMHUA Card platform.
- Added a direct portfolio entry to the existing homepage navigation.
- Added an isolated, fixed-seed IAA operations demo at `/demo/iaa/` with public demo credentials and no production connection.

### Changed

- Unconfigured social placeholders are hidden; configured accounts now use their saved public profile or official add-contact link.
- Rebuilt `/work` as four product walkthroughs with concrete users, tasks, interaction flows, feature details, exception handling, evidence, and clearly labeled privacy-safe interface models.
- Reframed `/work` as a 60-second AI capability review spanning input research, cross-Agent memory, a production Hermes instance, open-source fixes, and an interactive business product; removed every dependency on the separate portfolio repository.

## [0.5.1] - 2026-08-26

### Added

- GitHub Issue triage status automation, pull-request development-log governance, and generated Release notes for overall `v*` tags.
- Regression checks for the repository governance rules.
- Founder-controlled repository governance, CODEOWNERS enforcement, and a documented Issue-to-Release PLM lifecycle.

### Changed

- Contribution and pull-request guidance now documents the feedback, private security-reporting, development-log, and release workflow.
- Collaborator roles now follow least privilege; the founder remains the sole administrator and required reviewer.
- Backend version is `1.1.1`; frontend remains `1.0.1`; API response header is `X-API-Version: 1.1.1`.

### Fixed

- Made the safe-download CLI execute and report failures consistently on Windows, macOS, and Linux.
- Bound each HTTP/HTTPS asset request to the DNS address that passed public-address validation, including every redirect hop, and blocked IPv4-mapped private IPv6 targets.
- Validated signup invitations before consuming the valid site-creation rate-limit quota.

### Security

- Added the security regression suite and moderate dependency audit to required CI.

## [0.5.0] - 2026-08-26

### Security

- Removed hostname-based `LOCAL_OWNER_ACCESS`; admin and tenant management now always require a valid Bearer credential.
- Added invite-gated self-service signup, bounded in-process rate limiting, tenant-count quotas, request-body limits, and content field/array limits.
- Added CSP, clickjacking protection, MIME sniffing protection, a strict referrer policy, and a restrictive permissions policy.
- Bound Docker Compose examples to `127.0.0.1` by default.
- Added an SSRF-resistant asset download helper and required clone workflows to treat target pages as untrusted data.
- Updated the Drizzle development toolchain so `npm audit` reports zero known vulnerabilities while preserving existing schema generation.
- Corrected private vulnerability reporting to this repository's GitHub Security Advisory page.

### Changed

- Backend version is `1.1.0`, frontend version is `1.0.1`, and API response header is `X-API-Version: 1.1.0`.
- The no-code site creation form now requires an invite code.

### Documentation

- Documented authentication, signup controls, payload limits, loopback-only Docker defaults, and the current API error contract.

## [0.4.0] - 2026-08-10

### Added
- Docker workflows for local development and multi-stage production builds
- Kiro support through a generated workspace `/clone-website` skill
- Complete generated workspace skills for Cline and Roo Code, including a Roo slash-command bridge
- Simplified Chinese and Japanese READMEs with the same onboarding and workflow guidance as the English documentation
- Contributor and security policies, including a private vulnerability-reporting path
- CI enforcement that generated agent rules and skills remain synchronized with their source files
- Compact pipeline diagrams and a static Star History chart in every README

### Changed
- Raised the project Node.js baseline to 24 across local development, CI, Docker, and contributor-facing documentation
- Refreshed Next.js to 16.3, React to 19.2.4, and related dependencies
- Updated `/clone-website` so later runs preserve existing pages and isolate routes, research, components, assets, and downloaders for each target
- Improved multi-origin and query/fragment planning with collision-resistant output namespaces and explicit route verification
- Redesigned README onboarding around the template workflow, Opus 5 recommendation, supported platforms, and community links
- Hardened the rule and skill generators for current platform schemas and deterministic output

### Fixed
- Gemini CLI command validation by adding the required name and flattening the prompt schema
- Cline and Roo Code invocation, frontmatter, and argument handling
- Next.js documentation resolution in generated agent rules
- Vulnerable framework dependencies and generated-file consistency checks

### Removed
- Aider from the officially supported-platform list because its current capabilities cannot run the complete browser and subagent workflow reliably; `.aider.conf.yml` remains available for loading general project context

### Security
- Documented responsible vulnerability disclosure through GitHub private vulnerability reporting
- Updated vulnerable dependencies to patched releases

## [0.3.1] - 2026-03-29

### Fixed
- `sync-agent-rules.sh` failing to resolve `@file` imports on Windows due to CRLF line endings — platform instruction files now correctly inline the Inspection Guide content

## [0.3.0] - 2026-03-29

### Added
- Multi-URL support for `/clone-website` — clone multiple sites in a single command with parallel processing and isolated output
- CI quality gates via GitHub Actions — automated lint, typecheck, and build on every push and PR
- `npm run typecheck` and `npm run check` scripts for local quality validation
- `.gitattributes` for cross-platform line ending normalization
- `.nvmrc` to pin Node.js 20 for contributor consistency

### Changed
- Streamlined PR template — removed redundant checklist items and screenshots section
- Improved project description and README — clearer use cases, limitations, and modern wording
- Refined documentation and agent rules across all platforms for clarity and consistency
- Fixed CRLF handling in `sync-skills.mjs` for reliable Windows operation

### Removed
- Outdated use case from README documentation

## [0.2.0] - 2026-03-28

### Added
- Multi-platform AI agent support: Claude Code, Codex CLI, OpenCode, GitHub Copilot, Cursor, Windsurf, Gemini CLI, Cline/Roo Code, Continue, Amazon Q, Augment Code, Aider
- Platform-specific instruction files and `/clone-website` skill for each supported agent
- `scripts/sync-agent-rules.sh` to regenerate platform instruction files from AGENTS.md
- `scripts/sync-skills.mjs` to regenerate `/clone-website` skill across all platforms
- GEMINI.md for Gemini CLI configuration
- Supported Platforms table in README
- "Updating for Other Platforms" documentation section in README

### Changed
- README now describes the project as multi-agent (Claude Code recommended, not required)
- AGENTS.md updated with sync script reminders

## [0.1.1] - 2026-03-28

### Added
- Bug report and feature request issue templates
- Pull request template with checklist
- CHANGELOG.md following Keep a Changelog format
- Package.json metadata (description, repository, homepage, keywords, engines)

### Fixed
- LICENSE copyright holder now attributed to JCodesMore

## [0.1.0] - 2026-03-28

### Added
- Initial template scaffold for website reverse-engineering with Claude Code
- `/clone-website` skill for full-site cloning pipeline
- `/build-from-spec` and `/customize` skills
- Parallel builder agents with git worktree isolation
- Chrome MCP integration for design token extraction
- Comprehensive inspection guide and project structure documentation
- Next.js 16 + shadcn/ui + Tailwind CSS v4 base scaffold
- MIT license
- README with badges, demo section, quick start, and star history

[Unreleased]: https://github.com/xmhuangzhijun-hue/xmhua-card/compare/v0.5.1...HEAD
[0.5.1]: https://github.com/xmhuangzhijun-hue/xmhua-card/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/xmhuangzhijun-hue/xmhua-card/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/JCodesMore/ai-website-cloner-template/releases/tag/v0.1.0
