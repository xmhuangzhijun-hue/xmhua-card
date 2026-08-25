import { NextResponse } from "next/server";
import { getHomepageContent } from "@/server/content-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, source } = await getHomepageContent();
    return NextResponse.json(
      { data, meta: { source } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Failed to load homepage content", error);
    return NextResponse.json({ error: "CONTENT_UNAVAILABLE" }, { status: 503 });
  }
}

