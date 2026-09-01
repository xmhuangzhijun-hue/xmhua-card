/**
 * The only place the frontend talks to the backend.
 *
 * The frontend holds no database driver and no credentials: every read goes over
 * HTTP to the content API. Server rendering uses the internal base URL (loopback
 * on the deployment host); browser code uses the public one, which is normally a
 * same-origin path so the session cookie applies.
 */
import type { ArticleDetail, PageDetail, SiteContent } from "./content-types";

const publicBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/$/, "");
const internalBase = (process.env.API_INTERNAL_BASE_URL ?? "").trim().replace(/\/$/, "");

/** Browser-side URL builder. Relative by default so cookies stay same-origin. */
export function apiUrl(path: string) {
  if (!path.startsWith("/")) throw new Error("API path must start with a slash");
  return publicBase ? `${publicBase}${path}` : path;
}

/** Server-side URL builder. Falls back to the public base when no internal host is set. */
function serverApiUrl(path: string) {
  const base = internalBase || publicBase;
  if (!base) throw new Error("API_INTERNAL_BASE_URL or NEXT_PUBLIC_API_BASE_URL must be set for server rendering");
  return `${base}${path}`;
}

export class ContentUnavailableError extends Error {
  constructor(readonly status: number) {
    super(`content API responded ${status}`);
  }
}

async function getJson<T>(path: string, revalidate: number): Promise<T> {
  const response = await fetch(serverApiUrl(path), {
    headers: { Accept: "application/json" },
    next: { revalidate },
  });
  if (!response.ok) throw new ContentUnavailableError(response.status);
  const payload = (await response.json()) as { data: T };
  return payload.data;
}

const tenantQuery = (tenant?: string) => (tenant ? `?tenant=${encodeURIComponent(tenant)}` : "");

export const getSiteContent = (tenant?: string) =>
  getJson<SiteContent>(`/api/content${tenantQuery(tenant)}`, 60);

export const getArticle = (slug: string, tenant?: string) =>
  getJson<ArticleDetail>(`/api/notes/${encodeURIComponent(slug)}${tenantQuery(tenant)}`, 60);

export const getPage = (slug: string, tenant?: string) =>
  getJson<PageDetail>(`/api/pages/${encodeURIComponent(slug)}${tenantQuery(tenant)}`, 300);
