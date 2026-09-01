import { createHash, timingSafeEqual } from "node:crypto";
import { ApiError } from "./http.js";

type WindowState = { count: number; resetAt: number };
const windows = new Map<string, WindowState>();

function positiveInteger(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

/**
 * Proxy headers are only trusted when explicitly enabled. Otherwise every caller
 * shares one bucket, which is stricter rather than spoofable.
 */
function requestKey(forwardedFor: string | undefined) {
  if (process.env.TRUST_PROXY_HEADERS !== "true") return "global";
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export function enforceSignupRateLimit(forwardedFor: string | undefined) {
  const limit = positiveInteger(process.env.SIGNUP_RATE_LIMIT, 5, 100);
  const windowMs = positiveInteger(process.env.SIGNUP_RATE_WINDOW_SECONDS, 900, 86400) * 1000;
  const key = createHash("sha256").update(requestKey(forwardedFor)).digest("hex");
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    if (windows.size > 10_000) {
      for (const [storedKey, state] of windows) if (state.resetAt <= now) windows.delete(storedKey);
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) throw new ApiError(429, "SIGNUP_RATE_LIMITED");
  current.count += 1;
}

export function requireSignupInvite(supplied: string) {
  const expected = process.env.SIGNUP_INVITE_CODE;
  if (!expected) throw new ApiError(503, "SIGNUP_INVITE_NOT_CONFIGURED");
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  if (!timingSafeEqual(expectedHash, suppliedHash)) throw new ApiError(403, "INVALID_INVITE_CODE");
}

/**
 * Invite verification runs before the quota is consumed, so a wrong code cannot
 * exhaust the shared signup budget.
 */
export function enforceValidSignupAttempt(forwardedFor: string | undefined, suppliedInvite: string) {
  requireSignupInvite(suppliedInvite);
  enforceSignupRateLimit(forwardedFor);
}
