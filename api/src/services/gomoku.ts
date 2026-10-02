import { randomBytes, timingSafeEqual } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { getDatabase } from "../db/client.js";
import { gomokuRooms, type GomokuColor, type GomokuState } from "../db/schema.js";
import { ApiError } from "../lib/http.js";
import { createSessionToken, hashSessionToken } from "../lib/session.js";

const boardSize = 15;
const roomTtlMs = 24 * 60 * 60 * 1000;
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
type StoredRoom = typeof gomokuRooms.$inferSelect;
export type GomokuRoom = GomokuState & {
  code: string;
  version: number;
  expiresAt: string;
  you: GomokuColor | null;
};

function failure(status: number, code: string, detail: string): never {
  throw new ApiError(status, code, detail);
}

function validName(name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 24 || /[\u0000-\u001f\u007f]/u.test(trimmed)) {
    failure(400, "INVALID_NAME", "昵称需为 1 至 24 个字符。");
  }
  return trimmed;
}

function validCode(code: string) {
  const normalized = code.toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(normalized)) failure(404, "ROOM_NOT_FOUND", "找不到这个房间。");
  return normalized;
}

function assertLive(room: StoredRoom | undefined): asserts room is StoredRoom {
  if (!room) failure(404, "ROOM_NOT_FOUND", "找不到这个房间。");
  if (room.expiresAt.getTime() <= Date.now()) failure(410, "ROOM_EXPIRED", "房间已过期，请重新创建。");
}

function matchesToken(hash: string | null, suppliedHash: string) {
  return hash !== null && timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(suppliedHash, "hex"));
}

function requestIdentity(requestToken?: string) {
  if (requestToken === undefined) return createSessionToken();
  if (!/^[A-Za-z0-9_-]{43}$/.test(requestToken)) failure(400, "INVALID_REQUEST_TOKEN", "房间请求身份无效，请重新打开页面。");
  return { token: requestToken, tokenHash: hashSessionToken(requestToken) };
}

function resolveSeat(room: StoredRoom, token?: string): GomokuColor | null {
  if (token === undefined) return null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) failure(401, "INVALID_TOKEN", "这个房间的身份凭证无效。");
  const hash = hashSessionToken(token);
  if (matchesToken(room.blackTokenHash, hash)) return 1;
  if (matchesToken(room.whiteTokenHash, hash)) return 2;
  return failure(401, "INVALID_TOKEN", "这个房间的身份凭证无效。");
}

function requireSeat(room: StoredRoom, token: string | undefined) {
  const seat = resolveSeat(room, token);
  if (seat === null) return failure(401, "TOKEN_REQUIRED", "请先加入房间。");
  return seat;
}

function publicRoom(room: StoredRoom, token?: string): GomokuRoom {
  return {
    ...room.state,
    code: room.code,
    version: room.version,
    expiresAt: room.expiresAt.toISOString(),
    you: resolveSeat(room, token),
  };
}

function emptyState(black: { name: string }, white: { name: string } | null, round = 1): GomokuState {
  return {
    board: Array<0>(boardSize * boardSize).fill(0),
    players: { black, white },
    status: white ? "playing" : "waiting",
    turn: 1,
    winner: null,
    winningLine: [],
    moveCount: 0,
    lastMove: null,
    round,
    rematch: [],
  };
}

/** Freestyle Gomoku: a continuous line of five or more wins, including overlines. */
function winningLine(board: GomokuState["board"], row: number, column: number, color: GomokuColor) {
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]] as const) {
    const line = [row * boardSize + column];
    for (const direction of [-1, 1]) {
      let r = row + dr * direction;
      let c = column + dc * direction;
      while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r * boardSize + c] === color) {
        if (direction === -1) line.unshift(r * boardSize + c);
        else line.push(r * boardSize + c);
        r += dr * direction;
        c += dc * direction;
      }
    }
    if (line.length >= 5) return line;
  }
  return [];
}

export async function createGomokuRoom(name: string, requestToken?: string) {
  const playerName = validName(name);
  const { token, tokenHash } = requestIdentity(requestToken);
  const db = getDatabase();
  // Cleanup is tied to creation, never polling; expired rooms cannot accumulate forever.
  await db.delete(gomokuRooms).where(lt(gomokuRooms.expiresAt, new Date()));
  async function existingCreation() {
    const [existing] = await db.select().from(gomokuRooms).where(eq(gomokuRooms.creatorTokenHash, tokenHash)).limit(1);
    if (!existing) return null;
    assertLive(existing);
    return { room: publicRoom(existing, token), token };
  }
  const existing = await existingCreation();
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = [...randomBytes(8)].map(byte => codeAlphabet[byte & 31]).join("");
    const [room] = await db.insert(gomokuRooms).values({
      code,
      state: emptyState({ name: playerName }, null),
      creatorTokenHash: tokenHash,
      blackTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + roomTtlMs),
    }).onConflictDoNothing().returning();
    if (room) return { room: publicRoom(room, token), token };
    // A concurrent retry can win the unique creation identity before this insert.
    const racedCreation = await existingCreation();
    if (racedCreation) return racedCreation;
  }
  return failure(503, "ROOM_CREATION_FAILED", "暂时无法创建房间，请稍后再试。");
}

export async function readGomokuRoom(code: string, token?: string) {
  const [room] = await getDatabase().select().from(gomokuRooms).where(eq(gomokuRooms.code, validCode(code))).limit(1);
  assertLive(room);
  return publicRoom(room, token);
}

type RoomChange = Pick<StoredRoom, "state"> & Partial<Pick<StoredRoom, "blackTokenHash" | "whiteTokenHash">>;

/** Row locks serialize joining, moves and rematches across processes and API instances. */
async function changeRoom<T>(code: string, change: (room: StoredRoom) => { change: RoomChange | null; result: (saved: StoredRoom) => T }) {
  return getDatabase().transaction(async tx => {
    const [room] = await tx.select().from(gomokuRooms).where(eq(gomokuRooms.code, validCode(code))).for("update").limit(1);
    assertLive(room);
    const action = change(room);
    if (!action.change) return action.result(room);
    const [saved] = await tx.update(gomokuRooms).set({
      ...action.change,
      version: room.version + 1,
      expiresAt: new Date(Date.now() + roomTtlMs),
    }).where(eq(gomokuRooms.code, room.code)).returning();
    if (!saved) throw new Error("Locked Gomoku room disappeared");
    return action.result(saved);
  });
}

export async function joinGomokuRoom(code: string, name: string, existingToken?: string, requestToken?: string) {
  const playerName = validName(name);
  const { token, tokenHash } = requestIdentity(requestToken);
  return changeRoom(code, room => {
    if (existingToken !== undefined) {
      requireSeat(room, existingToken);
      return { change: null, result: saved => ({ room: publicRoom(saved, existingToken), token: existingToken }) };
    }
    if (matchesToken(room.blackTokenHash, tokenHash) || matchesToken(room.whiteTokenHash, tokenHash)) {
      return { change: null, result: saved => ({ room: publicRoom(saved, token), token }) };
    }
    if (room.state.players.white || room.state.status !== "waiting") failure(409, "ROOM_FULL", "两位棋手已到齐，可以观战或新建房间。");
    return {
      change: { state: { ...room.state, players: { ...room.state.players, white: { name: playerName } }, status: "playing" }, whiteTokenHash: tokenHash },
      result: saved => ({ room: publicRoom(saved, token), token }),
    };
  });
}

export async function moveGomoku(code: string, token: string | undefined, input: { row: number; column: number; version: number }) {
  const { row, column, version } = input;
  if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || column < 0 || row >= boardSize || column >= boardSize) {
    failure(400, "INVALID_MOVE", "请选择棋盘内的交叉点。");
  }
  if (!Number.isSafeInteger(version) || version < 1) failure(400, "INVALID_VERSION", "棋局版本无效。");
  return changeRoom(code, room => {
    const color = requireSeat(room, token);
    if (room.version !== version) failure(409, "STALE_VERSION", "棋局已更新，请刷新棋盘后再落子。");
    if (room.state.status !== "playing") failure(409, "ROOM_NOT_PLAYING", "当前棋局还不能落子。");
    if (room.state.turn !== color) failure(409, "NOT_YOUR_TURN", "请等对方落子。");
    const index = row * boardSize + column;
    if (room.state.board[index] !== 0) failure(409, "CELL_OCCUPIED", "这里已经有棋子了。");
    const board = [...room.state.board];
    board[index] = color;
    const line = winningLine(board, row, column, color);
    const moveCount = room.state.moveCount + 1;
    const finished = line.length > 0 || moveCount === board.length;
    return {
      change: { state: {
        ...room.state, board, moveCount, lastMove: index, winningLine: line,
        turn: color === 1 ? 2 : 1,
        status: finished ? "finished" : "playing",
        winner: line.length > 0 ? color : finished ? 0 : null,
      } },
      result: saved => publicRoom(saved, token),
    };
  });
}

export async function resignGomoku(code: string, token: string | undefined) {
  return changeRoom(code, room => {
    const color = requireSeat(room, token);
    if (room.state.status !== "playing") failure(409, "ROOM_NOT_PLAYING", "当前棋局无法认输。");
    return {
      change: { state: { ...room.state, status: "finished", winner: color === 1 ? 2 : 1, winningLine: [] } },
      result: saved => publicRoom(saved, token),
    };
  });
}

export async function rematchGomoku(code: string, token: string | undefined) {
  return changeRoom(code, room => {
    const color = requireSeat(room, token);
    if (room.state.status !== "finished" || !room.state.players.white) failure(409, "ROOM_NOT_FINISHED", "请先结束当前棋局。");
    if (room.state.rematch.includes(color)) return { change: null, result: saved => publicRoom(saved, token) };
    if (room.state.rematch.length === 0) {
      return { change: { state: { ...room.state, rematch: [color] } }, result: saved => publicRoom(saved, token) };
    }
    return {
      change: {
        state: emptyState(room.state.players.white, room.state.players.black, room.state.round + 1),
        blackTokenHash: room.whiteTokenHash!,
        whiteTokenHash: room.blackTokenHash,
      },
      result: saved => publicRoom(saved, token),
    };
  });
}
