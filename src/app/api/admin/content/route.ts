import { NextResponse } from "next/server";
import { tenantSlugValueSchema } from "@/lib/admin-schema";
import { homepageContentSchema } from "@/lib/content-schema";
import { requireAdmin } from "@/server/admin-auth";
import { DatabaseRequiredError, readTenantContent, TenantNotFoundError, writeTenantContent } from "@/server/admin-repository";

export const dynamic = "force-dynamic";

function tenantFrom(request: Request) { return tenantSlugValueSchema.parse(new URL(request.url).searchParams.get("tenant")); }

export async function GET(request: Request) {
  const denied = requireAdmin(request); if (denied) return denied;
  try { const tenant = tenantFrom(request); const result = await readTenantContent(tenant); return NextResponse.json({ data: result.data, meta: { tenant } }); }
  catch (error) { return adminError(error); }
}

export async function PUT(request: Request) {
  const denied = requireAdmin(request); if (denied) return denied;
  try {
    const tenant = tenantFrom(request);
    const content = homepageContentSchema.parse(await request.json());
    const result = await writeTenantContent(tenant, content);
    return NextResponse.json({ data: result.data, meta: { tenant, saved: true } });
  } catch (error) { return adminError(error); }
}

function adminError(error: unknown) {
  if (error instanceof DatabaseRequiredError) return NextResponse.json({ error: "DATABASE_REQUIRED" }, { status: 503 });
  if (error instanceof TenantNotFoundError) return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });
  console.error("Content administration failed", error);
  return NextResponse.json({ error: "INVALID_ADMIN_CONTENT" }, { status: 400 });
}
