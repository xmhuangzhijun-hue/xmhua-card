import { Hono } from "hono";
import { getArticleBySlug, getPageBySlug, getPublicContent } from "../services/content.js";
import { requireTenant } from "../services/tenant.js";

export const publicRoutes = new Hono();

const cacheHeaders = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

publicRoutes.get("/content", async context => {
  const tenant = await requireTenant(context.req.query("tenant"));
  const data = await getPublicContent(tenant);
  return context.json({ data, meta: { source: "postgresql", tenant: tenant.slug } }, 200, cacheHeaders);
});

publicRoutes.get("/notes", async context => {
  const tenant = await requireTenant(context.req.query("tenant"));
  const { articles } = await getPublicContent(tenant);
  const data = articles.map(({ body, ...summary }) => ({ ...summary, readingMinutes: readingMinutes(body) }));
  return context.json({ data, meta: { tenant: tenant.slug } }, 200, cacheHeaders);
});

publicRoutes.get("/notes/:slug", async context => {
  const tenant = await requireTenant(context.req.query("tenant"));
  const article = await getArticleBySlug(tenant, context.req.param("slug"));
  return context.json({
    data: {
      id: article.id,
      category: article.category,
      title: article.title,
      excerpt: article.excerpt,
      publishedAt: article.publishedAt,
      slug: article.slug,
      body: article.body,
      href: `/notes/${article.slug}`,
      readingMinutes: readingMinutes(article.body),
    },
    meta: { tenant: tenant.slug },
  }, 200, cacheHeaders);
});

publicRoutes.get("/pages/:slug", async context => {
  const tenant = await requireTenant(context.req.query("tenant"));
  const page = await getPageBySlug(tenant, context.req.param("slug"));
  return context.json({
    data: { slug: page.slug, title: page.title, description: page.description, body: page.body },
    meta: { tenant: tenant.slug },
  }, 200, cacheHeaders);
});

/** CJK text has no spaces, so characters are a better length signal than words. */
function readingMinutes(body: string) {
  const characters = body.replace(/\s+/g, "").length;
  return Math.max(1, Math.round(characters / 400));
}
