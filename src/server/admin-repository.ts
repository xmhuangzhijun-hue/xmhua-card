import { and, asc, count, eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { articles, directoryLinks, products, siteSettings, socialLinks, tenants } from "@/db/schema";
import type { HomepageContent } from "@/lib/content-schema";
import { getHomepageContent } from "./content-repository";
import { seedHomepageContent } from "./seed-content";
import { createStarterContent } from "./starter-content";
import { hashTenantToken, tokenMatches } from "./admin-auth";
import { randomBytes } from "node:crypto";

export class DatabaseRequiredError extends Error {}
export class TenantNotFoundError extends Error {}

function databaseOrThrow() {
  const db = getDatabase();
  if (!db) throw new DatabaseRequiredError("DATABASE_URL is required for administration");
  return db;
}

function settingsFrom(content: HomepageContent) {
  return {
    site: content.site,
    hero: content.hero,
    sections: content.sections,
    directory: {
      kicker: content.directory.kicker, title: content.directory.title, description: content.directory.description,
      primaryAction: content.directory.primaryAction, secondaryAction: content.directory.secondaryAction,
    },
    author: content.author,
    footer: content.footer,
    ui: content.ui,
  };
}

type Database = ReturnType<typeof databaseOrThrow>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function insertTenantContent(tx: Transaction, tenantId: number, content: HomepageContent) {
    await tx.insert(siteSettings).values({ tenantId, key: "homepage", value: settingsFrom(content), updatedAt: new Date() })
      .onConflictDoUpdate({ target: [siteSettings.tenantId, siteSettings.key], set: { value: settingsFrom(content), updatedAt: new Date() } });
    await tx.delete(articles).where(eq(articles.tenantId, tenantId));
    await tx.delete(products).where(eq(products.tenantId, tenantId));
    await tx.delete(directoryLinks).where(eq(directoryLinks.tenantId, tenantId));
    await tx.delete(socialLinks).where(eq(socialLinks.tenantId, tenantId));
    if (content.articles.length) await tx.insert(articles).values(content.articles.map((item, index) => ({ tenantId, category: item.category, title: item.title, excerpt: item.excerpt, publishedAt: item.publishedAt, href: `/notes/${item.slug}`, slug: item.slug, body: item.body, sortOrder: index + 1, published: item.published })));
    if (content.products.length) await tx.insert(products).values(content.products.map((item, index) => ({ tenantId, image: item.image, name: item.name, subtitle: item.subtitle, summary: item.summary, platform: item.platform, href: item.href, sortOrder: index + 1, published: true })));
    if (content.directory.links.length) await tx.insert(directoryLinks).values(content.directory.links.map((item, index) => ({ tenantId, icon: item.icon, title: item.title, description: item.description, href: item.href, sortOrder: index + 1 })));
    if (content.socials.length) await tx.insert(socialLinks).values(content.socials.map((item, index) => ({ tenantId, icon: item.icon, label: item.label, handle: item.handle, href: item.href, sortOrder: index + 1 })));
    await tx.update(tenants).set({ updatedAt: new Date() }).where(eq(tenants.id, tenantId));
}

async function replaceTenantContent(db: Database, tenantId: number, content: HomepageContent) {
  await db.transaction(async tx => {
    await insertTenantContent(tx, tenantId, content);
  });
}

export async function createSelfServiceTenant(input: { slug: string; name: string }) {
  if (process.env.SELF_SERVICE_SIGNUP_ENABLED !== "true") throw new Error("SIGNUP_DISABLED");
  const db = databaseOrThrow();
  const maxTenants = Math.max(1, Math.min(Number.parseInt(process.env.MAX_TENANTS ?? "100", 10) || 100, 10000));
  const [{ value: tenantCount }] = await db.select({ value: count() }).from(tenants);
  if (tenantCount >= maxTenants) throw new Error("TENANT_QUOTA_EXCEEDED");
  const token = `site_${randomBytes(24).toString("base64url")}`;
  const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, input.slug)).limit(1);
  if (existing.length) throw new Error("TENANT_EXISTS");
  const tenant = await db.transaction(async tx => {
    const [created] = await tx.insert(tenants).values({ slug: input.slug, name: input.name, ownerTokenHash: hashTenantToken(token) }).returning();
    await insertTenantContent(tx, created.id, createStarterContent(input.name));
    return created;
  });
  return { tenant: { slug: tenant.slug, name: tenant.name }, token };
}

export async function requireTenantOwner(slug: string, token: string) {
  const db = databaseOrThrow();
  const [tenant] = await db.select({ id: tenants.id, ownerTokenHash: tenants.ownerTokenHash }).from(tenants)
    .where(and(eq(tenants.slug, slug), eq(tenants.active, true))).limit(1);
  if (!tenant) throw new TenantNotFoundError("Tenant not found");
  if (!tokenMatches(token, tenant.ownerTokenHash)) throw new Error("TENANT_UNAUTHORIZED");
  return tenant;
}

export async function listTenants() {
  return databaseOrThrow().select({ id: tenants.id, slug: tenants.slug, name: tenants.name, active: tenants.active, updatedAt: tenants.updatedAt })
    .from(tenants).orderBy(asc(tenants.name));
}

export async function createTenant(input: { slug: string; name: string; seedContent: boolean }) {
  const db = databaseOrThrow();
  const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, input.slug)).limit(1);
  if (existing.length) throw new Error("TENANT_EXISTS");
  const [tenant] = await db.insert(tenants).values({ slug: input.slug, name: input.name }).returning();
  if (input.seedContent) await replaceTenantContent(db, tenant.id, seedHomepageContent);
  return tenant;
}

export async function readTenantContent(slug: string) {
  databaseOrThrow();
  return getHomepageContent(slug, true);
}

export async function writeTenantContent(slug: string, content: HomepageContent) {
  const db = databaseOrThrow();
  const [tenant] = await db.select().from(tenants).where(and(eq(tenants.slug, slug), eq(tenants.active, true))).limit(1);
  if (!tenant) throw new TenantNotFoundError("Tenant not found");
  await replaceTenantContent(db, tenant.id, content);
  return getHomepageContent(slug, true);
}
