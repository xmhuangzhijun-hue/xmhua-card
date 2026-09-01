import { timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { env } from "../env.js";
import { unauthorized } from "../lib/http.js";
import { readSessionToken } from "../lib/session.js";
import { resolveSession, type AdminIdentity } from "../services/auth.js";

declare module "hono" {
  interface ContextVariableMap {
    identity: AdminIdentity;
  }
}

/**
 * Accepts either a console session cookie or the legacy machine key.
 * The cookie is what the admin UI uses; the key keeps CI and scripts working.
 */
export const requireAdmin: MiddlewareHandler = async (context, next) => {
  const token = readSessionToken(context.req.header("cookie"));
  if (token) {
    const identity = await resolveSession(token);
    if (identity) {
      context.set("identity", identity);
      return next();
    }
  }
  if (matchesApiKey(context.req.header("authorization"))) {
    context.set("identity", { kind: "api-key", userId: null, username: "api-key", tenantId: null });
    return next();
  }
  throw unauthorized();
};

function matchesApiKey(authorization: string | undefined) {
  const expected = env.adminApiKey;
  if (!expected) return false;
  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}
