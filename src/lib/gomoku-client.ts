export type GomokuColor = 1 | 2;

export type GomokuRoom = {
  code: string;
  board: number[];
  players: { black: { name: string }; white: { name: string } | null };
  status: "waiting" | "playing" | "finished";
  turn: GomokuColor;
  winner: 0 | GomokuColor | null;
  winningLine: number[];
  moveCount: number;
  lastMove: number | null;
  version: number;
  round: number;
  rematch: number[];
  expiresAt: string;
  you: GomokuColor | null;
};

export type GomokuResponse = { room: GomokuRoom; token?: string };

const pendingTokens = new Map<string, string>();
const clearedPendingKeys = new Set<string>();
const pendingListeners = new Set<() => void>();
const pendingKey = (code?: string) => code ? `gomoku.pending.join.${code}` : "gomoku.pending.create";
const isRequestToken = (token: string | null | undefined): token is string => Boolean(token && /^[A-Za-z0-9_-]{43}$/.test(token));

function savedPendingToken(key: string): string | null {
  if (clearedPendingKeys.has(key)) return null;
  try {
    const token = window.sessionStorage.getItem(key);
    return isRequestToken(token) ? token : null;
  } catch { return null; }
}

/** Keep a request identity before a write, so a lost response can be retried safely. */
export function prepareRoomRequest(code?: string, existingToken?: string): { requestToken: string; persisted: boolean } {
  const key = pendingKey(code);
  const existing = isRequestToken(existingToken) ? existingToken : pendingTokens.get(key) || savedPendingToken(key);
  const bytes = existing ? null : crypto.getRandomValues(new Uint8Array(32));
  const requestToken = existing || btoa(String.fromCharCode(...bytes!)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  clearedPendingKeys.delete(key);
  pendingTokens.set(key, requestToken);
  let persisted = false;
  try { window.sessionStorage.setItem(key, requestToken); persisted = true; }
  catch { /* The in-memory identity still makes same-page retries safe. */ }
  for (const listener of pendingListeners) listener();
  return { requestToken, persisted };
}

export function clearRoomRequest(code?: string): void {
  const key = pendingKey(code);
  pendingTokens.delete(key);
  clearedPendingKeys.add(key);
  try { window.sessionStorage.removeItem(key); } catch { /* The in-memory attempt is cleared. */ }
  for (const listener of pendingListeners) listener();
}

export function pendingRoomRequest(code: string): string | null {
  const key = pendingKey(code);
  return pendingTokens.get(key) || savedPendingToken(key);
}

export function subscribePendingRoomRequests(listener: () => void): () => void {
  pendingListeners.add(listener);
  return () => { pendingListeners.delete(listener); };
}

export function hasPendingRoomCreation(): boolean {
  return pendingTokens.has(pendingKey()) || Boolean(savedPendingToken(pendingKey()));
}

const errorMessages: Record<string, string> = {
  ROOM_NOT_FOUND: "没有找到这个房间，请检查房间号。",
  ROOM_EXPIRED: "这个房间已过期，可以创建一个新房间。",
  ROOM_FULL: "房间已经有两位棋友了，你可以继续观战。",
  INVALID_TOKEN: "落子身份已失效，请重新加入房间。",
  TOKEN_REQUIRED: "加入房间后就可以落子。",
  ROOM_NOT_PLAYING: "请等棋友加入，或者开始下一局。",
  NOT_YOUR_TURN: "这一手轮到对方，稍等一下。",
  STALE_VERSION: "棋局刚刚更新了，请确认棋盘后再落子。",
  CELL_OCCUPIED: "这里已经有一枚棋子，换个位置吧。",
  INVALID_MOVE: "这一步没有落下，请选择棋盘上的空位。",
  ROOM_NOT_FINISHED: "这局还没有结束。",
  RATE_LIMITED: "操作有点快，请稍等一下再试。",
  ROOM_RATE_LIMITED: "新建房间有点频繁，请稍等一下再试。",
  INVALID_NAME: "请输入 1 到 24 个字的昵称，不要包含控制字符。",
  INVALID_BODY: "输入内容有些不对，请检查昵称或落子位置后重试。",
  INVALID_JSON: "这次请求没有成功，请重试。",
};

export class GomokuRequestError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "GomokuRequestError";
  }
}

export async function requestGomoku(
  path: string,
  options: { token?: string; body?: object; signal: AbortSignal },
): Promise<GomokuResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/gomoku/rooms${path}`, {
      method: options.body ? "POST" : "GET",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.any([options.signal, AbortSignal.timeout(12000)]),
    });
  } catch (failure) {
    if (options.signal.aborted) throw failure;
    throw new GomokuRequestError("NETWORK", "连接有些不稳定，正在重新连接。也可以点重连再试一次。");
  }
  let data: GomokuResponse | { error?: string; detail?: string } | null;
  try { data = await response.json(); }
  catch (failure) {
    if (options.signal.aborted) throw failure;
    throw new GomokuRequestError("NETWORK", "这次操作尚未确认，请稍后重试。");
  }
  if (!response.ok || !data || !("room" in data)) {
    const failure = data && "error" in data ? data : null;
    const code = failure?.error || "UNAVAILABLE";
    const detail = typeof failure?.detail === "string" ? failure.detail : undefined;
    throw new GomokuRequestError(code, errorMessages[code] || detail || "暂时连接不上棋房，请稍后重试。");
  }
  return data;
}

export function createPracticeRoom(): GomokuRoom {
  return {
    code: "", board: Array<number>(225).fill(0),
    players: { black: { name: "黑棋" }, white: { name: "白棋" } },
    status: "playing", turn: 1, winner: null, winningLine: [],
    moveCount: 0, lastMove: null, version: 0, round: 1, rematch: [],
    expiresAt: "", you: null,
  };
}

/** Local two-person practice follows the same unrestricted five-in-a-row rule. */
export function practiceMove(room: GomokuRoom, row: number, column: number): GomokuRoom {
  const index = row * 15 + column;
  if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || row > 14 || column < 0 || column > 14 || room.status !== "playing" || room.board[index] !== 0) return room;
  const board = [...room.board];
  board[index] = room.turn;
  let winningLine: number[] = [];
  for (const [dr, dc] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const line = [index];
    for (const sign of [-1, 1]) {
      for (let step = 1; step < 15; step++) {
        const r = row + dr * step * sign;
        const c = column + dc * step * sign;
        if (r < 0 || r >= 15 || c < 0 || c >= 15 || board[r * 15 + c] !== room.turn) break;
        if (sign < 0) line.unshift(r * 15 + c);
        else line.push(r * 15 + c);
      }
    }
    if (line.length >= 5) { winningLine = line; break; }
  }
  const moveCount = room.moveCount + 1;
  const winner = winningLine.length ? room.turn : moveCount === 225 ? 0 : null;
  return { ...room, board, winningLine, moveCount, lastMove: index, winner,
    status: winner === null ? "playing" : "finished", turn: room.turn === 1 ? 2 : 1,
    version: room.version + 1 };
}
