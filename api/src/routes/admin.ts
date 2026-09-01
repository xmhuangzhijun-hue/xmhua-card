import { Hono, type Context } from "hono";

import {
  articleInputSchema,
  directoryLinkInputSchema,
  pageInputSchema,
  productInputSchema,
  reorderSchema,
  siteSettingsSchema,
  socialLinkInputSchema,
} from "../lib/content-schema.js";
import { badRequest, parseBody, parseId } from "../lib/http.js";
import { requireAdmin } from "../middleware/auth.js";
import * as collections from "../services/collections.js";
import { readSettings, writeSettings } from "../services/content.js";
import { listTenants, requireTenant, tenantSlugSchema, type TenantRow } from "../services/tenant.js";
import { createTenant } from "../services/provisioning.js";
import { deleteImage, listImages, storeImage } from "../lib/uploads.js";
import { z } from "zod";

export const adminRoutes = new Hono();

adminRoutes.use("*", requireAdmin);

const tenantOf = (context: Context) => requireTenant(context.req.query("tenant"));

adminRoutes.get("/tenants", async context => {
  const data = await listTenants();
  return context.json({
    data: data.map(({ id, slug, name, active, updatedAt }) => ({ id, slug, name, active, updatedAt })),
  });
});

const tenantCreateSchema = z.object({
  slug: tenantSlugSchema,
  name: z.string().min(1).max(120),
  seedContent: z.boolean().default(true),
});

adminRoutes.post("/tenants", async context => {
  const body = await parseBody(context, tenantCreateSchema);
  const tenant = await createTenant(body);
  return context.json({ data: { id: tenant.id, slug: tenant.slug, name: tenant.name } }, 201);
});

adminRoutes.get("/overview", async context => {
  const tenant = await tenantOf(context);
  const [articles, products, directory, socials, pages] = await Promise.all([
    collections.listArticles(tenant),
    collections.listProducts(tenant),
    collections.listDirectoryLinks(tenant),
    collections.listSocialLinks(tenant),
    collections.listPages(tenant),
  ]);
  const placeholder = (href: string) => !href.trim() || href.trim() === "#";
  return context.json({
    data: {
      tenant: { slug: tenant.slug, name: tenant.name },
      counts: {
        articles: articles.length,
        articlesPublished: articles.filter(row => row.published).length,
        products: products.length,
        directory: directory.length,
        socials: socials.length,
        pages: pages.length,
      },
      // Surfaced in the console so unfinished links are visible instead of shipping as dead links.
      unfinished: {
        emptyArticleBodies: articles.filter(row => row.body.trim().length < 200).map(row => row.title),
        placeholderProducts: products.filter(row => placeholder(row.href)).map(row => row.name),
        placeholderSocials: socials.filter(row => placeholder(row.href)).map(row => row.label),
        placeholderDirectory: directory.filter(row => placeholder(row.href)).map(row => row.title),
      },
    },
  });
});

adminRoutes.get("/uploads", async context => {
  return context.json({ data: await listImages() });
});

adminRoutes.post("/uploads", async context => {
  const body = await context.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) throw badRequest("FILE_REQUIRED");
  return context.json({ data: await storeImage(file) }, 201);
});

adminRoutes.delete("/uploads/:name", async context => {
  await deleteImage(context.req.param("name"));
  return context.json({ data: { ok: true } });
});

adminRoutes.get("/settings", async context => {
  const tenant = await tenantOf(context);
  return context.json({ data: await readSettings(tenant) });
});

adminRoutes.put("/settings", async context => {
  const tenant = await tenantOf(context);
  const body = await parseBody(context, siteSettingsSchema);
  return context.json({ data: await writeSettings(tenant, body) });
});

type CollectionHandlers<TInput> = {
  list: (tenant: TenantRow) => Promise<unknown[]>;
  create: (tenant: TenantRow, input: TInput) => Promise<unknown>;
  update: (tenant: TenantRow, id: number, input: TInput) => Promise<unknown>;
  remove: (tenant: TenantRow, id: number) => Promise<void>;
  reorder?: (tenant: TenantRow, ids: number[]) => Promise<void>;
};

function mountCollection<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  handlers: CollectionHandlers<z.infer<TSchema>>,
) {
  adminRoutes.get(path, async context => {
    const tenant = await tenantOf(context);
    return context.json({ data: await handlers.list(tenant) });
  });

  adminRoutes.post(path, async context => {
    const tenant = await tenantOf(context);
    const body = await parseBody(context, schema);
    return context.json({ data: await handlers.create(tenant, body) }, 201);
  });

  adminRoutes.put(`${path}/:id`, async context => {
    const tenant = await tenantOf(context);
    const body = await parseBody(context, schema);
    return context.json({ data: await handlers.update(tenant, parseId(context.req.param("id")), body) });
  });

  adminRoutes.delete(`${path}/:id`, async context => {
    const tenant = await tenantOf(context);
    await handlers.remove(tenant, parseId(context.req.param("id")));
    return context.json({ data: { ok: true } });
  });

  if (handlers.reorder) {
    const reorder = handlers.reorder;
    adminRoutes.post(`${path}/reorder`, async context => {
      const tenant = await tenantOf(context);
      const body = await parseBody(context, reorderSchema);
      await reorder(tenant, body.ids);
      return context.json({ data: await handlers.list(tenant) });
    });
  }
}

mountCollection("/articles", articleInputSchema, {
  list: collections.listArticles,
  create: collections.createArticle,
  update: collections.updateArticle,
  remove: collections.deleteArticle,
  reorder: collections.reorderArticles,
});

mountCollection("/products", productInputSchema, {
  list: collections.listProducts,
  create: collections.createProduct,
  update: collections.updateProduct,
  remove: collections.deleteProduct,
  reorder: collections.reorderProducts,
});

mountCollection("/directory-links", directoryLinkInputSchema, {
  list: collections.listDirectoryLinks,
  create: collections.createDirectoryLink,
  update: collections.updateDirectoryLink,
  remove: collections.deleteDirectoryLink,
  reorder: collections.reorderDirectoryLinks,
});

mountCollection("/social-links", socialLinkInputSchema, {
  list: collections.listSocialLinks,
  create: collections.createSocialLink,
  update: collections.updateSocialLink,
  remove: collections.deleteSocialLink,
  reorder: collections.reorderSocialLinks,
});

mountCollection("/pages", pageInputSchema, {
  list: collections.listPages,
  create: collections.createPage,
  update: collections.updatePage,
  remove: collections.deletePage,
});
