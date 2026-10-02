import { getConnInfo } from "@hono/node-server/conninfo";
import { createHash } from "node:crypto";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { ApiError } from "../lib/http.js";
import { createGomokuRoom, joinGomokuRoom, moveGomoku, readGomokuRoom, rematchGomoku, resignGomoku } from "../services/gomoku.js";

export const gomokuRoutes = new Hono();
const playerSchema = z.object({
  name: z.string().trim().min(1).max(24),
  requestToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
}).strict();
const moveSchema = z.object({ row: z.number().int().min(0).max(14), column: z.number().int().min(0).max(14), version: z.number().int().min(1) }).strict();
const createWindows = new Map<string, { count: number; resetAt: number }>();
let globalWindow = { count: 0, resetAt: 0 };

async function gameBody<T extends z.ZodType>(context: Context, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try { raw = await context.req.json(); }
  catch { throw new ApiError(400, "INVALID_JSON", "请求内容需要是有效 JSON。"); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ApiError(400, "INVALID_BODY", "昵称需为 1 至 24 个字符，落子坐标需在棋盘内且带当前版本。");
  return parsed.data;
}

function seatToken(context: Context, required = false) {
  const header = context.req.header("authorization");
  if (!header) {
    if (required) throw new ApiError(401, "TOKEN_REQUIRED", "请先加入房间。");
    return undefined;
  }
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(header);
  if (!match) throw new ApiError(401, "INVALID_TOKEN", "这个房间的身份凭证无效。");
  return match[1];
}

function enforceCreateLimit(context: Context) {
  let caller = "unknown";
  // Forwarded identities are trusted only under the existing explicit proxy setting.
  // Nginx proxy_add_x_forwarded_for appends the actual peer after any client input.
  if (process.env.TRUST_PROXY_HEADERS === "true") caller = context.req.header("x-forwarded-for")?.split(",").at(-1)?.trim() || caller;
  else if (context.env?.incoming) caller = getConnInfo(context).remote.address || caller;
  const now = Date.now();
  if (globalWindow.resetAt <= now) globalWindow = { count: 0, resetAt: now + 10 * 60_000 };
  for (const [key, bucket] of createWindows) if (bucket.resetAt <= now) createWindows.delete(key);
  const key = createHash("sha256").update(caller).digest("hex");
  const bucket = createWindows.get(key) ?? { count: 0, resetAt: now + 10 * 60_000 };
  if (globalWindow.count >= 120 || bucket.count >= 10 || (!createWindows.has(key) && createWindows.size >= 10_000)) {
    throw new ApiError(429, "ROOM_RATE_LIMITED", "创建房间太频繁，请稍后再试。");
  }
  globalWindow.count += 1;
  bucket.count += 1;
  createWindows.set(key, bucket);
}

gomokuRoutes.use("*", bodyLimit({ maxSize: 1024, onError: context => context.json({ error: "BODY_TOO_LARGE", detail: "请求内容过大。" }, 413) }));
gomokuRoutes.use("*", async (context, next) => {
  context.header("Cache-Control", "no-store");
  context.header("Referrer-Policy", "no-referrer");
  await next();
});

gomokuRoutes.post("/rooms", async context => {
  const { name, requestToken } = await gameBody(context, playerSchema);
  enforceCreateLimit(context);
  return context.json(await createGomokuRoom(name, requestToken), 201);
});
gomokuRoutes.post("/rooms/:code/join", async context => {
  const { name, requestToken } = await gameBody(context, playerSchema);
  return context.json(await joinGomokuRoom(context.req.param("code"), name, seatToken(context), requestToken));
});
gomokuRoutes.get("/rooms/:code", async context => context.json({ room: await readGomokuRoom(context.req.param("code"), seatToken(context)) }));
gomokuRoutes.post("/rooms/:code/moves", async context => {
  const token = seatToken(context, true);
  const input = await gameBody(context, moveSchema);
  return context.json({ room: await moveGomoku(context.req.param("code"), token, input) });
});
gomokuRoutes.post("/rooms/:code/resign", async context => context.json({ room: await resignGomoku(context.req.param("code"), seatToken(context, true)) }));
gomokuRoutes.post("/rooms/:code/rematch", async context => context.json({ room: await rematchGomoku(context.req.param("code"), seatToken(context, true)) }));
