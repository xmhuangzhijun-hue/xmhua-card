<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Website Reverse-Engineer Template

## What This Is
A reusable template for reverse-engineering any website into a clean, modern Next.js codebase using AI coding agents. The Next.js + shadcn/ui + Tailwind v4 base is pre-scaffolded — just run `/clone-website <url1> [<url2> ...]`.

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **UI:** shadcn/ui (Radix primitives, Tailwind CSS v4, `cn()` utility)
- **Icons:** Lucide React (default — will be replaced/supplemented by extracted SVGs)
- **Styling:** Tailwind CSS v4 with oklch design tokens
- **Deployment:** systemd services behind Nginx; see `docs/DEPLOYMENT.md`

## Commands
- `npm run dev` — Start the frontend dev server
- `npm run check` — Frontend lint + typecheck + build
- `npm run check --prefix api` — API typecheck + security regression + build
- `npm run db:migrate --prefix api` — Apply database migrations
- `npm run admin:create --prefix api` — Create or reset a console account

The frontend build renders from the API, so `API_INTERNAL_BASE_URL` must point at
a running API (or the CI stub) before `npm run build`.

## Code Style
- TypeScript strict mode, no `any`
- Named exports, PascalCase components, camelCase utils
- Tailwind utility classes, no inline styles
- 2-space indentation
- Responsive: mobile-first

## Design Principles
- **Pixel-perfect emulation** — match the target's spacing, colors, typography exactly
- **No personal aesthetic changes during emulation phase** — match 1:1 first, customize later
- **Real content** — use actual text and assets from the target site, not placeholders
- **Beauty-first** — every pixel matters

## Project Structure

This repository holds two independently built and deployed services.

```
api/                  Standalone content API (Hono + Drizzle + PostgreSQL)
  src/
    routes/           HTTP routing only
    services/         Business logic; never touches HTTP
    lib/              Schemas, password, session, HTTP helpers
    db/               Drizzle schema, connection, migration entry
    scripts/          Admin account creation, security regression
  drizzle/            Migrations
src/                  Next.js frontend. No database driver, no API routes.
  app/                Routes; /admin is the content console
  components/
    site/             Public site chrome and homepage
    admin/            Content console
  lib/                API client, content types, Markdown renderer
public/               Static assets
docs/                 API, backend, deployment, development log
```

The frontend reads everything over HTTP from the API. Do not reintroduce a
database driver, credential or write endpoint into `src/`.

## MOST IMPORTANT NOTES
- Every persistent product iteration must update `docs/DEVELOPMENT_LOG.md`; every released version must also update `CHANGELOG.md`. Record the source feedback, exact scope, verification evidence, and any unverified or deferred work. Never describe a change as complete without matching verification.
- When launching Claude Code agent teams, ALWAYS have each teammate work in their own worktree branch and merge everyone's work at the end, resolving any merge conflicts smartly since you are basically serving the orchestrator role and have full context to our goals, work given, work achieved, and desired outcomes.
- After editing `AGENTS.md`, run `bash scripts/sync-agent-rules.sh` to regenerate platform-specific instruction files.
- After editing `.claude/skills/clone-website/SKILL.md`, run `node scripts/sync-skills.mjs` to regenerate the skill for all platforms.

@docs/research/INSPECTION_GUIDE.md
