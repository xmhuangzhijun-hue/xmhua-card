# Backend

The homepage is served through `GET /api/content`.

## Stack

- Next.js 16 Route Handlers
- PostgreSQL
- Drizzle ORM and Drizzle Kit
- Zod response validation

## Local development

Without `DATABASE_URL`, the server repository returns backend-owned seed content and the API reports `meta.source: "seed"`. The React client still reads everything through `/api/content`.

To use PostgreSQL:

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL`.
2. Run `npm run db:migrate`.
3. Run `npm run db:seed`.
4. Start the application with `npm run dev`.

When PostgreSQL is active, the API reports `meta.source: "postgresql"`. A configured but unseeded database returns HTTP 503 instead of silently falling back.
