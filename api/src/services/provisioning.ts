/**
 * Multi-tenant provisioning.
 *
 * The public blog no longer advertises self-service signup, but the capability is
 * kept here behind SELF_SERVICE_SIGNUP_ENABLED so it can be switched back on
 * without rebuilding the data model.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import seedData from "../seed-data.json" with { type: "json" };
import { getDatabase } from "../db/client.js";
import { articles, directoryLinks, pages, products, siteSettings, socialLinks, tenants } from "../db/schema.js";
import { siteSettingsSchema, type SiteSettings } from "../lib/content-schema.js";
import { ApiError, conflict, notFound } from "../lib/http.js";
import { settingsKey } from "./content.js";

export function hashTenantToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function tenantTokenMatches(token: string, expectedHash: string | null) {
  if (!expectedHash) return false;
  const supplied = Buffer.from(hashTenantToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

/** The shipped starter site, rebranded for a new tenant. */
function starterSettings(brandName: string): SiteSettings {
  return siteSettingsSchema.parse({
    ...seedData.settings,
    site: { ...seedData.settings.site, brandName },
    ui: { ...seedData.settings.ui, pageTitle: brandName },
  });
}

type Database = ReturnType<typeof getDatabase>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function installStarterContent(tx: Transaction, tenantId: number, settings: SiteSettings) {
  await tx.insert(siteSettings)
    .values({ tenantId, key: settingsKey, value: settings, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [siteSettings.tenantId, siteSettings.key],
      set: { value: settings, updatedAt: new Date() },
    });

  for (const table of [articles, products, directoryLinks, socialLinks, pages]) {
    await tx.delete(table).where(eq(table.tenantId, tenantId));
  }

  await tx.insert(articles).values(seedData.articles.map((row, index) => ({
    ...row, tenantId, href: `/notes/${row.slug}`, sortOrder: index,
  })));
  await tx.insert(products).values(seedData.products.map((row, index) => ({ ...row, tenantId, sortOrder: index })));
  await tx.insert(directoryLinks).values(seedData.directoryLinks.map((row, index) => ({ ...row, tenantId, sortOrder: index })));
  await tx.insert(socialLinks).values(seedData.socialLinks.map((row, index) => ({ ...row, tenantId, sortOrder: index })));
  await tx.insert(pages).values(seedData.pages.map(row => ({ ...row, tenantId })));
  await tx.update(tenants).set({ updatedAt: new Date() }).where(eq(tenants.id, tenantId));
}

export async function createSelfServiceTenant(input: { slug: string; name: string }) {
  if (process.env.SELF_SERVICE_SIGNUP_ENABLED !== "true") throw new ApiError(403, "SIGNUP_DISABLED");
  const db = getDatabase();
  const maxTenants = Math.max(1, Math.min(Number.parseInt(process.env.MAX_TENANTS ?? "100", 10) || 100, 10_000));
  const totals = await db.select({ value: count() }).from(tenants);
  if ((totals[0]?.value ?? 0) >= maxTenants) throw new ApiError(429, "TENANT_QUOTA_EXCEEDED");

  const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, input.slug)).limit(1);
  if (existing.length > 0) throw conflict("TENANT_EXISTS");

  const token = `site_${randomBytes(24).toString("base64url")}`;
  const settings = starterSettings(input.name);
  const created = await db.transaction(async tx => {
    const rows = await tx.insert(tenants)
      .values({ slug: input.slug, name: input.name, ownerTokenHash: hashTenantToken(token) })
      .returning();
    const tenant = rows[0]!;
    await installStarterContent(tx, tenant.id, settings);
    return tenant;
  });

  // The token is shown once and only its hash is stored.
  return { tenant: { slug: created.slug, name: created.name }, token };
}

export async function createTenant(input: { slug: string; name: string; seedContent: boolean }) {
  const db = getDatabase();
  const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, input.slug)).limit(1);
  if (existing.length > 0) throw conflict("TENANT_EXISTS");
  const settings = starterSettings(input.name);
  return db.transaction(async tx => {
    const rows = await tx.insert(tenants).values({ slug: input.slug, name: input.name }).returning();
    const tenant = rows[0]!;
    if (input.seedContent) await installStarterContent(tx, tenant.id, settings);
    return tenant;
  });
}

export async function requireTenantOwner(slug: string, token: string) {
  const rows = await getDatabase()
    .select()
    .from(tenants)
    .where(and(eq(tenants.slug, slug), eq(tenants.active, true)))
    .limit(1);
  const tenant = rows[0];
  if (!tenant) throw notFound("TENANT_NOT_FOUND");
  if (!tenantTokenMatches(token, tenant.ownerTokenHash)) throw new ApiError(401, "TENANT_UNAUTHORIZED");
  return tenant;
}
