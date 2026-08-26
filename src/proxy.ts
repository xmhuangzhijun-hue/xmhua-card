import { NextResponse, type NextRequest } from "next/server";

const apiVersion = "1.0.0";

function applyApiHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set("X-API-Version", apiVersion);
  const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN?.trim();
  const requestOrigin = request.headers.get("origin");
  if (allowedOrigin && requestOrigin === allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Vary", "Origin");
  }
  return response;
}

export function proxy(request: NextRequest) {
  const response = request.method === "OPTIONS"
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next();
  return applyApiHeaders(response, request);
}

export const config = { matcher: "/api/:path*" };
