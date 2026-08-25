# Backend

The homepage is served through `GET /api/content`. Use `GET /api/content?tenant=<slug>` for another tenant. The default is controlled by `DEFAULT_TENANT_SLUG`.

## Stack

- Next.js 16 Route Handlers
- PostgreSQL
- Drizzle ORM and Drizzle Kit
- Zod response validation
- Bearer-key protected administration routes

## Multi-tenant administration

Every content row belongs to a record in `tenants`; tenant deletion cascades only to that tenant's content. The public API, management reads, and management writes always resolve a tenant before querying content.

Set `ADMIN_API_KEY` to a long random value, then open `/admin`. The key is sent as an `Authorization: Bearer` header and kept in browser `sessionStorage`, so closing the tab session clears it. It is never stored in the content database.

Management endpoints:

- `GET /api/admin/tenants` — list tenants
- `POST /api/admin/tenants` — create a tenant, optionally with initial content
- `GET /api/admin/content?tenant=<slug>` — load one tenant's content
- `PUT /api/admin/content?tenant=<slug>` — validate and replace one tenant's content in a transaction

Writes fail closed: without `ADMIN_API_KEY` or `DATABASE_URL`, no management write is accepted. A full-content save replaces only the selected tenant's articles, products, directory links and social links inside one PostgreSQL transaction.

## Local development

Without `DATABASE_URL`, the server repository returns backend-owned seed content and the API reports `meta.source: "seed"`. The React client still reads everything through `/api/content`.

To use PostgreSQL:

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `DEFAULT_TENANT_SLUG`, and `ADMIN_API_KEY`.
2. Run `npm run db:migrate`.
3. Run `npm run db:seed`.
4. Start the application with `npm run dev`.

When PostgreSQL is active, the API reports `meta.source: "postgresql"`. A configured but unseeded database returns HTTP 503 instead of silently falling back.
