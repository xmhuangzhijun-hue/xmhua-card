"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Monitor, RefreshCw, Upload, Video, Send } from "lucide-react";
import { apiUrl } from "@/lib/api-client";

const platforms = [{ id: "xiaohongshu", name: "小红书" }, { id: "tencent", name: "视频号" }, { id: "douyin", name: "抖音" }, { id: "bilibili", name: "B站" }, { id: "youtube", name: "YouTube" }];
type Worker = { id: string; name: string; lastSeen: string | null; active: boolean; accounts: Record<string, { authenticated: boolean; checkedAt: string }> };
type Asset = { id: string; name: string; size: number };
type Job = { id: string; workerId: string; platform: string; kind: string; state: string; message: string; createdAt: string; updatedAt: string; payload: { title?: string } };
type LoginView = { stage: "opening" | "qr" | "browser" | "terminal" | "verifying"; image?: string; expiresAt: number };
type Overview = { workers: Worker[]; assets: Asset[]; jobs: Job[]; cloudWorkerId: string | null; loginViews?: Record<string, LoginView> };
const messages: Record<string, string> = {
  WORKER_OFFLINE: "发布服务暂时离线，请稍后刷新。", ACCOUNT_CHECK_REQUIRED: "请先登录所选平台并检查登录状态。",
  XHS_TITLE_TOO_LONG: "小红书标题最多 20 个字，请缩短标题。", MP4_REQUIRED: "请选择 MP4 视频。", VIDEO_TOO_LARGE: "视频需小于 512 MB。",
  VIDEO_STORAGE_FULL: "服务器视频存储空间不足，请先安排释放空间或扩容。",
  VIDEO_AND_TITLE_REQUIRED: "请先选择视频并填写标题。", UNAUTHORIZED: "后台登录已失效，请刷新页面重新登录。",
  ONLY_QUEUED_CAN_CANCEL: "任务已开始，不能撤回；请检查平台实际结果。",
};
async function call<T>(path = "", body?: unknown): Promise<T> {
  const response = await fetch(apiUrl(`/api/admin/publishing${path}`), { credentials: "include", cache: "no-store", ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const payload = await response.json();
  if (!response.ok) throw new Error(messages[payload.error] ?? "操作失败，请刷新后检查任务记录。");
  return payload.data;
}
const states: Record<string, string> = { queued: "等待执行", running: "正在执行", completed: "检查完成", submitted: "已提交 · 待平台核验", failed: "未完成", needs_attention: "需要处理", cancelled: "已取消" };

export function VideoPublisher() {
  const [data, setData] = useState<Overview | null>(null);
  const [workerId, setWorkerId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [assetId, setAssetId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState(249);
  const [original, setOriginal] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const desktopPanel = useRef<HTMLDivElement>(null);
  const loginPanel = useRef<HTMLDivElement>(null);
  const requestId = useRef<string | null>(null);
  const reload = useCallback(async () => { try { setData(await call<Overview>()); } catch (e) { setError((e as Error).message); } }, []);
  useEffect(() => { const start = setTimeout(() => void reload(), 0); const timer = setInterval(() => void reload(), 5000); return () => { clearTimeout(start); clearInterval(timer); }; }, [reload]);
  const worker = data?.workers.find(w => w.id === workerId && w.active) ?? data?.workers.find(w => w.active && w.id === data.cloudWorkerId) ?? data?.workers.find(w => w.active);
  const cloud = Boolean(worker && worker.id === data?.cloudWorkerId);
  const online = Boolean(worker?.lastSeen && Date.now() - Date.parse(worker.lastSeen) < 45000);
  const ready = (id: string) => Boolean(worker?.accounts[id]?.authenticated && Date.now() - Date.parse(worker.accounts[id].checkedAt) < 86400000);
  const asset = data?.assets.find(a => a.id === assetId);
  const pendingAccount = (id: string) => data?.jobs.find(job => job.workerId === worker?.id && job.platform === id && ["login", "check"].includes(job.kind) && ["queued", "running"].includes(job.state));
  const loginJob = data?.jobs.find(job => job.workerId === worker?.id && job.kind === "login" && job.state === "running");
  const loginView = loginJob ? data?.loginViews?.[loginJob.id] : undefined;
  const currentView = online && loginView && loginView.expiresAt > Date.now() ? loginView : undefined;
  const loginName = platforms.find(p => p.id === loginJob?.platform)?.name;
  const queuedLogins = data?.jobs.filter(job => job.workerId === worker?.id && job.kind === "login" && job.state === "queued") ?? [];

  async function run(kind: string, targets: string[]) {
    if (!worker || busy) return;
    setBusy(true); setError(""); setNotice("");
    requestId.current ??= crypto.randomUUID();
    try {
      setData(await call<Overview>("/jobs", { requestId: requestId.current, workerId: worker.id, kind, platforms: targets, ...(assetId ? { assetId } : {}), title, description, tags: tags.split(/[,，]/).map(t => t.trim()).filter(Boolean), category, original }));
      requestId.current = null; setConfirm(false);
      if (kind === "login" && cloud) {
        setDesktop(true);
        requestAnimationFrame(() => desktopPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
      if (kind === "login" && !cloud) requestAnimationFrame(() => loginPanel.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      setNotice(kind === "login" ? "登录任务已发送。扫码后还需保存并校验会话，请等账号显示「已登录」，不必重复点击。" : kind === "publish" ? "发布任务已创建，可以在下方跟踪各平台结果。" : "账号检查任务已提交，结果会自动更新。");
      await reload();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function resetRequest() { requestId.current = null; setConfirm(false); }
  async function upload(file: File) {
    if (file.size > 512 * 1024 * 1024 || !file.name.toLowerCase().endsWith(".mp4")) { setError("请选择 512 MB 以内的 MP4 视频。"); return; }
    setProgress(0); setError(""); resetRequest();
    try {
      const asset = await new Promise<Asset>((resolve, reject) => {
        const xhr = new XMLHttpRequest(); xhr.open("POST", apiUrl("/api/admin/publishing/assets")); xhr.withCredentials = true;
        xhr.setRequestHeader("Content-Type", "video/mp4"); xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
        xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)); };
        xhr.onerror = () => reject(new Error("上传中断，请重新选择视频。"));
        xhr.onload = () => { try { const p = JSON.parse(xhr.responseText); if (xhr.status >= 400) reject(new Error(messages[p.error] ?? "上传失败，请稍后重试。")); else resolve(p.data); } catch { reject(new Error("上传失败，请稍后重试。")); } };
        xhr.send(file);
      });
      setAssetId(asset.id); if (!title) setTitle(file.name.replace(/\.mp4$/i, "").slice(0, 20)); await reload();
    } catch (e) { setError((e as Error).message); } finally { setProgress(null); }
  }
  return <section className="vp">
    <div className="vp-heading"><div><h1><Video size={24} />视频发布</h1><p>选一次视频，分发到你的多个平台账号。</p></div><button className="ac-button" onClick={() => void reload()}><RefreshCw size={14} />刷新状态</button></div>
    {error && <p className="vp-message vp-error" role="alert">{error}</p>}
    {notice && <p className="vp-message" role="status">{notice}</p>}
    <div className="vp-device"><Monitor size={20} /><div><strong>{worker?.name ?? "尚未连接发布服务"}</strong><p>{online ? cloud ? "云端在线 · 上传后关掉电脑，任务仍会继续执行" : "在线 · 登录和上传在这台电脑上执行" : cloud ? "云端服务暂时离线，正在等待恢复。" : "启动本地发布助手后，这里会自动连接。发布时请保持电脑在线。"}</p></div><span className={online ? "vp-status is-online" : "vp-status"}>{online ? "已连接" : "未连接"}</span>{(data?.workers.filter(w => w.active).length ?? 0) > 1 && <select aria-label="发布电脑" value={worker?.id ?? ""} onChange={e => { setWorkerId(e.target.value); resetRequest(); }}>{data?.workers.filter(w => w.active).map(w => <option value={w.id} key={w.id}>{w.name}</option>)}</select>}</div>
    {cloud && <div className="vp-card" ref={desktopPanel}><div className="vp-heading"><div><h2>云端登录窗口</h2><p>账号验证直接在这里完成，登录状态保存在云端。关闭窗口不会停止任务。</p></div><button className="ac-button" onClick={() => setDesktop(!desktop)}>{desktop ? "收起窗口" : "打开窗口"}</button></div>{desktop && <iframe className="vp-cloud-desktop" title="云端平台登录" src="/admin/publishing-desktop/vnc.html?autoconnect=true&resize=scale&path=/admin/publishing-desktop/websockify" />}</div>}
    {!cloud && <div className="vp-card" ref={loginPanel} aria-label="扫码与账号鉴权">
      <h2>扫码与账号鉴权{loginName ? ` · ${loginName}` : ""}</h2>
      {!loginJob ? <p className="vp-muted">点击下方平台的「扫码 / 登录」开始。二维码准备好后会显示在这里；登录会话和发布执行保留在本机。</p> : <>
        <p role="status">{!online ? "本机助手离线，二维码已隐藏。请恢复连接后再试。" : currentView?.stage === "qr" ? `用${loginName} App 扫码，并在手机上确认登录。` : currentView?.stage === "verifying" ? "正在保存并校验登录状态，请稍候。" : loginJob.platform === "bilibili" ? "请在本机弹出的 B 站登录窗口，用方向键选择「扫码登录」并按回车。生成的二维码会显示在这里。" : loginJob.platform === "youtube" ? "YouTube 使用 Google 登录。请在本机弹出的浏览器中完成账号验证，这里不提供通用扫码登录。" : "正在等待平台二维码。若本机浏览器提示短信或安全验证，请在那个窗口完成。"}</p>
        {currentView?.stage === "qr" && currentView.image && <div className="flex justify-center py-4">
          {/* Ephemeral authenticated image; never send login challenges through an image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentView.image} alt={`${loginName}登录二维码`} width={256} height={256} className="h-64 w-64 rounded-lg bg-white object-contain p-3" />
        </div>}
        <p className="vp-muted">显示「已登录」才算完成。二维码未出现或已过期时，请查看本机登录窗口；本次任务结束后可重新发起。</p>
      </>}
      {!!queuedLogins.length && <p className="vp-muted">等待当前任务结束：{queuedLogins.map(job => platforms.find(p => p.id === job.platform)?.name).join("、")}。可在下方任务记录取消排队。</p>}
    </div>}
    <div className="vp-columns"><div className="vp-card"><h2>1. 视频与文案</h2>
      <label className="vp-upload"><Upload size={25} /><strong>{progress !== null ? `上传中 ${progress}%` : asset?.name ?? "选择一个视频"}</strong><span>{asset ? `${(asset.size / 1024 / 1024).toFixed(1)} MB · 点击更换` : "MP4 · 最大 512 MB"}</span><input aria-label="选择视频" type="file" accept=".mp4,video/mp4" disabled={progress !== null || busy} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} /></label>
      {!!data?.assets.length && <label>已上传的视频<select value={assetId} onChange={e => { setAssetId(e.target.value); resetRequest(); }}><option value="">选择视频</option>{data.assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
      <label>标题<input maxLength={100} value={title} onChange={e => { setTitle(e.target.value); resetRequest(); }} placeholder="这个视频讲什么" /><small>同步小红书时，标题最多 20 个字。</small></label>
      <label>简介<textarea rows={4} maxLength={1000} value={description} onChange={e => { setDescription(e.target.value); resetRequest(); }} placeholder="补充视频介绍" /></label>
      <label>话题<input value={tags} onChange={e => { setTags(e.target.value); resetRequest(); }} placeholder="用逗号分隔，如 AI,产品,创作" /></label>
    </div><div className="vp-card"><h2>2. 发布到哪些平台</h2><p className="vp-muted">{cloud ? "首次分别登录，后续复用云端登录状态。点击登录后，在云端窗口扫码或验证。" : "首次分别登录，后续复用登录状态。登录窗口会在发布电脑上打开。"}</p>
      <div className="vp-platforms">{platforms.map(p => { const pending = pendingAccount(p.id); return <div key={p.id} className="vp-platform"><label><input type="checkbox" checked={selected.includes(p.id)} onChange={e => { setSelected(e.target.checked ? [...selected, p.id] : selected.filter(id => id !== p.id)); resetRequest(); }} /><strong>{p.name}</strong><span aria-live="polite">{pending ? pending.state === "queued" ? "已排队" : pending.kind === "login" ? "等待鉴权 / 校验" : "检查中" : ready(p.id) ? "已登录" : "待登录 / 检查"}</span></label><button className="ac-button" disabled={!online || busy || (pending?.kind === "check")} onClick={() => { if (pending) { (cloud ? desktopPanel : loginPanel).current?.scrollIntoView({ behavior: "smooth", block: "center" }); if (cloud) setDesktop(true); return; } resetRequest(); void run("login", [p.id]); }}>{pending ? "查看进度" : ready(p.id) ? "重新登录" : "扫码 / 登录"}</button></div>; })}</div>
      <button className="ac-button" disabled={!online || busy || platforms.some(p => !!pendingAccount(p.id))} onClick={() => { resetRequest(); void run("check", platforms.map(p => p.id)); }}><RefreshCw size={14} />检查全部账号</button>
      <p className="vp-muted">扫码进入平台后，还需自动保存并校验登录状态；显示「已登录」才算连接完成。任务依次执行，其他平台可能需要排队。</p>
      {selected.includes("bilibili") && <label>B站分区 ID<input type="number" min={1} max={9999} value={category} onChange={e => { setCategory(Number(e.target.value)); resetRequest(); }} /><small>默认 249；请按视频内容填写创作中心对应分区。</small></label>}
      <label className="vp-original"><input type="checkbox" checked={original} onChange={e => { setOriginal(e.target.checked); resetRequest(); }} />这是我制作并拥有发布权的视频</label>
      <div className="vp-submit"><p>{selected.length ? `已选 ${selected.length} 个平台` : "选择至少一个平台"}</p><button className="ac-button ac-button--primary" disabled={!online || busy || !asset || !title.trim() || !original || !selected.length || selected.some(id => !ready(id)) || progress !== null} onClick={() => setConfirm(true)}><Send size={15} />准备发布</button></div>
      <p className="vp-muted">平台各自处理上传和审核；提交后请核对平台实际结果。</p>
    </div></div>
    {confirm && <div className="vp-confirm" role="dialog" aria-modal="true" aria-label="确认发布"><div className="vp-card"><h2>确认公开发布</h2><p>《{title}》将提交到 {platforms.filter(p => selected.includes(p.id)).map(p => p.name).join("、")}。</p><p>提交后可能立即公开。请确认视频、文案和账号无误。</p><div className="vp-actions"><button className="ac-button" disabled={busy} onClick={() => setConfirm(false)}>返回修改</button><button className="ac-button ac-button--primary" disabled={busy} onClick={() => void run("publish", selected)}>{busy ? "提交中……" : "确认发布"}</button></div></div></div>}
    <div className="vp-card"><h2>任务记录</h2>{!data?.jobs.length ? <p className="vp-empty">还没有发布任务。连接账号后，从一条视频开始。</p> : <div className="vp-jobs">{data.jobs.map(job => <div key={job.id} className="vp-job"><div><strong>{platforms.find(p => p.id === job.platform)?.name} · {job.kind === "publish" ? job.payload.title : job.kind === "login" ? "账号登录" : "登录检查"}</strong><p>{job.message || (job.state === "running" && Date.now() - Date.parse(job.updatedAt) > 1800000 ? "执行时间较长，请检查登录窗口；系统不会自动重发。" : "等待发布服务回传结果")}</p><small>{new Date(job.createdAt).toLocaleString("zh-CN")}</small></div><span className="vp-status">{states[job.state] ?? job.state}</span>{job.state === "queued" && <button className="ac-button" onClick={async () => { try { await call(`/jobs/${job.id}/cancel`, {}); await reload(); } catch (e) { setError((e as Error).message); } }}>取消</button>}</div>)}</div>}</div>
  </section>;
}
