import { and, asc, eq, max, ne } from "drizzle-orm";
import { getDatabase } from "../db/client.js";
import { articles, directoryLinks, pages, products, socialLinks } from "../db/schema.js";
import { conflict, notFound } from "../lib/http.js";
import type { TenantRow } from "./tenant.js";

type SortableTable = typeof articles | typeof products | typeof directoryLinks | typeof socialLinks;

async function nextSortOrder(table: SortableTable, tenantId: number) {
  const rows = await getDatabase()
    .select({ value: max(table.sortOrder) })
    .from(table)
    .where(eq(table.tenantId, tenantId));
  return (rows[0]?.value ?? -1) + 1;
}

/** Applies an explicit id order. Ids belonging to another tenant are ignored. */
async function applyOrder(table: SortableTable, tenantId: number, ids: number[]) {
  await getDatabase().transaction(async tx => {
    for (const [index, id] of ids.entries()) {
      await tx.update(table).set({ sortOrder: index }).where(and(eq(table.id, id), eq(table.tenantId, tenantId)));
    }
  });
}

async function removeRow(table: SortableTable, tenant: TenantRow, id: number, code: string) {
  const rows = await getDatabase().delete(table)
    .where(and(eq(table.id, id), eq(table.tenantId, tenant.id))).returning({ id: table.id });
  if (rows.length === 0) throw notFound(code);
}

// ---------------------------------------------------------------- articles

export type ArticleInput = {
  category: string; title: string; excerpt: string; publishedAt: string;
  slug: string; body: string; published: boolean;
};

export function listArticles(tenant: TenantRow) {
  return getDatabase().select().from(articles)
    .where(eq(articles.tenantId, tenant.id)).orderBy(asc(articles.sortOrder));
}

async function assertArticleSlugFree(tenant: TenantRow, slug: string, exceptId?: number) {
  const clauses = [eq(articles.tenantId, tenant.id), eq(articles.slug, slug)];
  if (exceptId !== undefined) clauses.push(ne(articles.id, exceptId));
  const rows = await getDatabase().select({ id: articles.id }).from(articles).where(and(...clauses)).limit(1);
  if (rows.length > 0) throw conflict("SLUG_TAKEN");
}

export async function createArticle(tenant: TenantRow, input: ArticleInput) {
  await assertArticleSlugFree(tenant, input.slug);
  const rows = await getDatabase().insert(articles).values({
    ...input,
    tenantId: tenant.id,
    href: `/notes/${input.slug}`,
    sortOrder: await nextSortOrder(articles, tenant.id),
  }).returning();
  return rows[0]!;
}

export async function updateArticle(tenant: TenantRow, id: number, input: ArticleInput) {
  await assertArticleSlugFree(tenant, input.slug, id);
  const rows = await getDatabase().update(articles)
    .set({ ...input, href: `/notes/${input.slug}` })
    .where(and(eq(articles.id, id), eq(articles.tenantId, tenant.id)))
    .returning();
  const row = rows[0];
  if (!row) throw notFound("ARTICLE_NOT_FOUND");
  return row;
}

export const deleteArticle = (tenant: TenantRow, id: number) => removeRow(articles, tenant, id, "ARTICLE_NOT_FOUND");
export const reorderArticles = (tenant: TenantRow, ids: number[]) => applyOrder(articles, tenant.id, ids);

// ---------------------------------------------------------------- products

export type ProductInput = {
  image: string; name: string; subtitle: string; summary: string;
  platform: string; href: string; published: boolean;
};

export function listProducts(tenant: TenantRow) {
  return getDatabase().select().from(products)
    .where(eq(products.tenantId, tenant.id)).orderBy(asc(products.sortOrder));
}

export async function createProduct(tenant: TenantRow, input: ProductInput) {
  const rows = await getDatabase().insert(products).values({
    ...input, tenantId: tenant.id, sortOrder: await nextSortOrder(products, tenant.id),
  }).returning();
  return rows[0]!;
}

export async function updateProduct(tenant: TenantRow, id: number, input: ProductInput) {
  const rows = await getDatabase().update(products).set(input)
    .where(and(eq(products.id, id), eq(products.tenantId, tenant.id))).returning();
  const row = rows[0];
  if (!row) throw notFound("PRODUCT_NOT_FOUND");
  return row;
}

export const deleteProduct = (tenant: TenantRow, id: number) => removeRow(products, tenant, id, "PRODUCT_NOT_FOUND");
export const reorderProducts = (tenant: TenantRow, ids: number[]) => applyOrder(products, tenant.id, ids);

// ---------------------------------------------------------- directory links

export type DirectoryLinkInput = { icon: string; title: string; description: string; href: string };

export function listDirectoryLinks(tenant: TenantRow) {
  return getDatabase().select().from(directoryLinks)
    .where(eq(directoryLinks.tenantId, tenant.id)).orderBy(asc(directoryLinks.sortOrder));
}

export async function createDirectoryLink(tenant: TenantRow, input: DirectoryLinkInput) {
  const rows = await getDatabase().insert(directoryLinks).values({
    ...input, tenantId: tenant.id, sortOrder: await nextSortOrder(directoryLinks, tenant.id),
  }).returning();
  return rows[0]!;
}

export async function updateDirectoryLink(tenant: TenantRow, id: number, input: DirectoryLinkInput) {
  const rows = await getDatabase().update(directoryLinks).set(input)
    .where(and(eq(directoryLinks.id, id), eq(directoryLinks.tenantId, tenant.id))).returning();
  const row = rows[0];
  if (!row) throw notFound("DIRECTORY_LINK_NOT_FOUND");
  return row;
}

export const deleteDirectoryLink = (tenant: TenantRow, id: number) =>
  removeRow(directoryLinks, tenant, id, "DIRECTORY_LINK_NOT_FOUND");
export const reorderDirectoryLinks = (tenant: TenantRow, ids: number[]) => applyOrder(directoryLinks, tenant.id, ids);

// ------------------------------------------------------------- social links

export type SocialLinkInput = { icon: string; label: string; handle: string; href: string };

export function listSocialLinks(tenant: TenantRow) {
  return getDatabase().select().from(socialLinks)
    .where(eq(socialLinks.tenantId, tenant.id)).orderBy(asc(socialLinks.sortOrder));
}

export async function createSocialLink(tenant: TenantRow, input: SocialLinkInput) {
  const rows = await getDatabase().insert(socialLinks).values({
    ...input, tenantId: tenant.id, sortOrder: await nextSortOrder(socialLinks, tenant.id),
  }).returning();
  return rows[0]!;
}

export async function updateSocialLink(tenant: TenantRow, id: number, input: SocialLinkInput) {
  const rows = await getDatabase().update(socialLinks).set(input)
    .where(and(eq(socialLinks.id, id), eq(socialLinks.tenantId, tenant.id))).returning();
  const row = rows[0];
  if (!row) throw notFound("SOCIAL_LINK_NOT_FOUND");
  return row;
}

export const deleteSocialLink = (tenant: TenantRow, id: number) =>
  removeRow(socialLinks, tenant, id, "SOCIAL_LINK_NOT_FOUND");
export const reorderSocialLinks = (tenant: TenantRow, ids: number[]) => applyOrder(socialLinks, tenant.id, ids);

// ------------------------------------------------------------------- pages

export type PageInput = { slug: string; title: string; description: string; body: string; published: boolean };

export function listPages(tenant: TenantRow) {
  return getDatabase().select().from(pages).where(eq(pages.tenantId, tenant.id)).orderBy(asc(pages.slug));
}

export async function createPage(tenant: TenantRow, input: PageInput) {
  const existing = await getDatabase().select({ id: pages.id }).from(pages)
    .where(and(eq(pages.tenantId, tenant.id), eq(pages.slug, input.slug))).limit(1);
  if (existing.length > 0) throw conflict("SLUG_TAKEN");
  const rows = await getDatabase().insert(pages).values({ ...input, tenantId: tenant.id }).returning();
  return rows[0]!;
}

export async function updatePage(tenant: TenantRow, id: number, input: PageInput) {
  const clash = await getDatabase().select({ id: pages.id }).from(pages)
    .where(and(eq(pages.tenantId, tenant.id), eq(pages.slug, input.slug), ne(pages.id, id))).limit(1);
  if (clash.length > 0) throw conflict("SLUG_TAKEN");
  const rows = await getDatabase().update(pages).set({ ...input, updatedAt: new Date() })
    .where(and(eq(pages.id, id), eq(pages.tenantId, tenant.id))).returning();
  const row = rows[0];
  if (!row) throw notFound("PAGE_NOT_FOUND");
  return row;
}

export async function deletePage(tenant: TenantRow, id: number) {
  const rows = await getDatabase().delete(pages)
    .where(and(eq(pages.id, id), eq(pages.tenantId, tenant.id))).returning({ id: pages.id });
  if (rows.length === 0) throw notFound("PAGE_NOT_FOUND");
}
