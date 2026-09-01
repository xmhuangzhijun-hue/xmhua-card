import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { connectDatabase } from "./db/client.js";
import { env } from "./env.js";
import { ApiError } from "./lib/http.js";
import { adminRoutes } from "./routes/admin.js";
import { authRoutes } from "./routes/auth.js";
import { publicRoutes } from "./routes/public.js";
import { tenantRoutes } from "./routes/tenant.js";

export const apiVersion = "2.0.0";

const app = new Hono();

app.use("*", async (context, next) => {
  await next();
  context.header("X-API-Version", apiVersion);
  applyCors(context.req.header("origin"), context.header.bind(context));
});

app.options("*", context => {
  applyCors(context.req.header("origin"), context.header.bind(context));
  return context.body(null, 204);
});

app.get("/api/health", context => context.json({ status: "ok", version: apiVersion }));

app.route("/api", publicRoutes);
app.route("/api", tenantRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/admin", adminRoutes);

app.notFound(context => context.json({ error: "NOT_FOUND" }, 404));

app.onError((error, context) => {
  if (error instanceof ApiError) {
    return context.json({ error: error.code, detail: error.detail }, error.status as 400);
  }
  console.error("Unhandled API error", error);
  return context.json({ error: "INTERNAL_ERROR" }, 500);
});

/**
 * Same-origin deployments need no CORS at all. The allow-list exists for the case
 * where the console is served from a different host than the API.
 */
function applyCors(origin: string | undefined, header: (name: string, value: string) => void) {
  if (!origin || !env.corsOrigins.includes(origin)) return;
  header("Access-Control-Allow-Origin", origin);
  header("Access-Control-Allow-Credentials", "true");
  header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  header("Vary", "Origin");
}

await connectDatabase();

serve({ fetch: app.fetch, hostname: env.host, port: env.port }, info => {
  console.log(`xmhua-api ${apiVersion} listening on http://${info.address}:${info.port}`);
});

export { app };
