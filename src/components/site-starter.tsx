"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, LoaderCircle } from "lucide-react";

type CreatedSite = { tenant: { slug: string; name: string }; token: string };

export function SiteStarter() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("填写两项信息即可生成站点。");
  const [created, setCreated] = useState<CreatedSite | null>(null);

  function updateName(value: string) {
    setName(value);
    if (!slug) setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48));
  }

  async function createSite() {
    setState("loading"); setMessage("正在创建独立站点和初始内容…");
    try {
      const response = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "CREATE_FAILED");
      const data = payload.data as CreatedSite;
      sessionStorage.setItem(`xmhua-site-key:${data.tenant.slug}`, data.token);
      setCreated(data); setState("success"); setMessage("站点已创建。请立即保存管理密钥，它只显示这一次。");
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "创建失败"); }
  }

  return <main className="saas-shell">
    <header className="saas-header"><Link href="/">XMHUA</Link><Link href="/studio">已有站点</Link></header>
    <section className="start-hero"><p>NO-CODE PERSONAL SITE</p><h1>五分钟，拥有自己的博客网站。</h1><span>不装环境、不改代码。创建后直接在网页里编辑文章、作品、个人介绍和社交链接。</span></section>
    <section className="start-card">
      {!created ? <>
        <div className="step-mark">01 / CREATE</div>
        <label>站点名称<input value={name} onChange={event => updateName(event.target.value)} placeholder="例如：小明的独立博客" /></label>
        <label>专属地址<div className="slug-field"><span>?tenant=</span><input value={slug} onChange={event => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="xiaoming" /></div></label>
        <button className="saas-primary" disabled={name.trim().length < 2 || slug.length < 2 || state === "loading"} onClick={createSite}>{state === "loading" ? <LoaderCircle className="spin" /> : <ArrowRight />}创建我的站点</button>
      </> : <>
        <div className="success-title"><Check /><div><strong>{created.tenant.name} 已上线</strong><span>管理密钥只在本次创建结果中显示。</span></div></div>
        <label>管理密钥<div className="token-field"><code>{created.token}</code><button aria-label="复制管理密钥" onClick={() => navigator.clipboard.writeText(created.token)}><Copy /></button></div></label>
        <div className="created-actions"><Link className="saas-primary" href={`/studio?tenant=${created.tenant.slug}`}>进入内容工作台 <ArrowRight /></Link><Link href={`/?tenant=${created.tenant.slug}`} target="_blank">查看公开站点</Link></div>
      </>}
      <div className={`saas-notice ${state}`} role="status">{message}</div>
    </section>
    <section className="start-proof"><div><b>独立内容</b><span>每个站点的数据按租户隔离。</span></div><div><b>无需开发</b><span>表单化编辑并一键保存。</span></div><div><b>随时分享</b><span>创建后立即获得公开地址。</span></div></section>
  </main>;
}
