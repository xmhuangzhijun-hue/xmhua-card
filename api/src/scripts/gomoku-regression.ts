/** Real Hono routes and PostgreSQL rules, using the already bundled in-memory PGlite. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
import { gomokuRooms, type GomokuColor } from "../db/schema.js";
import { ApiError } from "../lib/http.js";
import type { GomokuRoom } from "../services/gomoku.js";

// Never read or mutate a developer's configured database.
process.env.DATABASE_URL = "pglite:memory://";
const { connectDatabase, closeDatabase } = await import("../db/client.js");
const { gomokuRoutes } = await import("../routes/gomoku.js");
const { createGomokuRoom, joinGomokuRoom, moveGomoku, readGomokuRoom, rematchGomoku, resignGomoku } = await import("../services/gomoku.js");
const db = await connectDatabase();
const app = new Hono();
app.route("/api/gomoku", gomokuRoutes);
app.onError((error, context) => {
  if (error instanceof ApiError) return context.json({ error: error.code, detail: error.detail }, error.status as 400);
  throw error;
});

async function expectError(promise: Promise<unknown>, code: string, status?: number) {
  await assert.rejects(promise, error => error instanceof ApiError && error.code === code && (status === undefined || error.status === status));
}

async function request(path: string, method = "GET", body?: unknown, token?: string) {
  return app.request(`/api/gomoku${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function pairedRoom() {
  const black = await createGomokuRoom("黑方");
  const white = await joinGomokuRoom(black.room.code, "白方");
  return { room: white.room, blackToken: black.token, whiteToken: white.token };
}

try {
  await migrate(db as never, { migrationsFolder: resolve(import.meta.dirname, "../../drizzle") });
  const createResponse = await request("/rooms", "POST", { name: " 棋手甲 " });
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.headers.get("cache-control"), "no-store");
  const created = await createResponse.json() as { room: GomokuRoom; token: string };
  assert.match(created.room.code, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.match(created.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(created.room.players.black.name, "棋手甲");
  assert.equal(created.room.board.length, 225);
  assert.equal(created.room.you, 1);
  assert.equal(created.room.status, "waiting");
  const [stored] = await db.select().from(gomokuRooms).where(eq(gomokuRooms.code, created.room.code));
  assert.ok(stored && !JSON.stringify(stored).includes(created.token), "raw seat token must never be stored");
  await expectError(moveGomoku(created.room.code, created.token, { row: 0, column: 0, version: created.room.version }), "ROOM_NOT_PLAYING");
  await expectError(rematchGomoku(created.room.code, created.token), "ROOM_NOT_FINISHED");
  const duplicateHostJoin = await request(`/rooms/${created.room.code}/join`, "POST", { name: "重复加入" }, created.token);
  const sameHost = await duplicateHostJoin.json() as { room: GomokuRoom; token: string };
  assert.equal(sameHost.room.you, 1);
  assert.equal(sameHost.room.players.white, null, "host retry cannot occupy the second seat");
  assert.equal(sameHost.room.version, created.room.version);

  const joinResponse = await request(`/rooms/${created.room.code}/join`, "POST", { name: "棋手乙" });
  assert.equal(joinResponse.status, 200);
  const joined = await joinResponse.json() as { room: GomokuRoom; token: string };
  assert.equal(joined.room.you, 2);
  assert.equal(joined.room.version, created.room.version + 1);
  const third = await request(`/rooms/${created.room.code}/join`, "POST", { name: "第三人" });
  assert.equal(third.status, 409);
  assert.equal((await third.json() as { error: string }).error, "ROOM_FULL");
  const publicResponse = await request(`/rooms/${created.room.code}`);
  const publicSnapshot = await publicResponse.json() as { room: GomokuRoom };
  assert.equal(publicSnapshot.room.you, null);
  assert.ok(!JSON.stringify(publicSnapshot).includes("token"));
  const expiresBefore = joined.room.expiresAt;
  const resumed = await request(`/rooms/${created.room.code}`, "GET", undefined, created.token);
  const resumedRoom = (await resumed.json() as { room: GomokuRoom }).room;
  assert.equal(resumedRoom.you, 1, "refresh restores the same seat from the persisted room");
  assert.equal(resumedRoom.expiresAt, expiresBefore, "polling must not write or extend the room lifetime");
  assert.equal(resumedRoom.version, joined.room.version);
  const invalidToken = await request(`/rooms/${created.room.code}`, "GET", undefined, "A".repeat(43));
  assert.equal(invalidToken.status, 401);
  const unsignedMove = await request(`/rooms/${created.room.code}/moves`, "POST", { row: 7, column: 7, version: joined.room.version });
  assert.equal(unsignedMove.status, 401);
  const invalidMove = await request(`/rooms/${created.room.code}/moves`, "POST", { row: 15, column: 0, version: joined.room.version }, created.token);
  assert.equal(invalidMove.status, 400);
  assert.equal((await request("/rooms", "POST", { name: "x".repeat(1025) })).status, 413);

  const successfulMove = await request(`/rooms/${created.room.code}/moves`, "POST", { row: 7, column: 7, version: joined.room.version }, created.token);
  assert.equal(successfulMove.status, 200);
  let room = (await successfulMove.json() as { room: GomokuRoom }).room;
  assert.equal(room.board[112], 1);
  await expectError(moveGomoku(room.code, created.token, { row: 7, column: 8, version: room.version }), "NOT_YOUR_TURN");
  await expectError(moveGomoku(room.code, joined.token, { row: 7, column: 7, version: room.version }), "CELL_OCCUPIED");
  await expectError(moveGomoku(room.code, joined.token, { row: 7, column: 8, version: joined.room.version }), "STALE_VERSION");
  assert.equal((await readGomokuRoom(room.code, created.token)).board[112], 1);

  // Same-version simultaneous moves commit exactly once.
  const raced = await Promise.allSettled([
    moveGomoku(room.code, joined.token, { row: 0, column: 0, version: room.version }),
    moveGomoku(room.code, joined.token, { row: 0, column: 1, version: room.version }),
  ]);
  assert.equal(raced.filter(result => result.status === "fulfilled").length, 1);
  const rejected = raced.find(result => result.status === "rejected");
  assert.ok(rejected?.status === "rejected" && rejected.reason instanceof ApiError && rejected.reason.code === "STALE_VERSION");
  room = await readGomokuRoom(room.code, created.token);
  assert.equal(room.moveCount, 2);

  // Competing join requests cannot overwrite the winner's seat.
  const open = await createGomokuRoom("房主");
  const racingJoins = await Promise.allSettled([joinGomokuRoom(open.room.code, "客人甲"), joinGomokuRoom(open.room.code, "客人乙")]);
  assert.equal(racingJoins.filter(result => result.status === "fulfilled").length, 1);
  assert.ok(racingJoins.some(result => result.status === "rejected" && result.reason instanceof ApiError && result.reason.code === "ROOM_FULL"));

  for (const direction of [[0, 1], [1, 0], [1, 1], [1, -1]] as const) {
    const pair = await pairedRoom();
    let current = pair.room;
    for (let step = 0; step < 5; step += 1) {
      current = await moveGomoku(current.code, pair.blackToken, { row: 3 + direction[0] * step, column: 7 + direction[1] * step, version: current.version });
      if (step < 4) current = await moveGomoku(current.code, pair.whiteToken, { row: 14, column: step * 2, version: current.version });
    }
    assert.equal(current.status, "finished");
    assert.equal(current.winner, 1);
    assert.equal(current.winningLine.length, 5);
    await expectError(moveGomoku(current.code, pair.whiteToken, { row: 0, column: 0, version: current.version }), "ROOM_NOT_PLAYING");
  }

  // Bridging a gap produces an overline of six, which freestyle rules also win.
  const overline = await pairedRoom();
  let overlineRoom = overline.room;
  for (const [step, column] of [3, 4, 6, 7, 8].entries()) {
    overlineRoom = await moveGomoku(overlineRoom.code, overline.blackToken, { row: 5, column, version: overlineRoom.version });
    overlineRoom = await moveGomoku(overlineRoom.code, overline.whiteToken, { row: 14, column: step * 2, version: overlineRoom.version });
  }
  overlineRoom = await moveGomoku(overlineRoom.code, overline.blackToken, { row: 5, column: 5, version: overlineRoom.version });
  assert.equal(overlineRoom.winner, 1);
  assert.equal(overlineRoom.winningLine.length, 6);

  const finished = await resignGomoku(room.code, created.token);
  assert.equal(finished.winner, 2);
  const agreed = await rematchGomoku(room.code, created.token);
  assert.equal(agreed.status, "finished");
  assert.deepEqual(agreed.rematch, [1]);
  const repeated = await rematchGomoku(room.code, created.token);
  assert.equal(repeated.version, agreed.version, "repeated consent must be idempotent");
  const reset = await rematchGomoku(room.code, joined.token);
  assert.equal(reset.status, "playing");
  assert.equal(reset.round, 2);
  assert.equal(reset.you, 1, "rematch swaps token ownership with colors");
  assert.equal(reset.players.black.name, "棋手乙");
  assert.ok(reset.board.every(cell => cell === 0));
  assert.equal((await readGomokuRoom(room.code, created.token)).you, 2);
  assert.deepEqual(reset.rematch, []);

  // The browser can save its request identity before POST, then recover a lost response.
  const creatorRequestToken = randomBytes(32).toString("base64url");
  const lostCreation = await request("/rooms", "POST", { name: "网络房主", requestToken: creatorRequestToken });
  assert.equal(lostCreation.status, 201);
  await lostCreation.arrayBuffer(); // Deliberately discard the server-generated room response.
  const recoveredCreation = await request("/rooms", "POST", { name: "重试改名", requestToken: creatorRequestToken });
  assert.equal(recoveredCreation.status, 201);
  const recoveredHost = await recoveredCreation.json() as { room: GomokuRoom; token: string };
  assert.equal(recoveredHost.token, creatorRequestToken);
  assert.equal(recoveredHost.room.players.black.name, "网络房主", "recovery cannot rename the original player");
  assert.equal(recoveredHost.room.you, 1);
  assert.equal(recoveredHost.room.version, 1);
  assert.equal((await db.select().from(gomokuRooms)).filter(candidate => candidate.code === recoveredHost.room.code).length, 1);
  const [recoverableStored] = await db.select().from(gomokuRooms).where(eq(gomokuRooms.code, recoveredHost.room.code));
  assert.ok(recoverableStored && !JSON.stringify(recoverableStored).includes(creatorRequestToken));

  const joinRequestToken = randomBytes(32).toString("base64url");
  const lostJoining = await request(`/rooms/${recoveredHost.room.code}/join`, "POST", { name: "网络客人", requestToken: joinRequestToken });
  assert.equal(lostJoining.status, 200);
  await lostJoining.arrayBuffer(); // Seat is committed, but the browser never receives its response.
  const recoveredJoining = await request(`/rooms/${recoveredHost.room.code}/join`, "POST", { name: "重试改名", requestToken: joinRequestToken });
  assert.equal(recoveredJoining.status, 200);
  const recoveredGuest = await recoveredJoining.json() as { room: GomokuRoom; token: string };
  assert.equal(recoveredGuest.token, joinRequestToken);
  assert.equal(recoveredGuest.room.you, 2);
  assert.equal(recoveredGuest.room.version, 2, "joining recovery must not consume a second seat or mutate the room");
  assert.equal(recoveredGuest.room.players.white?.name, "网络客人");
  assert.equal((await readGomokuRoom(recoveredHost.room.code, creatorRequestToken)).you, 1);
  await expectError(joinGomokuRoom(recoveredHost.room.code, "抢位者", undefined, randomBytes(32).toString("base64url")), "ROOM_FULL");
  const joinedAgainAsHost = await joinGomokuRoom(recoveredHost.room.code, "房主重试", undefined, creatorRequestToken);
  assert.equal(joinedAgainAsHost.room.you, 1, "a request token already holding black cannot also occupy white");
  await resignGomoku(recoveredHost.room.code, creatorRequestToken);
  await rematchGomoku(recoveredHost.room.code, creatorRequestToken);
  const recoveredRematch = await rematchGomoku(recoveredHost.room.code, joinRequestToken);
  const creationAfterSwap = await createGomokuRoom("再次恢复", creatorRequestToken);
  assert.equal(creationAfterSwap.room.code, recoveredHost.room.code);
  assert.equal(creationAfterSwap.room.you, 2, "stable creation identity survives rematch color swaps");
  assert.equal(creationAfterSwap.room.version, recoveredRematch.version);
  const joiningAfterSwap = await joinGomokuRoom(recoveredHost.room.code, "再次恢复", undefined, joinRequestToken);
  assert.equal(joiningAfterSwap.room.you, 1);

  const concurrentCreateToken = randomBytes(32).toString("base64url");
  const simultaneousCreations = await Promise.all([
    createGomokuRoom("并发创建甲", concurrentCreateToken),
    createGomokuRoom("并发创建乙", concurrentCreateToken),
  ]);
  assert.equal(simultaneousCreations[0]!.room.code, simultaneousCreations[1]!.room.code);
  assert.equal(simultaneousCreations[0]!.token, simultaneousCreations[1]!.token);
  const concurrentJoinToken = randomBytes(32).toString("base64url");
  const concurrentRoomCode = simultaneousCreations[0]!.room.code;
  const simultaneousJoins = await Promise.all([
    joinGomokuRoom(concurrentRoomCode, "并发加入甲", undefined, concurrentJoinToken),
    joinGomokuRoom(concurrentRoomCode, "并发加入乙", undefined, concurrentJoinToken),
  ]);
  assert.ok(simultaneousJoins.every(result => result.room.you === 2 && result.room.version === 2 && result.token === concurrentJoinToken));
  assert.equal(simultaneousJoins[0]!.room.players.white?.name, simultaneousJoins[1]!.room.players.white?.name);
  await expectError(createGomokuRoom("无效凭证", "short"), "INVALID_REQUEST_TOKEN", 400);
  assert.equal((await request("/rooms", "POST", { name: "无效凭证", requestToken: "short" })).status, 400);

  // Near-full, non-winning board exercises the only remaining draw condition.
  const draw = await pairedRoom();
  const board = Array.from({ length: 225 }, (_, index): 0 | GomokuColor => (Math.floor(index / 15) + 2 * (index % 15)) % 4 < 2 ? 1 : 2);
  board[224] = 0;
  await db.update(gomokuRooms).set({ state: { ...draw.room, board, moveCount: 224, turn: 2 } }).where(eq(gomokuRooms.code, draw.room.code));
  const drawn = await moveGomoku(draw.room.code, draw.whiteToken, { row: 14, column: 14, version: draw.room.version });
  assert.equal(drawn.status, "finished");
  assert.equal(drawn.winner, 0);

  const expired = await createGomokuRoom("过期房间");
  await db.update(gomokuRooms).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(gomokuRooms.code, expired.room.code));
  await expectError(readGomokuRoom(expired.room.code), "ROOM_EXPIRED", 410);
  await expectError(joinGomokuRoom(expired.room.code, "迟到者"), "ROOM_EXPIRED", 410);
  await createGomokuRoom("清理触发者");
  assert.equal((await db.select().from(gomokuRooms).where(eq(gomokuRooms.code, expired.room.code))).length, 0);

  // Basic unauthenticated creation abuse is bounded before any database insert.
  let limited = await request("/rooms", "POST", { name: "限流测试" });
  for (let attempt = 0; attempt < 10 && limited.status === 201; attempt += 1) limited = await request("/rooms", "POST", { name: "限流测试" });
  assert.equal(limited.status, 429);
  assert.equal((await limited.json() as { error: string }).error, "ROOM_RATE_LIMITED");
  console.log("gomoku PostgreSQL + HTTP regressions passed (rules, races, lost-response recovery, tokens, rematch, expiry, body limit, creation quota)");
} finally {
  await closeDatabase();
}
