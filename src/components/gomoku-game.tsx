"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, Check, Copy, Flag, Link2, RefreshCw, Users, Wifi, WifiOff } from "lucide-react";
import { clearRoomRequest, createPracticeRoom, GomokuRequestError, hasPendingRoomCreation, pendingRoomRequest, practiceMove, prepareRoomRequest, requestGomoku, subscribePendingRoomRequests, type GomokuColor, type GomokuResponse, type GomokuRoom } from "@/lib/gomoku-client";

const letters = "ABCDEFGHJKLMNOP".split("");
const stars = new Set([48, 56, 112, 168, 176]);
const storageKey = (code: string) => `gomoku.room.${code}`;
const colorName = (color: GomokuColor) => color === 1 ? "黑棋" : "白棋";
const isAbort = (error: unknown) => error instanceof Error && error.name === "AbortError";

function roomHeadline(room: GomokuRoom, online: boolean): string {
  if (room.status === "waiting") return "棋盘已备好，等朋友来。";
  if (room.status === "finished") {
    if (room.winner === 0) return "势均力敌，这局和棋。";
    const winner = room.winner === 1 ? room.players.black : room.players.white;
    return `${winner?.name || colorName(room.winner || 1)}赢了这局。`;
  }
  if (!online) return `轮到${colorName(room.turn)}落子`;
  if (room.you === null) return `正在观战 · 轮到${colorName(room.turn)}`;
  return room.you === room.turn ? "轮到你了，落一子吧。" : "轮到对方，想想下一手。";
}

export function GomokuGame({ initialRoom, invalidRoom = false }: { initialRoom: string; invalidRoom?: boolean }) {
  const [code, setCode] = useState(initialRoom);
  const [room, setRoom] = useState<GomokuRoom | null>(null);
  const [practice, setPractice] = useState(createPracticeRoom);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(invalidRoom ? "房间链接不完整。可以输入八位房间号加入，或创建新房间。" : "");
  const [notice, setNotice] = useState("");
  const [connection, setConnection] = useState(initialRoom ? "connecting" : "connected");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [focusCell, setFocusCell] = useState(112);
  const pendingCreation = useSyncExternalStore(subscribePendingRoomRequests, hasPendingRoomCreation, () => false);
  const pendingJoin = useSyncExternalStore(subscribePendingRoomRequests, () => Boolean(code && pendingRoomRequest(code)), () => false);
  const session = useRef<{ code: string; token: string } | null>(null);
  const busyRef = useRef(false);
  const alive = useRef(true);
  const actionControllers = useRef(new Set<AbortController>());
  const pollingController = useRef<AbortController | null>(null);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const shareInput = useRef<HTMLInputElement>(null);
  const nicknameInput = useRef<HTMLInputElement>(null);
  const online = Boolean(code);
  const current = online ? room || createPracticeRoom() : practice;
  const canMove = current.status === "playing" && !busy && (!online || (connection === "connected" && current.you === current.turn));
  const rematchRequested = current.you !== null && current.rematch.includes(current.you);

  useEffect(() => {
    alive.current = true;
    const controllers = actionControllers.current;
    return () => {
      alive.current = false;
      controllers.forEach(controller => controller.abort());
    };
  }, []);

  useEffect(() => {
    if (!code) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let inFlight = false;
    let recoveringJoin = false;
    if (session.current?.code !== code) {
      let storedToken: string | null = null;
      try { storedToken = window.sessionStorage.getItem(storageKey(code)); }
      catch { /* A pending identity can still be restored from memory. */ }
      const pendingToken = storedToken ? null : pendingRoomRequest(code);
      const token = storedToken || pendingToken;
      recoveringJoin = Boolean(pendingToken);
      session.current = token ? { code, token } : null;
    }
    async function poll() {
      if (disposed || inFlight) return;
      if (document.visibilityState === "hidden" || busyRef.current) {
        timer = setTimeout(poll, 1500);
        return;
      }
      controller = new AbortController();
      inFlight = true;
      pollingController.current = controller;
      let keepPolling = true;
      try {
        const response = await requestGomoku(`/${code}`, { token: session.current?.token, signal: controller.signal });
        if (disposed) return;
        if (recoveringJoin && response.room.you !== null && session.current) {
          try { window.sessionStorage.setItem(storageKey(code), session.current.token); }
          catch { setNotice("已恢复你的座位。请保持此页面打开，浏览器没有保存落子身份。"); }
          clearRoomRequest(code);
          recoveringJoin = false;
          setError("");
        }
        setRoom(previous => previous && previous.code === response.room.code && previous.version > response.room.version ? previous : response.room);
        setConnection("connected");
        setConnectionMessage("");
        setShareUrl(`${window.location.origin}/play/gomoku?room=${code}`);
      } catch (failure) {
        if (disposed || isAbort(failure)) return;
        if (failure instanceof GomokuRequestError && failure.code === "INVALID_TOKEN") {
          session.current = null;
          try { window.sessionStorage.removeItem(storageKey(code)); } catch { /* The in-memory session is already cleared. */ }
          if (recoveringJoin) setError("上次加入没有确认，请点击「恢复加入」重试同一次加入。");
          else setError(failure.message);
          recoveringJoin = false;
        }
        keepPolling = !(failure instanceof GomokuRequestError && ["ROOM_NOT_FOUND", "ROOM_EXPIRED"].includes(failure.code));
        if (!keepPolling) clearRoomRequest(code);
        setConnection("reconnecting");
        setConnectionMessage(failure instanceof Error ? failure.message : "连接断开了，正在重新连接。" );
      } finally {
        inFlight = false;
        if (!disposed && keepPolling) timer = setTimeout(poll, 1500);
      }
    }
    function resume() {
      if (document.visibilityState === "visible") {
        if (inFlight) return;
        clearTimeout(timer);
        void poll();
      }
    }
    void poll();
    document.addEventListener("visibilitychange", resume);
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", resume);
    };
  }, [code, retry]);

  function openRoom(targetCode: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("room", targetCode);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    if (targetCode !== code) setRoom(null);
    setCode(targetCode);
    setShareUrl(`${window.location.origin}/play/gomoku?room=${targetCode}`);
    setConnection("connecting");
  }

  async function perform(path: string, body: object, adoptSession = false) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    pollingController.current?.abort();
    const controller = new AbortController();
    actionControllers.current.add(controller);
    const targetCode = path.split("/")[1];
    let pendingSaved = true;
    try {
      let token = session.current && session.current.code === targetCode ? session.current.token : undefined;
      if (!token && adoptSession && targetCode) {
        try { token = window.sessionStorage.getItem(storageKey(targetCode)) || undefined; }
        catch { /* Joining a new room does not require a saved identity. */ }
      }
      let requestBody = body;
      if (adoptSession) {
        const attempt = prepareRoomRequest(targetCode, token);
        pendingSaved = attempt.persisted;
        requestBody = { ...body, requestToken: attempt.requestToken };
      }
      const response: GomokuResponse = await requestGomoku(path, { body: requestBody, token, signal: controller.signal });
      if (!alive.current) return;
      if (adoptSession) {
        if (!response.token) throw new Error("房间已响应，但没有获得落子身份，请重新加入。");
        session.current = { code: response.room.code, token: response.token };
        try { window.sessionStorage.setItem(storageKey(response.room.code), response.token); }
        catch { setNotice("浏览器没有保存落子身份，请保持此页面打开。刷新后可能需要重新加入。"); }
        clearRoomRequest(targetCode);
        openRoom(response.room.code);
      }
      setRoom(response.room);
      setConnection("connected");
      setConnectionMessage("");
      setConfirmResign(false);
      setCopied(false);
    } catch (failure) {
      if (alive.current && !isAbort(failure)) {
        if (adoptSession && failure instanceof GomokuRequestError && failure.code === "ROOM_FULL" && targetCode) {
          clearRoomRequest(targetCode);
          if (session.current?.code === targetCode) session.current = null;
          try { window.sessionStorage.removeItem(storageKey(targetCode)); } catch { /* Anonymous viewing does not need storage. */ }
          setRoom(null);
          openRoom(targetCode);
          setError("房间已经有两位棋友了，已为你打开观战。也可以返回练习，创建新房间。");
        } else if (adoptSession && failure instanceof GomokuRequestError && ["NETWORK", "UNAVAILABLE"].includes(failure.code)) {
          if (targetCode) openRoom(targetCode);
          setError(targetCode ? "加入还没有确认，正在查找你的座位。若仍未加入，请再次加入恢复同一次操作，不会重复占座。" : "房间创建还没有确认。请点「恢复创建的房间」继续，不会重复开房。");
        } else setError(failure instanceof Error ? failure.message : "这一步没有完成，请重试。");
        if (adoptSession && failure instanceof GomokuRequestError && ["ROOM_EXPIRED", "ROOM_NOT_FOUND"].includes(failure.code)) clearRoomRequest(targetCode);
        if (adoptSession && !pendingSaved) setNotice("浏览器没有保存恢复信息。请保持此页面打开，在这里重试；刷新后无法恢复刚才的操作。");
        if (failure instanceof GomokuRequestError && failure.code === "STALE_VERSION") setRetry(value => value + 1);
      }
    } finally {
      actionControllers.current.delete(controller);
      busyRef.current = false;
      if (alive.current) {
        setBusy(false);
        // The mutation aborted the previous poll; always resume with a fresh read.
        setRetry(value => value + 1);
      }
    }
  }

  function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { nicknameInput.current?.focus(); return; }
    void perform("", { name: name.trim() }, true);
  }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = (code || joinCode).trim().toUpperCase();
    if (!name.trim()) { nicknameInput.current?.focus(); return; }
    if (!/^[A-Z2-9]{8}$/.test(target)) { setError("请输入八位房间号，例如 ABCD2345。"); return; }
    void perform(`/${target}/join`, { name: name.trim() }, true);
  }

  function move(index: number) {
    if (!canMove || current.board[index] !== 0) return;
    setError("");
    setNotice("");
    setFocusCell(index);
    if (online) void perform(`/${code}/moves`, { row: Math.floor(index / 15), column: index % 15, version: current.version });
    else setPractice(previous => practiceMove(previous, Math.floor(index / 15), index % 15));
  }

  function navigateBoard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const row = Math.floor(index / 15), col = index % 15;
    const next = event.key === "ArrowUp" ? Math.max(0, row - 1) * 15 + col
      : event.key === "ArrowDown" ? Math.min(14, row + 1) * 15 + col
      : event.key === "ArrowLeft" ? row * 15 + Math.max(0, col - 1)
      : event.key === "ArrowRight" ? row * 15 + Math.min(14, col + 1)
      : event.key === "Home" ? row * 15 : event.key === "End" ? row * 15 + 14 : null;
    if (next !== null) { event.preventDefault(); setFocusCell(next); cells.current[next]?.focus(); }
  }

  function returnToPractice() {
    pollingController.current?.abort();
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    setCode(""); setRoom(null); setError(""); setNotice(""); setShareUrl(""); setConfirmResign(false);
  }

  async function copyInvite() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      if (alive.current) { setCopied(true); setNotice("邀请链接已复制，发给朋友就能一起下。" ); }
    } catch {
      shareInput.current?.focus(); shareInput.current?.select();
      setNotice("链接已选中，可以长按或按 Ctrl+C 复制。" );
    }
  }

  const headline = online && !room ? "正在打开棋房…" : roomHeadline(current, online);
  return <div className="gomoku-game">
    <section className="gomoku-play" aria-label="五子棋棋盘">
      <div className="gomoku-board-top">
        <span className={`gomoku-mode${online ? " gomoku-mode--online" : ""}`}>{online ? <Wifi size={13} /> : <Users size={13} />}{online ? `在线棋房 · ${code}` : "本机双人练习"}</span>
        <span className="gomoku-move-count">第 {current.round} 局 · {current.moveCount} 手</span>
      </div>
      <div className="gomoku-status" role="status" aria-live="polite">
        <span className={`gomoku-status-stone gomoku-status-stone--${current.turn}`} aria-hidden="true" />
        <div><h2>{headline}</h2><p>{online ? !room ? "正在连接棋房，棋盘会自动同步。" : current.you ? `你执${colorName(current.you)}${current.status === "finished" ? " · 等双方同意再来一局" : ""}` : "加入棋房后就可以落子" : "两个人共用这张棋盘，轮流落子。"}</p></div>
      </div>
      <div className={`gomoku-board-frame${canMove ? " gomoku-board-frame--ready" : ""}`}>
        <div className="gomoku-letters" aria-hidden="true">{letters.map(letter => <span key={letter}>{letter}</span>)}</div>
        <div className="gomoku-board-layout">
          <div className="gomoku-ranks" aria-hidden="true">{letters.map((_, row) => <span key={row}>{row + 1}</span>)}</div>
          <div className="gomoku-grid" role="grid" aria-label="十五行十五列五子棋盘；方向键移动，回车或空格落子" aria-rowcount={15} aria-colcount={15}>
            {Array.from({ length: 15 }, (_, row) => <div className="gomoku-row" role="row" key={row}>
              {Array.from({ length: 15 }, (_, col) => {
                const index = row * 15 + col, stone = current.board[index];
                return <button key={index} ref={element => { cells.current[index] = element; }} type="button" role="gridcell"
                  className={`gomoku-cell${current.winningLine.includes(index) ? " gomoku-cell--winning" : ""}${canMove && !stone ? " gomoku-cell--available" : ""}`}
                  tabIndex={focusCell === index ? 0 : -1} aria-rowindex={row + 1} aria-colindex={col + 1}
                  aria-label={`${letters[col]}${row + 1}，${stone ? colorName(stone as GomokuColor) : "空位"}${current.lastMove === index ? "，最后落子" : ""}${current.winningLine.includes(index) ? "，胜利连线" : ""}`}
                  aria-disabled={!canMove || Boolean(stone)} onFocus={() => setFocusCell(index)} onKeyDown={event => navigateBoard(event, index)} onClick={() => move(index)}>
                  {stars.has(index) && <span className="gomoku-star" aria-hidden="true" />}
                  {stone > 0 && <span className={`gomoku-stone gomoku-stone--${stone}${current.lastMove === index ? " gomoku-stone--last" : ""}`} aria-hidden="true" />}
                  {!stone && canMove && <span className={`gomoku-preview gomoku-preview--${current.turn}`} aria-hidden="true" />}
                </button>;
              })}
            </div>)}
          </div>
        </div>
      </div>
      <div className="gomoku-board-bottom"><span>{online ? "棋局自动同步，刷新后可继续。" : "点击交叉点落子，邀请朋友也能在线玩。"}</span><span>15 × 15 · 自由规则</span></div>
      {connection !== "connected" && online && <div className="gomoku-connection" role="status"><WifiOff size={15} /><span>{connection === "connecting" ? "正在连接棋房…" : connectionMessage || "正在重新连接，棋盘会保留。"}</span><button type="button" onClick={() => setRetry(value => value + 1)} disabled={busy}>重连</button></div>}
      {current.status === "finished" && <div className="gomoku-result"><strong>{headline}</strong><p>{current.winningLine.length ? "五子相连，胜负已定。" : current.winner === 0 ? "棋盘已满，再来一局吧。" : "一方认输，这局结束。"}</p>{!online && <button className="gomoku-button gomoku-button--primary" type="button" onClick={() => { setPractice(createPracticeRoom()); setFocusCell(112); }}><RefreshCw size={16} /> 再来一局</button>}</div>}
    </section>

    <aside className="gomoku-sidebar" aria-label="棋房与对弈操作">
      <section className="gomoku-room-panel">
        <p className="gomoku-panel-eyebrow"><Link2 size={15} /> 和朋友在线玩</p>
        {online && room?.you ? <>
          <h2>{current.status === "waiting" ? "邀个朋友，棋局就开始。" : "这张棋盘属于你们。"}</h2>
          <p className="gomoku-panel-copy">把邀请链接发给朋友，TA 输入昵称即可加入。房间保留 24 小时。</p>
          <label className="gomoku-label" htmlFor="gomoku-invite">邀请链接</label>
          <div className="gomoku-share"><input id="gomoku-invite" ref={shareInput} readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} /><button type="button" onClick={() => void copyInvite()} aria-label={copied ? "邀请链接已复制" : "复制邀请链接"}>{copied ? <Check size={18} /> : <Copy size={18} />}</button></div>
          <button className="gomoku-button gomoku-button--primary" type="button" onClick={() => void copyInvite()}>{copied ? <Check size={16} /> : <Link2 size={16} />}{copied ? "链接已复制" : "复制链接，邀请朋友"}</button>
        </> : <>
          <h2>{online ? pendingJoin ? "继续上次加入。" : room?.status === "waiting" ? "朋友在等你落座。" : room ? "来看看这盘棋。" : "打开朋友的棋房。" : "开一间房，邀朋友来。"}</h2>
          <p className="gomoku-panel-copy">{online && pendingJoin ? "上次加入还没有确认。点击恢复，继续同一次加入。" : online && room?.status !== "waiting" && room ? "两位棋友已经落座，你可以留在这里观战。" : "留个昵称就能玩。创建房间后，把链接发给朋友。"}</p>
          {(!online || !room || room.status === "waiting" || pendingJoin) && <>
            <label className="gomoku-label" htmlFor="gomoku-nickname">你的昵称</label>
            <input className="gomoku-input" id="gomoku-nickname" ref={nicknameInput} value={name} maxLength={24} autoComplete="nickname" placeholder="怎么称呼你？" onChange={event => setName(event.target.value)} disabled={busy} />
            {online ? <form onSubmit={joinRoom}><button className="gomoku-button gomoku-button--primary" type="submit" disabled={busy || !name.trim() || !room}>{busy ? "正在加入…" : pendingJoin ? "恢复加入" : "加入棋房"}<ArrowRight size={16} /></button></form>
              : <form onSubmit={createRoom}><button className="gomoku-button gomoku-button--primary" type="submit" disabled={busy || !name.trim()}>{busy ? "正在开房…" : pendingCreation ? "恢复创建的房间" : "创建房间"}<ArrowRight size={16} /></button></form>}
            {!online && pendingCreation && <p className="gomoku-panel-copy">上次创建尚未确认。输入昵称并点击恢复，就能继续同一次开房。</p>}
          </>}
          {!online && <details className="gomoku-join"><summary>已经有房间号？</summary><form onSubmit={joinRoom}><label className="gomoku-label" htmlFor="gomoku-code">八位房间号</label><input className="gomoku-input gomoku-input--code" id="gomoku-code" value={joinCode} maxLength={8} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="例如 ABCD2345" onChange={event => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))} disabled={busy} /><button className="gomoku-button gomoku-button--secondary" type="submit" disabled={busy || !name.trim() || joinCode.length !== 8}>加入朋友的房间</button></form></details>}
        </>}
        {online && <button className="gomoku-text-button" type="button" disabled={busy} onClick={returnToPractice}>回到本机练习 / 创建新房间</button>}
        <div className="gomoku-feedback" aria-live="polite" role="status">{error && <p className="gomoku-error">{error}</p>}{notice && <p className="gomoku-notice">{notice}</p>}</div>
        <p className="gomoku-panel-footnote">免登录 · 两人实时对弈 · 链接即可加入</p>
      </section>

      <section className="gomoku-players" aria-label="对弈双方">
        <div className={`gomoku-player${current.status === "playing" && current.turn === 1 ? " gomoku-player--turn" : ""}`}><span className="gomoku-player-stone gomoku-stone--1" aria-hidden="true" /><div><strong>{current.players.black.name}{online && current.you === 1 && <small>你</small>}</strong><p>黑棋 · 先手</p></div>{current.status === "playing" && current.turn === 1 && <span className="gomoku-turn-label">落子中</span>}</div>
        <div className={`gomoku-player${current.status === "playing" && current.turn === 2 ? " gomoku-player--turn" : ""}`}><span className="gomoku-player-stone gomoku-stone--2" aria-hidden="true" /><div><strong>{current.players.white?.name || "等待朋友加入"}{online && current.you === 2 && <small>你</small>}</strong><p>白棋 · 后手</p></div>{current.status === "playing" && current.turn === 2 && <span className="gomoku-turn-label">落子中</span>}</div>
      </section>

      {online && current.you && current.status === "finished" && <section className="gomoku-round-actions"><button className="gomoku-button gomoku-button--secondary" type="button" disabled={busy || rematchRequested || connection !== "connected"} onClick={() => void perform(`/${code}/rematch`, {})}><RefreshCw size={16} />{rematchRequested ? "等对方同意…" : current.rematch.length ? "同意，再来一局" : "邀请再来一局"}</button><p>双方同意后交换黑白棋，开始新一局。</p></section>}
      {online && current.you && current.status === "playing" && <div className="gomoku-resign">{confirmResign ? <><p>确认认输，结束这一局？</p><div><button type="button" className="gomoku-button gomoku-button--danger" disabled={busy} onClick={() => void perform(`/${code}/resign`, {})}>确认认输</button><button type="button" className="gomoku-button gomoku-button--secondary" disabled={busy} onClick={() => setConfirmResign(false)}>继续下</button></div></> : <button className="gomoku-text-button" type="button" disabled={busy} onClick={() => setConfirmResign(true)}><Flag size={14} /> 认输</button>}</div>}
      {!online && practice.moveCount > 0 && practice.status === "playing" && <button className="gomoku-text-button" type="button" onClick={() => { setPractice(createPracticeRoom()); setFocusCell(112); }}><RefreshCw size={14} /> 重置练习棋盘</button>}
      <details className="gomoku-rules"><summary>怎么玩？</summary><p>黑棋先手，双方轮流在空交叉点放一枚棋子。横、竖、斜任一方向连成五子或更多就获胜，没有禁手。棋盘下满则和棋。</p><p>在线房间最多两位棋友，其他人可以观战。刷新此页面可恢复你的身份；请用原浏览器、原标签页继续下。</p><p>键盘也能玩：用方向键选择位置，回车或空格落子。</p></details>
    </aside>
  </div>;
}
