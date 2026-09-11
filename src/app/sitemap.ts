import type { MetadataRoute } from "next";
import { getSiteContent } from "@/lib/api-client";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const content = await getSiteContent();
  const reserved = new Set(["admin", "api", "internal", "preview"]);
  const paths = new Set([
    "/", "/notes", "/work",
    ...content.pages.filter(page => !reserved.has(page.slug)).map(page => `/${encodeURIComponent(page.slug)}`),
    ...content.articles.filter(article => article.published).map(article => `/notes/${encodeURIComponent(article.slug)}`),
  ]);
  // The API exposes publication dates, not modification dates; do not invent lastmod.
  return [...paths].map(path => ({ url: absoluteUrl(path) }));
}
