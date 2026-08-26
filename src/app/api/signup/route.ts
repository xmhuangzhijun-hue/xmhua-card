import { NextResponse } from "next/server";
import { selfServiceTenantSchema } from "@/lib/admin-schema";
import { createSelfServiceTenant, DatabaseRequiredError } from "@/server/admin-repository";
import { readJsonBody, RequestBodyTooLargeError } from "@/server/request-body";
import { enforceSignupRateLimit, requireSignupInvite } from "@/server/signup-guard";

export async function POST(request: Request) {
  try {
    enforceSignupRateLimit(request);
    const input = selfServiceTenantSchema.parse(await readJsonBody(request, 4096));
    requireSignupInvite(input.inviteCode);
    return NextResponse.json({ data: await createSelfServiceTenant(input) }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
    if (error instanceof Error && error.message === "SIGNUP_RATE_LIMITED") return NextResponse.json({ error: "SIGNUP_RATE_LIMITED" }, { status: 429 });
    if (error instanceof Error && error.message === "SIGNUP_INVITE_NOT_CONFIGURED") return NextResponse.json({ error: "SIGNUP_INVITE_NOT_CONFIGURED" }, { status: 503 });
    if (error instanceof Error && error.message === "INVALID_INVITE_CODE") return NextResponse.json({ error: "INVALID_INVITE_CODE" }, { status: 403 });
    if (error instanceof DatabaseRequiredError) return NextResponse.json({ error: "DATABASE_REQUIRED" }, { status: 503 });
    if (error instanceof Error && error.message === "SIGNUP_DISABLED") return NextResponse.json({ error: "SIGNUP_DISABLED" }, { status: 503 });
    if (error instanceof Error && error.message === "TENANT_EXISTS") return NextResponse.json({ error: "TENANT_EXISTS" }, { status: 409 });
    if (error instanceof Error && error.message === "TENANT_QUOTA_EXCEEDED") return NextResponse.json({ error: "TENANT_QUOTA_EXCEEDED" }, { status: 429 });
    console.error("Self-service tenant creation failed", error);
    return NextResponse.json({ error: "INVALID_SIGNUP" }, { status: 400 });
  }
}
