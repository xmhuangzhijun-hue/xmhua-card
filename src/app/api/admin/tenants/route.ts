import { NextResponse } from "next/server";
import { createTenantSchema } from "@/lib/admin-schema";
import { requireAdmin } from "@/server/admin-auth";
import { readJsonBody, RequestBodyTooLargeError } from "@/server/request-body";
import { createTenant, DatabaseRequiredError, listTenants } from "@/server/admin-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = requireAdmin(request); if (denied) return denied;
  try { return NextResponse.json({ data: await listTenants() }); }
  catch (error) { return adminError(error); }
}

export async function POST(request: Request) {
  const denied = requireAdmin(request); if (denied) return denied;
  try {
    const input = createTenantSchema.parse(await readJsonBody(request, 524_288));
    return NextResponse.json({ data: await createTenant(input) }, { status: 201 });
  } catch (error) { return adminError(error); }
}

function adminError(error: unknown) {
  if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
  if (error instanceof DatabaseRequiredError) return NextResponse.json({ error: "DATABASE_REQUIRED" }, { status: 503 });
  if (error instanceof Error && error.message === "TENANT_EXISTS") return NextResponse.json({ error: "TENANT_EXISTS" }, { status: 409 });
  console.error("Tenant administration failed", error);
  return NextResponse.json({ error: "ADMIN_REQUEST_FAILED" }, { status: 400 });
}
