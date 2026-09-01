/**
 * Seeds a fresh database with the starter site.
 *
 * Collections are only filled when they are empty, so running this against a
 * database that already has content never overwrites what the owner wrote.
 */
import { eq } from "drizzle-orm";
import seedData from "./seed-data.json" with { type: "json" };
import { closeDatabase, connectDatabase } from "./db/client.js";
import { articles, directoryLinks, pages, products, socialLinks, tenants } from "./db/schema.js";
import { env } from "./env.js";
import { siteSettingsSchema } from "./lib/content-schema.js";
import { settingsKey, writeSettings } from "./services/content.js";

const db = await connectDatabase();
const slug = env.defaultTenant;

const existing = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
const tenant = existing[0]
  ?? (await db.insert(tenants).values({ slug, name: seedData.settings.site.brandName }).returning())[0]!;
console.log(`tenant ${tenant.slug} (id ${tenant.id})`);

await writeSettings(tenant, siteSettingsSchema.parse(seedData.settings));
console.log(`settings "${settingsKey}" written`);

await fillIfEmpty("articles", articles, seedData.articles.map((row, index) => ({
  ...row, tenantId: tenant.id, href: `/notes/${row.slug}`, sortOrder: index,
})));

await fillIfEmpty("products", products, seedData.products.map((row, index) => ({
  ...row, tenantId: tenant.id, sortOrder: index,
})));

await fillIfEmpty("directory links", directoryLinks, seedData.directoryLinks.map((row, index) => ({
  ...row, tenantId: tenant.id, sortOrder: index,
})));

await fillIfEmpty("social links", socialLinks, seedData.socialLinks.map((row, index) => ({
  ...row, tenantId: tenant.id, sortOrder: index,
})));

await fillIfEmpty("pages", pages, seedData.pages.map(row => ({ ...row, tenantId: tenant.id })));

await closeDatabase();
console.log("seed complete");

type AnyTable = typeof articles | typeof products | typeof directoryLinks | typeof socialLinks | typeof pages;

async function fillIfEmpty(label: string, table: AnyTable, rows: object[]) {
  const present = await db.select({ id: table.id }).from(table).where(eq(table.tenantId, tenant.id)).limit(1);
  if (present.length > 0) {
    console.log(`${label}: already present, left untouched`);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.insert(table).values(rows as any);
  console.log(`${label}: inserted ${rows.length}`);
}
