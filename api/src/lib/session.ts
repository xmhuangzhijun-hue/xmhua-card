import { createHash, randomBytes } from "node:crypto";
import { env } from "../env.js";

export const sessionCookieName = "xmhua_admin_session";

export function createSessionToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashSessionToken(token) };
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiry() {
  return new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);
}

export function buildSessionCookie(token: string, expiresAt: Date) {
  return serializeCookie(token, { expires: expiresAt });
}

export function buildClearedSessionCookie() {
  return serializeCookie("", { expires: new Date(0) });
}

function serializeCookie(value: string, options: { expires: Date }) {
  const parts = [
    `${sessionCookieName}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${options.expires.toUTCString()}`,
  ];
  if (env.secureCookies) parts.push("Secure");
  return parts.join("; ");
}

export function readSessionToken(cookieHeader: string | undefined | null) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === sessionCookieName) {
      const value = rest.join("=");
      return value ? value : null;
    }
  }
  return null;
}
