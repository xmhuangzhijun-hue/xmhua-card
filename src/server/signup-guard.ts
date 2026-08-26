import { createHash, timingSafeEqual } from "node:crypto";

type WindowState = { count: number; resetAt: number };
const windows = new Map<string, WindowState>();
const MAX_WINDOWS = 10_000;

function positiveInteger(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function requestKey(request: Request) {
  if (process.env.TRUST_PROXY_HEADERS !== "true") return "global";
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

function enforceRateLimit(request: Request, bucket: string, limit: number) {
  const windowMs = positiveInteger(process.env.SIGNUP_RATE_WINDOW_SECONDS, 900, 86400) * 1000;
  const key = createHash("sha256").update(`${bucket}:${requestKey(request)}`).digest("hex");
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    if (windows.size >= MAX_WINDOWS) {
      for (const [storedKey, state] of windows) if (state.resetAt <= now) windows.delete(storedKey);
      while (windows.size >= MAX_WINDOWS) {
        const oldestKey = windows.keys().next().value;
        if (oldestKey === undefined) break;
        windows.delete(oldestKey);
      }
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) throw new Error("SIGNUP_RATE_LIMITED");
  current.count += 1;
}

export function enforceSignupRateLimit(request: Request) {
  enforceRateLimit(request, "creation", positiveInteger(process.env.SIGNUP_RATE_LIMIT, 5, 100));
}

export function requireSignupInvite(supplied: string) {
  const expected = process.env.SIGNUP_INVITE_CODE;
  if (!expected) throw new Error("SIGNUP_INVITE_NOT_CONFIGURED");
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  if (!timingSafeEqual(expectedHash, suppliedHash)) throw new Error("INVALID_INVITE_CODE");
}

export function enforceValidSignupAttempt(request: Request, suppliedInvite: string) {
  try {
    requireSignupInvite(suppliedInvite);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_INVITE_CODE") {
      enforceRateLimit(request, "invalid-invite", positiveInteger(process.env.SIGNUP_INVALID_INVITE_RATE_LIMIT, 20, 1000));
    }
    throw error;
  }
  enforceSignupRateLimit(request);
}
