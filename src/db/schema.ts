import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(), category: text("category").notNull(), title: text("title").notNull(),
  excerpt: text("excerpt").notNull(), publishedAt: text("published_at").notNull(), href: text("href").notNull(),
  sortOrder: integer("sort_order").notNull(), published: boolean("published").default(true).notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(), image: text("image").notNull(), name: text("name").notNull(),
  subtitle: text("subtitle").notNull(), summary: text("summary").notNull(), platform: text("platform").notNull(),
  href: text("href").notNull(), sortOrder: integer("sort_order").notNull(), published: boolean("published").default(true).notNull(),
});

export const directoryLinks = pgTable("directory_links", {
  id: serial("id").primaryKey(), icon: text("icon").notNull(), title: text("title").notNull(),
  description: text("description").notNull(), href: text("href").notNull(), sortOrder: integer("sort_order").notNull(),
});

export const socialLinks = pgTable("social_links", {
  id: serial("id").primaryKey(), icon: text("icon").notNull(), label: text("label").notNull(),
  handle: text("handle").notNull(), href: text("href").notNull(), sortOrder: integer("sort_order").notNull(),
});

