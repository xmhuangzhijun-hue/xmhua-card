# Backend

The homepage is served through `GET /api/content`. Use `GET /api/content?tenant=<slug>` for another tenant. The default is controlled by `DEFAULT_TENANT_SLUG`.

The complete versioned HTTP contract is documented in [`API.md`](API.md). A separately deployed frontend sets `NEXT_PUBLIC_API_BASE_URL`; the backend sets `CORS_ALLOWED_ORIGIN` to that frontend's exact origin. Leave both unset for same-origin deployment.

The public React page is a presentation shell. All visible identity, copy, navigation, lists, links, image URLs, button labels, footer content, and analytics-consent text come from this API. The backend-owned fallback seed contains the XMHUA site and is used only for public reads when PostgreSQL is not configured.

## Stack

- Next.js 16 Route Handlers
- PostgreSQL
- Drizzle ORM and Drizzle Kit
- Zod response validation
- Bearer-key protected administration routes

## Multi-tenant administration

Every content row belongs to a record in `tenants`; tenant deletion cascades only to that tenant's content. The public API, management reads, and management writes always resolve a tenant before querying content.

Set `ADMIN_API_KEY` to a long random value, then open `/admin`. The key is sent as an `Authorization: Bearer` header and kept in browser `sessionStorage`, so closing the tab session clears it. It is never stored in the content database.

`/studio` provides a form-based editor for routine tenant updates. `/admin` provides the complete validated content document editor for every API-driven field.

Management endpoints:

- `GET /api/admin/tenants` — list tenants
- `POST /api/admin/tenants` — create a tenant, optionally with initial content
- `GET /api/admin/content?tenant=<slug>` — load one tenant's content
- `PUT /api/admin/content?tenant=<slug>` — validate and replace one tenant's content in a transaction

Writes fail closed: without `ADMIN_API_KEY` or `DATABASE_URL`, no management write is accepted. A full-content save replaces only the selected tenant's articles, products, directory links and social links inside one PostgreSQL transaction.

For a loopback-only owner workstation, `LOCAL_OWNER_ACCESS=true` allows `/admin` requests whose URL hostname is `127.0.0.1`, `localhost`, or `::1` to connect without typing the remote management key. Never enable this setting on a public deployment or proxy.

## Self-service sites

Set `SELF_SERVICE_SIGNUP_ENABLED=true` only after PostgreSQL is migrated. Visitors can then use `/start` to create an isolated site and `/studio?tenant=<slug>` to edit it without source-code access.

`POST /api/signup` creates the tenant and starter content in one transaction. It returns a high-entropy tenant management token exactly once; PostgreSQL stores only its SHA-256 digest. The tenant studio sends that token as a Bearer credential to `GET` and `PUT /api/studio/content?tenant=<slug>`. A tenant credential cannot list tenants or read/write another tenant.

Self-service creation fails closed when either `DATABASE_URL` is absent or `SELF_SERVICE_SIGNUP_ENABLED` is not exactly `true`. Before public production launch, place the signup endpoint behind deployment-level rate limiting and abuse monitoring.

## Local development

Without `DATABASE_URL`, the server repository returns backend-owned seed content and the API reports `meta.source: "seed"`. The React client still reads everything through `/api/content`.

To use PostgreSQL:

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `DEFAULT_TENANT_SLUG`, and `ADMIN_API_KEY`. Enable `SELF_SERVICE_SIGNUP_ENABLED` only when you are ready to accept new sites.
2. Run `npm run db:migrate`.
3. Run `npm run db:seed`.
4. Start the application with `npm run dev`.

When PostgreSQL is active, the API reports `meta.source: "postgresql"`. A configured but unseeded database returns HTTP 503 instead of silently falling back.
