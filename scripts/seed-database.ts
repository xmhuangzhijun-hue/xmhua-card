import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { articles, directoryLinks, products, siteSettings, socialLinks } from "../src/db/schema";
import { seedHomepageContent } from "../src/server/seed-content";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const client = postgres(connectionString, { prepare: false, max: 1 });
const db = drizzle(client);
const { articles: articleData, products: productData, directory, socials, ...settings } = seedHomepageContent;

await db.transaction(async tx => {
  await tx.insert(siteSettings).values({ id: 1, key: "homepage", value: { ...settings, directory: { ...directory, links: undefined } } })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: { ...settings, directory: { ...directory, links: undefined } } } });

  for (const [index, article] of articleData.entries()) {
    await tx.insert(articles).values({ ...article, sortOrder: index + 1, published: true })
      .onConflictDoUpdate({ target: articles.id, set: { ...article, sortOrder: index + 1, published: true } });
  }
  for (const [index, product] of productData.entries()) {
    await tx.insert(products).values({ ...product, sortOrder: index + 1, published: true })
      .onConflictDoUpdate({ target: products.id, set: { ...product, sortOrder: index + 1, published: true } });
  }
  for (const [index, link] of directory.links.entries()) {
    await tx.insert(directoryLinks).values({ ...link, sortOrder: index + 1 })
      .onConflictDoUpdate({ target: directoryLinks.id, set: { ...link, sortOrder: index + 1 } });
  }
  for (const [index, social] of socials.entries()) {
    await tx.insert(socialLinks).values({ ...social, sortOrder: index + 1 })
      .onConflictDoUpdate({ target: socialLinks.id, set: { ...social, sortOrder: index + 1 } });
  }
});

await client.end();
console.log(JSON.stringify({ status: "seeded", articles: articleData.length, products: productData.length, directoryLinks: directory.links.length, socialLinks: socials.length }));
