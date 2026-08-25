import { NextResponse } from "next/server";
import { selfServiceTenantSchema } from "@/lib/admin-schema";
import { createSelfServiceTenant, DatabaseRequiredError } from "@/server/admin-repository";

export async function POST(request: Request) {
  try {
    const input = selfServiceTenantSchema.parse(await request.json());
    return NextResponse.json({ data: await createSelfServiceTenant(input) }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseRequiredError) return NextResponse.json({ error: "DATABASE_REQUIRED" }, { status: 503 });
    if (error instanceof Error && error.message === "SIGNUP_DISABLED") return NextResponse.json({ error: "SIGNUP_DISABLED" }, { status: 503 });
    if (error instanceof Error && error.message === "TENANT_EXISTS") return NextResponse.json({ error: "TENANT_EXISTS" }, { status: 409 });
    console.error("Self-service tenant creation failed", error);
    return NextResponse.json({ error: "INVALID_SIGNUP" }, { status: 400 });
  }
}
