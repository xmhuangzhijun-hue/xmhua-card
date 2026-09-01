/**
 * Self-service signup and the tenant-token studio API.
 *
 * These are not linked from the public blog any more, but the endpoints stay so
 * the multi-tenant capability is preserved rather than deleted.
 */
import { Hono, type Context } from "hono";
import { z } from "zod";
import { parseBody, unauthorized } from "../lib/http.js";
import { enforceValidSignupAttempt } from "../lib/signup-guard.js";
import { siteSettingsSchema } from "../lib/content-schema.js";
import { createSelfServiceTenant, requireTenantOwner } from "../services/provisioning.js";
import { getPublicContent, readSettings, writeSettings } from "../services/content.js";
import { tenantSlugSchema } from "../services/tenant.js";

export const tenantRoutes = new Hono();

const signupSchema = z.object({
  slug: tenantSlugSchema,
  name: z.string().min(1).max(120),
  inviteCode: z.string().min(1).max(200),
});

tenantRoutes.post("/signup", async context => {
  const body = await parseBody(context, signupSchema);
  enforceValidSignupAttempt(context.req.header("x-forwarded-for"), body.inviteCode);
  const result = await createSelfServiceTenant({ slug: body.slug, name: body.name });
  return context.json({ data: result }, 201);
});

/** Studio callers authenticate with the tenant token issued at signup. */
async function studioTenant(context: Context) {
  const slug = context.req.query("tenant");
  const authorization = context.req.header("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!slug || !token) throw unauthorized("TENANT_UNAUTHORIZED");
  return requireTenantOwner(slug, token);
}

tenantRoutes.get("/studio/content", async context => {
  const tenant = await studioTenant(context);
  return context.json({ data: await getPublicContent(tenant), meta: { tenant: tenant.slug } });
});

tenantRoutes.put("/studio/content", async context => {
  const tenant = await studioTenant(context);
  const body = await parseBody(context, siteSettingsSchema);
  await writeSettings(tenant, body);
  return context.json({ data: await readSettings(tenant), meta: { tenant: tenant.slug } });
});
