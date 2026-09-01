import { and, eq } from "drizzle-orm";
import { getDatabase } from "../db/client.js";
import { tenants } from "../db/schema.js";
import { env } from "../env.js";
import { notFound } from "../lib/http.js";
import { z } from "zod";

export const tenantSlugSchema = z.string().min(1).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export type TenantRow = typeof tenants.$inferSelect;

export async function requireTenant(slugValue?: string | null): Promise<TenantRow> {
  const parsed = tenantSlugSchema.safeParse(slugValue?.trim() || env.defaultTenant);
  if (!parsed.success) throw notFound("TENANT_NOT_FOUND");
  const rows = await getDatabase()
    .select()
    .from(tenants)
    .where(and(eq(tenants.slug, parsed.data), eq(tenants.active, true)))
    .limit(1);
  const tenant = rows[0];
  if (!tenant) throw notFound("TENANT_NOT_FOUND");
  return tenant;
}

export async function listTenants() {
  return getDatabase().select().from(tenants).orderBy(tenants.id);
}
