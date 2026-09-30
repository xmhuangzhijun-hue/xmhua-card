"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Monitor, RefreshCw, Upload, Video, Send } from "lucide-react";
import { apiUrl } from "@/lib/api-client";

const platforms = [{ id: "xiaohongshu", name: "小红书" }, { id: "tencent", name: "视频号" }, { id: "douyin", name: "抖音" }, { id: "bilibili", name: "B站" }, { id: "youtube", name: "YouTube" }];
type Worker = { id: string; name: string; lastSeen: string | null; active: boolean; accounts: Record<string, { authenticated: boolean; checkedAt: string }> };
type Asset = { id: string; name: string; size: number };
type Job = { id: string; platform: string; kind: string; state: string; message: string; createdAt: string; updatedAt: string; payload: { title?: string } };
type Overview = { workers: Worker[]; assets: Asset[]; jobs: Job[] };
const messages: Record<string, string> = {
  WORKER_OFFLINE: "这台电脑已离线，请先启动本地发布助手。", ACCOUNT_CHECK_REQUIRED: "请先登录所选平台并检查登录状态。",
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
  const requestId = useRef<string | null>(null);
  const reload = useCallback(async () => { try { setData(await call<Overview>()); } catch (e) { setError((e as Error).message); } }, []);
  useEffect(() => { const start = setTimeout(() => void reload(), 0); const timer = setInterval(() => void reload(), 5000); return () => { clearTimeout(start); clearInterval(timer); }; }, [reload]);
  const worker = data?.workers.find(w => w.id === workerId && w.active) ?? data?.workers.find(w => w.active);
  const online = Boolean(worker?.lastSeen && Date.now() - Date.parse(worker.lastSeen) < 45000);
  const ready = (id: string) => Boolean(worker?.accounts[id]?.authenticated && Date.now() - Date.parse(worker.accounts[id].checkedAt) < 86400000);
  const asset = data?.assets.find(a => a.id === assetId);

  async function run(kind: string, targets: string[]) {
    if (!worker || busy) return;
    setBusy(true); setError(""); setNotice("");
    requestId.current ??= crypto.randomUUID();
    try {
      await call("/jobs", { requestId: requestId.current, workerId: worker.id, kind, platforms: targets, ...(assetId ? { assetId } : {}), title, description, tags: tags.split(/[,，]/).map(t => t.trim()).filter(Boolean), category, original });
      requestId.current = null; setConfirm(false);
      setNotice(kind === "login" ? "登录任务已发送，请在本机弹出的窗口里完成登录。" : kind === "publish" ? "发布任务已创建，可以在下方跟踪各平台结果。" : "正在检查登录状态……");
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
    <div className="vp-device"><Monitor size={20} /><div><strong>{worker?.name ?? "尚未连接发布电脑"}</strong><p>{online ? "在线 · 登录和上传在这台电脑上执行" : "启动本地发布助手后，这里会自动连接。发布时请保持电脑在线。"}</p></div><span className={online ? "vp-status is-online" : "vp-status"}>{online ? "已连接" : "未连接"}</span>{(data?.workers.filter(w => w.active).length ?? 0) > 1 && <select aria-label="发布电脑" value={worker?.id ?? ""} onChange={e => { setWorkerId(e.target.value); resetRequest(); }}>{data?.workers.filter(w => w.active).map(w => <option value={w.id} key={w.id}>{w.name}</option>)}</select>}</div>
    <div className="vp-columns"><div className="vp-card"><h2>1. 视频与文案</h2>
      <label className="vp-upload"><Upload size={25} /><strong>{progress !== null ? `上传中 ${progress}%` : asset?.name ?? "选择一个视频"}</strong><span>{asset ? `${(asset.size / 1024 / 1024).toFixed(1)} MB · 点击更换` : "MP4 · 最大 512 MB"}</span><input aria-label="选择视频" type="file" accept=".mp4,video/mp4" disabled={progress !== null || busy} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} /></label>
      {!!data?.assets.length && <label>已上传的视频<select value={assetId} onChange={e => { setAssetId(e.target.value); resetRequest(); }}><option value="">选择视频</option>{data.assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
      <label>标题<input maxLength={100} value={title} onChange={e => { setTitle(e.target.value); resetRequest(); }} placeholder="这个视频讲什么" /><small>同步小红书时，标题最多 20 个字。</small></label>
      <label>简介<textarea rows={4} maxLength={1000} value={description} onChange={e => { setDescription(e.target.value); resetRequest(); }} placeholder="补充视频介绍" /></label>
      <label>话题<input value={tags} onChange={e => { setTags(e.target.value); resetRequest(); }} placeholder="用逗号分隔，如 AI,产品,创作" /></label>
    </div><div className="vp-card"><h2>2. 发布到哪些平台</h2><p className="vp-muted">首次分别登录，后续复用登录状态。登录窗口会在发布电脑上打开。</p>
      <div className="vp-platforms">{platforms.map(p => <div key={p.id} className="vp-platform"><label><input type="checkbox" checked={selected.includes(p.id)} onChange={e => { setSelected(e.target.checked ? [...selected, p.id] : selected.filter(id => id !== p.id)); resetRequest(); }} /><strong>{p.name}</strong><span>{ready(p.id) ? "已登录" : "待登录 / 检查"}</span></label><button className="ac-button" disabled={!online || busy} onClick={() => { resetRequest(); void run("login", [p.id]); }}>登录</button></div>)}</div>
      <button className="ac-button" disabled={!online || busy} onClick={() => { resetRequest(); void run("check", platforms.map(p => p.id)); }}><RefreshCw size={14} />检查全部账号</button>
      {selected.includes("bilibili") && <label>B站分区 ID<input type="number" min={1} max={9999} value={category} onChange={e => { setCategory(Number(e.target.value)); resetRequest(); }} /><small>默认 249；请按视频内容填写创作中心对应分区。</small></label>}
      <label className="vp-original"><input type="checkbox" checked={original} onChange={e => { setOriginal(e.target.checked); resetRequest(); }} />这是我制作并拥有发布权的视频</label>
      <div className="vp-submit"><p>{selected.length ? `已选 ${selected.length} 个平台` : "选择至少一个平台"}</p><button className="ac-button ac-button--primary" disabled={!online || busy || !asset || !title.trim() || !original || !selected.length || selected.some(id => !ready(id)) || progress !== null} onClick={() => setConfirm(true)}><Send size={15} />准备发布</button></div>
      <p className="vp-muted">平台各自处理上传和审核；提交后请核对平台实际结果。</p>
    </div></div>
    {confirm && <div className="vp-confirm" role="dialog" aria-modal="true" aria-label="确认发布"><div className="vp-card"><h2>确认公开发布</h2><p>《{title}》将提交到 {platforms.filter(p => selected.includes(p.id)).map(p => p.name).join("、")}。</p><p>提交后可能立即公开。请确认视频、文案和账号无误。</p><div className="vp-actions"><button className="ac-button" disabled={busy} onClick={() => setConfirm(false)}>返回修改</button><button className="ac-button ac-button--primary" disabled={busy} onClick={() => void run("publish", selected)}>{busy ? "提交中……" : "确认发布"}</button></div></div></div>}
    <div className="vp-card"><h2>任务记录</h2>{!data?.jobs.length ? <p className="vp-empty">还没有发布任务。连接账号后，从一条视频开始。</p> : <div className="vp-jobs">{data.jobs.map(job => <div key={job.id} className="vp-job"><div><strong>{platforms.find(p => p.id === job.platform)?.name} · {job.kind === "publish" ? job.payload.title : job.kind === "login" ? "账号登录" : "登录检查"}</strong><p>{job.message || (job.state === "running" && Date.now() - Date.parse(job.updatedAt) > 1800000 ? "执行时间较长，请检查本机窗口；系统不会自动重发。" : "等待发布电脑回传结果")}</p><small>{new Date(job.createdAt).toLocaleString("zh-CN")}</small></div><span className="vp-status">{states[job.state] ?? job.state}</span>{job.state === "queued" && <button className="ac-button" onClick={async () => { try { await call(`/jobs/${job.id}/cancel`, {}); await reload(); } catch (e) { setError((e as Error).message); } }}>取消</button>}</div>)}</div>}</div>
  </section>;
}
