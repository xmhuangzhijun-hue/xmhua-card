"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Database, FileJson, KeyRound, LoaderCircle, Plus, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { homepageContentSchema, type HomepageContent } from "@/lib/content-schema";

type Tenant = { id: number; slug: string; name: string; active: boolean; updatedAt: string };
type State = "idle" | "loading" | "saving" | "success" | "error";

async function api<T>(path: string, key: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...init?.headers } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "REQUEST_FAILED");
  return payload as T;
}

export function ContentAdmin() {
  const [key, setKey] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenant, setTenant] = useState("xmhua");
  const [document, setDocument] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("输入管理密钥，连接内容数据库。");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({ slug: "", name: "" });

  useEffect(() => { setKey(sessionStorage.getItem("xmhua-admin-key") ?? ""); }, []);
  const parsed = useMemo(() => { try { return homepageContentSchema.safeParse(JSON.parse(document)); } catch { return null; } }, [document]);
  const valid = parsed?.success === true;
  const stats = valid ? { articles: parsed.data.articles.length, products: parsed.data.products.length, links: parsed.data.directory.links.length, socials: parsed.data.socials.length } : null;

  async function connect(selected = tenant, suppliedKey = key) {
    if (!suppliedKey) { setMessage("请先输入管理密钥。"); return; }
    setState("loading");
    try {
      sessionStorage.setItem("xmhua-admin-key", suppliedKey);
      const tenantPayload = await api<{ data: Tenant[] }>("/api/admin/tenants", suppliedKey);
      const selectedTenant = tenantPayload.data.some(item => item.slug === selected) ? selected : tenantPayload.data[0]?.slug;
      if (!selectedTenant) throw new Error("NO_TENANTS");
      setTenants(tenantPayload.data); setTenant(selectedTenant);
      const contentPayload = await api<{ data: HomepageContent }>(`/api/admin/content?tenant=${encodeURIComponent(selectedTenant)}`, suppliedKey);
      setDocument(JSON.stringify(contentPayload.data, null, 2)); setState("success"); setMessage(`已连接 ${selectedTenant}，内容从 PostgreSQL 读取。`);
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "连接失败"); }
  }

  async function selectTenant(slug: string) { setTenant(slug); await connect(slug); }
  async function save() {
    if (!valid) { setState("error"); setMessage("内容文档未通过结构校验，不能保存。"); return; }
    setState("saving");
    try {
      const payload = await api<{ data: HomepageContent }>(`/api/admin/content?tenant=${encodeURIComponent(tenant)}`, key, { method: "PUT", body: JSON.stringify(parsed.data) });
      setDocument(JSON.stringify(payload.data, null, 2)); setState("success"); setMessage(`已保存 ${tenant}，公开 API 会读取这份内容。`);
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "保存失败"); }
  }

  async function create() {
    setState("saving");
    try {
      await api("/api/admin/tenants", key, { method: "POST", body: JSON.stringify({ ...newTenant, seedContent: true }) });
      setCreateOpen(false); setNewTenant({ slug: "", name: "" }); await connect(newTenant.slug);
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "创建失败"); }
  }

  return <main className="admin-shell">
    <header className="admin-masthead"><Link href="/" className="admin-brand">XMHUA <span>/ CONTENT OPS</span></Link><a href={`/?tenant=${tenant}`} target="_blank">查看站点 <ArrowUpRight size={15}/></a></header>
    <section className="admin-intro"><div><p>PRIVATE CONTENT LEDGER</p><h1>把名片内容留在数据库里。</h1><span>按租户隔离读取与写入。每次保存都经过服务端校验，并在单个数据库事务中完成。</span></div><div className="admin-security"><ShieldCheck size={20}/><div><strong>服务端写入门禁</strong><span>密钥仅保存在当前浏览器会话</span></div></div></section>
    <div className="admin-grid">
      <aside className="tenant-rail">
        <div className="rail-heading"><span>租户</span><button onClick={() => setCreateOpen(!createOpen)} aria-label="新建租户"><Plus size={16}/></button></div>
        {createOpen && <div className="tenant-create"><input aria-label="租户名称" placeholder="展示名称" value={newTenant.name} onChange={event => setNewTenant({ ...newTenant, name: event.target.value })}/><input aria-label="租户标识" placeholder="tenant-slug" value={newTenant.slug} onChange={event => setNewTenant({ ...newTenant, slug: event.target.value.toLowerCase() })}/><button onClick={create} disabled={!newTenant.name || !newTenant.slug}>创建并复制初始内容</button></div>}
        <div className="tenant-list">{tenants.length ? tenants.map(item => <button className={item.slug === tenant ? "active" : ""} key={item.id} onClick={() => selectTenant(item.slug)}><span>{item.name}</span><small>{item.slug}</small></button>) : <p>连接后显示租户</p>}</div>
        <div className="key-panel"><label htmlFor="admin-key"><KeyRound size={15}/> 管理密钥</label><input id="admin-key" type="password" autoComplete="off" placeholder="ADMIN_API_KEY" value={key} onChange={event => setKey(event.target.value)}/><button onClick={() => connect()} disabled={!key || state === "loading"}>{state === "loading" ? <LoaderCircle className="spin" size={15}/> : <Database size={15}/>}连接数据库</button></div>
      </aside>
      <section className="editor-panel">
        <div className="editor-toolbar"><div><p>CONTENT DOCUMENT</p><h2>{tenants.find(item => item.slug === tenant)?.name ?? tenant}</h2></div><div className="editor-actions"><button onClick={() => connect()} disabled={!key || state === "loading"}><RefreshCw size={15}/>重新读取</button><button className="primary" onClick={save} disabled={!valid || state === "saving"}>{state === "saving" ? <LoaderCircle className="spin" size={15}/> : <Save size={15}/>}保存到数据库</button></div></div>
        <div className="content-stats">{stats ? <><span><b>{stats.articles}</b> 篇笔记</span><span><b>{stats.products}</b> 个产品</span><span><b>{stats.links}</b> 个导航</span><span><b>{stats.socials}</b> 个社交入口</span></> : <span><FileJson size={15}/>等待有效内容文档</span>}</div>
        <label className="document-label" htmlFor="content-document"><span>结构化内容 JSON</span><small className={valid ? "valid" : "invalid"}>{valid ? <><Check size={13}/>结构有效</> : "未连接或结构无效"}</small></label>
        <textarea id="content-document" spellCheck={false} value={document} onChange={event => setDocument(event.target.value)} placeholder="连接数据库后在这里编辑完整内容。"/>
        <div className={`admin-notice ${state}`} role="status">{message}</div>
      </section>
    </div>
  </main>;
}
