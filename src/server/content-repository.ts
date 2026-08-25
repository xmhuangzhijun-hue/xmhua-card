import { asc, eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { articles, directoryLinks, products, siteSettings, socialLinks } from "@/db/schema";
import { homepageContentSchema, type HomepageContent } from "@/lib/content-schema";
import { seedHomepageContent } from "./seed-content";

export type ContentSource = "postgresql" | "seed";

export async function getHomepageContent(): Promise<{ data: HomepageContent; source: ContentSource }> {
  const db = getDatabase();
  if (!db) return { data: seedHomepageContent, source: "seed" };

  const [settingsRows, articleRows, productRows, directoryRows, socialRows] = await Promise.all([
    db.select().from(siteSettings).where(eq(siteSettings.key, "homepage")).limit(1),
    db.select().from(articles).where(eq(articles.published, true)).orderBy(asc(articles.sortOrder)),
    db.select().from(products).where(eq(products.published, true)).orderBy(asc(products.sortOrder)),
    db.select().from(directoryLinks).orderBy(asc(directoryLinks.sortOrder)),
    db.select().from(socialLinks).orderBy(asc(socialLinks.sortOrder)),
  ]);

  const settings = settingsRows[0]?.value;
  if (!settings || articleRows.length === 0 || productRows.length === 0) {
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
