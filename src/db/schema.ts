import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(), slug: text("slug").notNull().unique(), name: text("name").notNull(),
  ownerTokenHash: text("owner_token_hash"),
  active: boolean("active").default(true).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex("site_settings_tenant_key_uidx").on(table.tenantId, table.key)]);

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(), tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }), category: text("category").notNull(), title: text("title").notNull(),
  excerpt: text("excerpt").notNull(), publishedAt: text("published_at").notNull(), href: text("href").notNull(),
  slug: text("slug").notNull(), body: text("body").notNull().default(""),
  sortOrder: integer("sort_order").notNull(), published: boolean("published").default(true).notNull(),
}, table => [index("articles_tenant_sort_idx").on(table.tenantId, table.sortOrder), uniqueIndex("articles_tenant_slug_uidx").on(table.tenantId, table.slug)]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(), tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }), image: text("image").notNull(), name: text("name").notNull(),
  subtitle: text("subtitle").notNull(), summary: text("summary").notNull(), platform: text("platform").notNull(),
  href: text("href").notNull(), sortOrder: integer("sort_order").notNull(), published: boolean("published").default(true).notNull(),
}, table => [index("products_tenant_sort_idx").on(table.tenantId, table.sortOrder)]);

export const directoryLinks = pgTable("directory_links", {
  id: serial("id").primaryKey(), tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }), icon: text("icon").notNull(), title: text("title").notNull(),
  description: text("description").notNull(), href: text("href").notNull(), sortOrder: integer("sort_order").notNull(),
}, table => [index("directory_links_tenant_sort_idx").on(table.tenantId, table.sortOrder)]);

export const socialLinks = pgTable("social_links", {
  id: serial("id").primaryKey(), tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }), icon: text("icon").notNull(), label: text("label").notNull(),
  handle: text("handle").notNull(), href: text("href").notNull(), sortOrder: integer("sort_order").notNull(),
}, table => [index("social_links_tenant_sort_idx").on(table.tenantId, table.sortOrder)]);
