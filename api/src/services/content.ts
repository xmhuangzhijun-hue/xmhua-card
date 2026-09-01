import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "../db/client.js";
import { articles, directoryLinks, pages, products, siteSettings, socialLinks } from "../db/schema.js";
import { publicContentSchema, siteSettingsSchema, type PublicContent, type SiteSettings } from "../lib/content-schema.js";
import { notFound } from "../lib/http.js";
import type { TenantRow } from "./tenant.js";

export const settingsKey = "homepage";

export async function readSettings(tenant: TenantRow): Promise<SiteSettings> {
  const rows = await getDatabase()
    .select()
    .from(siteSettings)
    .where(and(eq(siteSettings.tenantId, tenant.id), eq(siteSettings.key, settingsKey)))
    .limit(1);
  const stored = rows[0]?.value;
  if (!stored) throw notFound("SETTINGS_NOT_SEEDED");
  return siteSettingsSchema.parse(stored);
}

export async function writeSettings(tenant: TenantRow, value: SiteSettings) {
  const db = getDatabase();
  await db
    .insert(siteSettings)
    .values({ tenantId: tenant.id, key: settingsKey, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [siteSettings.tenantId, siteSettings.key],
      set: { value, updatedAt: new Date() },
    });
  return value;
}

/**
 * Composes the document the public site renders. Drafts are excluded, and links
 * that were never filled in ("#" or empty) are dropped so the site cannot ship a dead link.
 */
export async function getPublicContent(tenant: TenantRow): Promise<PublicContent> {
  const db = getDatabase();
  const [settings, articleRows, productRows, directoryRows, socialRows, pageRows] = await Promise.all([
    readSettings(tenant),
    db.select().from(articles)
      .where(and(eq(articles.tenantId, tenant.id), eq(articles.published, true)))
      .orderBy(asc(articles.sortOrder)),
    db.select().from(products)
      .where(and(eq(products.tenantId, tenant.id), eq(products.published, true)))
      .orderBy(asc(products.sortOrder)),
    db.select().from(directoryLinks)
      .where(eq(directoryLinks.tenantId, tenant.id))
      .orderBy(asc(directoryLinks.sortOrder)),
    db.select().from(socialLinks)
      .where(eq(socialLinks.tenantId, tenant.id))
      .orderBy(asc(socialLinks.sortOrder)),
    db.select().from(pages)
      .where(and(eq(pages.tenantId, tenant.id), eq(pages.published, true)))
      .orderBy(asc(pages.slug)),
  ]);

  const { directory, ...rest } = settings;
  return publicContentSchema.parse({
    ...rest,
    articles: articleRows.map(row => ({
      id: row.id,
      category: row.category,
      title: row.title,
      excerpt: row.excerpt,
      publishedAt: row.publishedAt,
      href: `/notes/${row.slug}`,
      slug: row.slug,
      body: row.body,
      published: row.published,
      sourceUrl: row.sourceUrl,
      sourceLabel: row.sourceLabel,
    })),
    products: productRows.map(row => ({
      id: row.id,
      image: row.image,
      name: row.name,
      subtitle: row.subtitle,
      summary: row.summary,
      platform: row.platform,
      href: row.href,
    })),
    directory: {
      ...directory,
      links: directoryRows.map(row => ({
        id: row.id,
        icon: row.icon,
        title: row.title,
        description: row.description,
        href: row.href,
      })),
    },
    socials: socialRows
      .filter(isPublishableSocial)
      .map(row => ({
        id: row.id, icon: row.icon, label: row.label, handle: row.handle,
        href: row.href, kind: row.kind, qrAsset: row.qrAsset, note: row.note,
      })),
    pages: pageRows.map(row => ({ slug: row.slug, title: row.title, description: row.description })),
  });
}

export async function getArticleBySlug(tenant: TenantRow, slug: string) {
  const rows = await getDatabase()
    .select()
    .from(articles)
    .where(and(eq(articles.tenantId, tenant.id), eq(articles.slug, slug), eq(articles.published, true)))
    .limit(1);
  const article = rows[0];
  if (!article) throw notFound("ARTICLE_NOT_FOUND");
  return article;
}

export async function getPageBySlug(tenant: TenantRow, slug: string) {
  const rows = await getDatabase()
    .select()
    .from(pages)
    .where(and(eq(pages.tenantId, tenant.id), eq(pages.slug, slug), eq(pages.published, true)))
    .limit(1);
  const page = rows[0];
  if (!page) throw notFound("PAGE_NOT_FOUND");
  return page;
}

/**
 * A link entry needs a destination; a QR entry needs an image. Either way an entry
 * the owner has not finished is hidden rather than shipped as something dead.
 */
export function isPublishableSocial(row: { kind: string; href: string; qrAsset: string }) {
  return row.kind === "qrcode" ? isLive(row.qrAsset) : isLive(row.href);
}

/** A href that is empty or a bare "#" is an unfilled placeholder, not a destination. */
export function isLive(href: string) {
  const trimmed = href.trim();
  return trimmed.length > 0 && trimmed !== "#";
}
