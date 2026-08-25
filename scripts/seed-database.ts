import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { articles, directoryLinks, products, siteSettings, socialLinks, tenants } from "../src/db/schema";
import { seedHomepageContent } from "../src/server/seed-content";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const client = postgres(connectionString, { prepare: false, max: 1 });
const db = drizzle(client);
const { articles: articleData, products: productData, directory, socials, ...settings } = seedHomepageContent;

await db.transaction(async tx => {
  const slug = process.env.DEFAULT_TENANT_SLUG ?? "xmhua";
  const [tenant] = await tx.insert(tenants).values({ slug, name: "XMHUA" })
    .onConflictDoUpdate({ target: tenants.slug, set: { name: "XMHUA", active: true, updatedAt: new Date() } }).returning();
  const tenantId = tenant.id;
  await tx.insert(siteSettings).values({ tenantId, key: "homepage", value: { ...settings, directory: { ...directory, links: undefined } } })
    .onConflictDoUpdate({ target: [siteSettings.tenantId, siteSettings.key], set: { value: { ...settings, directory: { ...directory, links: undefined } }, updatedAt: new Date() } });
  await tx.delete(articles).where(eq(articles.tenantId, tenantId));
  await tx.delete(products).where(eq(products.tenantId, tenantId));
  await tx.delete(directoryLinks).where(eq(directoryLinks.tenantId, tenantId));
  await tx.delete(socialLinks).where(eq(socialLinks.tenantId, tenantId));

  for (const [index, article] of articleData.entries()) {
    await tx.insert(articles).values({ tenantId, category: article.category, title: article.title, excerpt: article.excerpt, publishedAt: article.publishedAt, href: article.href, sortOrder: index + 1, published: true });
  }
  for (const [index, product] of productData.entries()) {
    await tx.insert(products).values({ tenantId, image: product.image, name: product.name, subtitle: product.subtitle, summary: product.summary, platform: product.platform, href: product.href, sortOrder: index + 1, published: true });
  }
  for (const [index, link] of directory.links.entries()) {
    await tx.insert(directoryLinks).values({ tenantId, icon: link.icon, title: link.title, description: link.description, href: link.href, sortOrder: index + 1 });
  }
  for (const [index, social] of socials.entries()) {
    await tx.insert(socialLinks).values({ tenantId, icon: social.icon, label: social.label, handle: social.handle, href: social.href, sortOrder: index + 1 });
  }
});

await client.end();
console.log(JSON.stringify({ status: "seeded", articles: articleData.length, products: productData.length, directoryLinks: directory.links.length, socialLinks: socials.length }));
