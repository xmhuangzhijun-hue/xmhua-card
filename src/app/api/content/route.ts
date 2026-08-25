import { NextResponse } from "next/server";
import { getHomepageContent } from "@/server/content-repository";
import { tenantSlugValueSchema } from "@/lib/admin-schema";
import { defaultTenantSlug } from "@/server/content-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const value = new URL(request.url).searchParams.get("tenant") ?? defaultTenantSlug;
    const tenant = tenantSlugValueSchema.parse(value);
    const { data, source } = await getHomepageContent(tenant);
    return NextResponse.json(
      { data, meta: { source, tenant } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Failed to load homepage content", error);
    return NextResponse.json({ error: "CONTENT_UNAVAILABLE" }, { status: 503 });
  }
}
