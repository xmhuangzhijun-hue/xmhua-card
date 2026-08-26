import { NextResponse } from "next/server";
import { tenantSlugValueSchema } from "@/lib/admin-schema";
import { homepageContentSchema } from "@/lib/content-schema";
import { isAdminCredential } from "@/server/admin-auth";
import { readJsonBody, RequestBodyTooLargeError } from "@/server/request-body";
import { DatabaseRequiredError, readTenantContent, requireTenantOwner, TenantNotFoundError, writeTenantContent } from "@/server/admin-repository";

function credentials(request: Request) {
  const slug = tenantSlugValueSchema.parse(new URL(request.url).searchParams.get("tenant"));
  const authorization = request.headers.get("authorization") ?? "";
  return { slug, token: authorization.startsWith("Bearer ") ? authorization.slice(7) : "" };
}

export async function GET(request: Request) {
  try {
    const { slug, token } = credentials(request);
    if (!isAdminCredential(request)) await requireTenantOwner(slug, token);
    const result = await readTenantContent(slug);
    return NextResponse.json({ data: result.data, meta: { tenant: slug } });
  } catch (error) { return studioError(error); }
}

export async function PUT(request: Request) {
  try {
    const { slug, token } = credentials(request);
    if (!isAdminCredential(request)) await requireTenantOwner(slug, token);
    const content = homepageContentSchema.parse(await readJsonBody(request, 524_288));
    const result = await writeTenantContent(slug, content);
    return NextResponse.json({ data: result.data, meta: { tenant: slug, saved: true } });
  } catch (error) { return studioError(error); }
}

function studioError(error: unknown) {
  if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
  if (error instanceof DatabaseRequiredError) return NextResponse.json({ error: "DATABASE_REQUIRED" }, { status: 503 });
  if (error instanceof TenantNotFoundError) return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });
  if (error instanceof Error && error.message === "TENANT_UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  console.error("Tenant studio request failed", error);
  return NextResponse.json({ error: "INVALID_STUDIO_REQUEST" }, { status: 400 });
}
