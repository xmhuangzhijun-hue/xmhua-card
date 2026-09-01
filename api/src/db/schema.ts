import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ownerTokenHash: text("owner_token_hash"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  publishedAt: text("published_at").notNull(),
  href: text("href").notNull(),
  slug: text("slug").notNull(),
  body: text("body").notNull().default(""),
  /** Optional link to the material a note is about (a paper, article or repo). */
  sourceUrl: text("source_url").notNull().default(""),
  sourceLabel: text("source_label").notNull().default(""),
  sortOrder: integer("sort_order").notNull(),
  published: boolean("published").default(true).notNull(),
}, table => [
  index("articles_tenant_sort_idx").on(table.tenantId, table.sortOrder),
  uniqueIndex("articles_tenant_slug_uidx").on(table.tenantId, table.slug),
]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  image: text("image").notNull(),
  name: text("name").notNull(),
  subtitle: text("subtitle").notNull(),
  summary: text("summary").notNull(),
  platform: text("platform").notNull(),
  href: text("href").notNull(),
  sortOrder: integer("sort_order").notNull(),
  published: boolean("published").default(true).notNull(),
}, table => [index("products_tenant_sort_idx").on(table.tenantId, table.sortOrder)]);

export const directoryLinks = pgTable("directory_links", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  icon: text("icon").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  href: text("href").notNull(),
  sortOrder: integer("sort_order").notNull(),
}, table => [index("directory_links_tenant_sort_idx").on(table.tenantId, table.sortOrder)]);

/**
 * Social entries come in two shapes.
 *
 * "link" opens a profile URL. "qrcode" is for platforms with no linkable personal
 * page - WeChat above all - where the visitor scans an image instead of following
 * a link. A qrcode entry may still carry an href (an official-account page, say),
 * but it is the image that makes it publishable.
 */
export const socialLinks = pgTable("social_links", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  icon: text("icon").notNull(),
  label: text("label").notNull(),
  handle: text("handle").notNull(),
  href: text("href").notNull(),
  kind: text("kind").notNull().default("link"),
  qrAsset: text("qr_asset").notNull().default(""),
  note: text("note").notNull().default(""),
  sortOrder: integer("sort_order").notNull(),
}, table => [index("social_links_tenant_sort_idx").on(table.tenantId, table.sortOrder)]);

/** Standalone editable pages such as /privacy, /terms and /cookies. */
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  body: text("body").notNull().default(""),
  published: boolean("published").default(true).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex("pages_tenant_slug_uidx").on(table.tenantId, table.slug)]);

/** Console operators. Passwords are scrypt hashes; plaintext never reaches the database. */
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  displayName: text("display_name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex("admin_users_username_uidx").on(table.username)]);

/** Only the SHA-256 of a session token is stored, so a database leak cannot replay sessions. */
export const adminSessions = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex("admin_sessions_token_uidx").on(table.tokenHash),
  index("admin_sessions_user_idx").on(table.userId),
]);
