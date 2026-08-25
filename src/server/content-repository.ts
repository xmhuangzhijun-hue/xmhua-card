import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { articles, directoryLinks, products, siteSettings, socialLinks, tenants } from "@/db/schema";
import { homepageContentSchema, type HomepageContent } from "@/lib/content-schema";
import { seedHomepageContent } from "./seed-content";

export type ContentSource = "postgresql" | "seed";

export const defaultTenantSlug = process.env.DEFAULT_TENANT_SLUG ?? "xmhua";

export async function getHomepageContent(tenantSlug = defaultTenantSlug): Promise<{ data: HomepageContent; source: ContentSource }> {
  const db = getDatabase();
  if (!db) {
    if (tenantSlug !== defaultTenantSlug) throw new Error("Tenant is unavailable without PostgreSQL");
    return { data: seedHomepageContent, source: "seed" };
  }

  const tenantRows = await db.select().from(tenants).where(and(eq(tenants.slug, tenantSlug), eq(tenants.active, true))).limit(1);
  const tenant = tenantRows[0];
  if (!tenant) throw new Error("Tenant not found");

  const [settingsRows, articleRows, productRows, directoryRows, socialRows] = await Promise.all([
    db.select().from(siteSettings).where(and(eq(siteSettings.tenantId, tenant.id), eq(siteSettings.key, "homepage"))).limit(1),
    db.select().from(articles).where(and(eq(articles.tenantId, tenant.id), eq(articles.published, true))).orderBy(asc(articles.sortOrder)),
    db.select().from(products).where(and(eq(products.tenantId, tenant.id), eq(products.published, true))).orderBy(asc(products.sortOrder)),
    db.select().from(directoryLinks).where(eq(directoryLinks.tenantId, tenant.id)).orderBy(asc(directoryLinks.sortOrder)),
    db.select().from(socialLinks).where(eq(socialLinks.tenantId, tenant.id)).orderBy(asc(socialLinks.sortOrder)),
  ]);

  const settings = settingsRows[0]?.value;
  if (!settings) {
    throw new Error("PostgreSQL content is not seeded");
  }

  const candidate = {
    ...(settings as object),
    articles: articleRows.map(article => ({ id: article.id, category: article.category, title: article.title, excerpt: article.excerpt, publishedAt: article.publishedAt, href: article.href })),
    products: productRows.map(product => ({ id: product.id, image: product.image, name: product.name, subtitle: product.subtitle, summary: product.summary, platform: product.platform, href: product.href })),
    directory: {
      ...((settings as { directory?: object }).directory ?? {}),
      links: directoryRows.map(link => ({ id: link.id, icon: link.icon, title: link.title, description: link.description, href: link.href })),
    },
    socials: socialRows.map(social => ({ id: social.id, icon: social.icon, label: social.label, handle: social.handle, href: social.href })),
  };

  return { data: homepageContentSchema.parse(candidate), source: "postgresql" };
}
