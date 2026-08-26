import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export function requireAdmin(request: Request): NextResponse | null {
  if (isAdminCredential(request)) return null;
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return NextResponse.json({ error: "ADMIN_NOT_CONFIGURED" }, { status: 503 });
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

export function isAdminCredential(request: Request) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return false;
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function hashTenantToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string, expectedHash: string | null) {
  if (!expectedHash) return false;
  const supplied = Buffer.from(hashTenantToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
