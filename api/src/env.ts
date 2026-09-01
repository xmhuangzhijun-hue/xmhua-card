function optional(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function integer(name: string, fallback: number) {
  const raw = optional(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

export const env = {
  port: integer("API_PORT", 39300),
  host: optional("API_HOST") ?? "127.0.0.1",
  databaseUrl: optional("DATABASE_URL"),
  /** Connection pool size. The local PGlite dev socket accepts a single connection. */
  databasePoolMax: integer("DB_POOL_MAX", 8),
  defaultTenant: optional("DEFAULT_TENANT_SLUG") ?? "xmhua",
  /** Legacy machine credential. Kept so scripts and CI keep working next to cookie sessions. */
  adminApiKey: optional("ADMIN_API_KEY"),
  sessionTtlHours: integer("ADMIN_SESSION_TTL_HOURS", 24 * 14),
  /** Origins allowed to send credentialed browser requests. Same-origin deploys need none. */
  corsOrigins: (optional("CORS_ALLOWED_ORIGIN") ?? "").split(",").map(value => value.trim()).filter(Boolean),
  /** Where uploaded images live. Must outlive releases, so never inside a release dir. */
  uploadDir: optional("UPLOAD_DIR") ?? "./uploads",
  /**
   * Public URL prefix for stored images. It sits under /api on purpose: the web
   * server already routes /api to this service, so serving media needs no extra
   * vhost rule and behaves identically in development and production.
   */
  uploadPublicPath: (optional("UPLOAD_PUBLIC_PATH") ?? "/api/media").replace(/\/$/, ""),
  /** Cookies are only marked Secure when the site is actually served over HTTPS. */
  secureCookies: (optional("ADMIN_COOKIE_SECURE") ?? "true") !== "false",
  isProduction: process.env.NODE_ENV === "production",
};

export function requireDatabaseUrl() {
  if (!env.databaseUrl) throw new Error("DATABASE_URL is required. The API never falls back to static content.");
  return env.databaseUrl;
}
