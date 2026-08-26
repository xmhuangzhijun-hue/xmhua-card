# Contributing

Thanks for your interest in improving **xmhua-card**. This repository combines an API-driven personal site, multi-tenant content management, and the original website-cloning workflow.

> **Note:** Keep pull requests focused. Public security details do not belong in Issues; use the repository's [private vulnerability report](https://github.com/xmhuangzhijun-hue/xmhua-card/security/advisories/new).

## Ways to contribute

- **Improve the public site** while preserving its existing visual baseline
- **Improve the API and tenant administration** with explicit authentication and validation boundaries
- **Improve the `/clone-website` skill** and supported coding-agent integrations
- **Fix bugs, security boundaries, tests, or documentation**

Browse the [open issues](https://github.com/xmhuangzhijun-hue/xmhua-card/issues) for something to pick up. New Issues are automatically marked `status: needs triage`; a maintainer then confirms scope and priority. For substantial or potentially breaking changes, open an Issue before significant work begins.

## Development setup

**Prerequisites:** [Node.js](https://nodejs.org/) 24+.

```bash
git clone https://github.com/YOUR-USERNAME/xmhua-card.git
cd xmhua-card
npm ci
```

Before opening a PR, make sure the project is green:

```bash
npm run check   # lint + typecheck + build
npm run governance:test
```

## Source-of-truth files & the sync scripts

This is the most important thing to know. Two source files generate the platform-specific project instructions and `/clone-website` skill copies. Edit the source files rather than their generated copies.

| What                   | Edit this (source of truth)             | Then run                           |
| ---------------------- | --------------------------------------- | ---------------------------------- |
| Project instructions   | `AGENTS.md`                             | `bash scripts/sync-agent-rules.sh` |
| `/clone-website` skill | `.claude/skills/clone-website/SKILL.md` | `node scripts/sync-skills.mjs`     |

After editing a source file, run the matching sync command and commit the regenerated files along with your change. CI verifies that the generated files are in sync — if you forget to regenerate, CI will fail with a reminder.

## Submitting a pull request

1. **Fork** the repo and create a branch off `master` (e.g. `fix/skill-hover-extraction` or `docs/clarify-setup`).
2. Make your change. If you touched a source-of-truth file, **run the relevant sync script** (see above).
3. Add an entry to `docs/DEVELOPMENT_LOG.md` describing the evidence before the change, what changed, and its verification. Update `CHANGELOG.md` whenever version metadata changes.
4. Run `npm run check` and `npm run governance:test`.
5. Write a clear commit message that describes the change. Prefixes such as `fix:`, `feat:`, or `docs:` are welcome but not required.
6. Open a PR against `master`, fill out the PR template, and link a relevant issue when one exists (for example, `Closes #123`).
7. Keep PRs focused — one logical change per PR is much easier to review and merge.

GitHub Actions enforce the development-log rule on pull requests. Pushing an overall version tag such as `v0.6.0` creates a GitHub Release with generated notes grouped by Issue and PR labels. Component tags such as `backend-v1.2.0` remain independent and do not publish an overall Release.

## Questions

Open a [GitHub Issue](https://github.com/xmhuangzhijun-hue/xmhua-card/issues) for public questions and proposals.
