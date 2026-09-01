import type { Context } from "hono";
import { z } from "zod";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly detail?: unknown) {
    super(code);
  }
}

export const badRequest = (code = "BAD_REQUEST", detail?: unknown) => new ApiError(400, code, detail);
export const unauthorized = (code = "UNAUTHORIZED") => new ApiError(401, code);
export const notFound = (code = "NOT_FOUND") => new ApiError(404, code);
export const conflict = (code = "CONFLICT", detail?: unknown) => new ApiError(409, code, detail);

export async function parseBody<T extends z.ZodType>(context: Context, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await context.req.json();
  } catch {
    throw badRequest("INVALID_JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw badRequest("INVALID_BODY", z.treeifyError(result.error));
  return result.data;
}

export function parseId(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0) throw badRequest("INVALID_ID");
  return parsed;
}
