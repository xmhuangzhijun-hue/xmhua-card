"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { homepageContentSchema, type HomepageContent } from "@/lib/content-schema";

type State = "idle" | "loading" | "saving" | "success" | "error";

async function studioApi<T>(slug: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/studio/content?tenant=${encodeURIComponent(slug)}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "REQUEST_FAILED");
  return payload as T;
}

export function TenantStudio() {
  const [slug, setSlug] = useState(""); const [token, setToken] = useState("");
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [state, setState] = useState<State>("idle"); const [message, setMessage] = useState("输入站点标识和管理密钥后连接。");
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const value = new URLSearchParams(location.search).get("tenant") ?? "";
      setSlug(value); setToken(sessionStorage.getItem(`xmhua-site-key:${value}`) ?? "");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  async function connect() { setState("loading"); try { const payload = await studioApi<{ data: HomepageContent }>(slug, token); setContent(payload.data); sessionStorage.setItem(`xmhua-site-key:${slug}`, token); setState("success"); setMessage("内容已载入。修改后点击保存即可发布。"); } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "连接失败"); } }
  async function save() { if (!content) return; const parsed = homepageContentSchema.safeParse(content); if (!parsed.success) { setState("error"); setMessage("内容不完整，请检查必填字段。"); return; } setState("saving"); try { const payload = await studioApi<{ data: HomepageContent }>(slug, token, { method: "PUT", body: JSON.stringify(parsed.data) }); setContent(payload.data); setState("success"); setMessage("已保存并发布到公开站点。"); } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "保存失败"); } }
  function patch(section: "site" | "hero" | "author" | "footer", field: string, value: string | string[]) { if (!content) return; setContent({ ...content, [section]: { ...content[section], [field]: value } }); }

  return <main className="saas-shell studio-shell">
    <header className="saas-header"><Link href="/">XMHUA / STUDIO</Link><div><Link href="/start">创建新站</Link>{slug && <Link href={`/?tenant=${slug}`} target="_blank">查看站点 <ArrowUpRight /></Link>}</div></header>
    <section className="studio-login"><label>站点标识<input value={slug} onChange={event => setSlug(event.target.value)} placeholder="your-site" /></label><label>管理密钥<input type="password" value={token} onChange={event => setToken(event.target.value)} placeholder="site_…" /></label><button className="saas-primary" disabled={!slug || !token || state === "loading"} onClick={connect}>{state === "loading" ? <LoaderCircle className="spin" /> : "连接站点"}</button></section>
    {content && <div className="studio-layout">
      <section className="studio-form">
        <EditorSection title="品牌与首页">
          <Field label="站点名称" value={content.site.brandName} onChange={value => patch("site", "brandName", value)} />
          <Field label="头像 / Logo 图片地址" value={content.site.brandImage} onChange={value => patch("site", "brandImage", value)} />
          <Field label="首页大标题" value={content.hero.title} onChange={value => patch("hero", "title", value)} />
          <Field label="一句话定位" value={content.hero.kicker} onChange={value => patch("hero", "kicker", value)} />
          <Field area label="首页介绍" value={content.hero.description} onChange={value => patch("hero", "description", value)} />
          <Field label="标签（用逗号分隔）" value={content.hero.tags.join(", ")} onChange={value => patch("hero", "tags", value.split(",").map(item => item.trim()).filter(Boolean))} />
        </EditorSection>
        <EditorSection title="关于我">
          <Field label="关于标题" value={content.author.title} onChange={value => patch("author", "title", value)} />
          <Field area label="个人介绍" value={content.author.paragraphs.join("\n\n")} onChange={value => patch("author", "paragraphs", value.split(/\n\s*\n/).filter(Boolean))} />
        </EditorSection>
        <EditorSection title="文章">
          {content.articles.map((article, index) => <div className="repeat-card" key={article.id}><button className="remove" aria-label="删除文章" onClick={() => setContent({ ...content, articles: content.articles.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 /></button><Field label="标题" value={article.title} onChange={value => setContent({ ...content, articles: content.articles.map((item, itemIndex) => itemIndex === index ? { ...item, title: value } : item) })} /><Field label="分类" value={article.category} onChange={value => setContent({ ...content, articles: content.articles.map((item, itemIndex) => itemIndex === index ? { ...item, category: value } : item) })} /><Field area label="摘要" value={article.excerpt} onChange={value => setContent({ ...content, articles: content.articles.map((item, itemIndex) => itemIndex === index ? { ...item, excerpt: value } : item) })} /><Field label="链接" value={article.href} onChange={value => setContent({ ...content, articles: content.articles.map((item, itemIndex) => itemIndex === index ? { ...item, href: value } : item) })} /></div>)}
          <button className="add-row" onClick={() => setContent({ ...content, articles: [...content.articles, { id: Date.now(), category: "随笔", title: "新文章", excerpt: "文章摘要", publishedAt: new Date().toISOString().slice(0, 10), href: "#" }] })}><Plus />添加文章</button>
        </EditorSection>
        <EditorSection title="作品">
          {content.products.map((product, index) => <div className="repeat-card" key={product.id}><button className="remove" aria-label="删除作品" onClick={() => setContent({ ...content, products: content.products.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 /></button><Field label="名称" value={product.name} onChange={value => setContent({ ...content, products: content.products.map((item, itemIndex) => itemIndex === index ? { ...item, name: value } : item) })} /><Field label="副标题" value={product.subtitle} onChange={value => setContent({ ...content, products: content.products.map((item, itemIndex) => itemIndex === index ? { ...item, subtitle: value } : item) })} /><Field area label="介绍" value={product.summary} onChange={value => setContent({ ...content, products: content.products.map((item, itemIndex) => itemIndex === index ? { ...item, summary: value } : item) })} /><Field label="图片地址" value={product.image} onChange={value => setContent({ ...content, products: content.products.map((item, itemIndex) => itemIndex === index ? { ...item, image: value } : item) })} /><Field label="链接" value={product.href} onChange={value => setContent({ ...content, products: content.products.map((item, itemIndex) => itemIndex === index ? { ...item, href: value } : item) })} /></div>)}
          <button className="add-row" onClick={() => setContent({ ...content, products: [...content.products, { id: Date.now(), image: content.site.brandImage, name: "新作品", subtitle: "作品简介", summary: "介绍你的作品。", platform: "Web", href: "#" }] })}><Plus />添加作品</button>
        </EditorSection>
        <EditorSection title="社交链接">
          {content.socials.map((social, index) => <div className="repeat-card" key={social.id}><button className="remove" aria-label="删除社交链接" onClick={() => setContent({ ...content, socials: content.socials.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 /></button><Field label="平台" value={social.label} onChange={value => setContent({ ...content, socials: content.socials.map((item, itemIndex) => itemIndex === index ? { ...item, label: value } : item) })} /><Field label="账号" value={social.handle} onChange={value => setContent({ ...content, socials: content.socials.map((item, itemIndex) => itemIndex === index ? { ...item, handle: value } : item) })} /><Field label="链接" value={social.href} onChange={value => setContent({ ...content, socials: content.socials.map((item, itemIndex) => itemIndex === index ? { ...item, href: value } : item) })} /><Field label="图标地址" value={social.icon} onChange={value => setContent({ ...content, socials: content.socials.map((item, itemIndex) => itemIndex === index ? { ...item, icon: value } : item) })} /></div>)}
          <button className="add-row" onClick={() => setContent({ ...content, socials: [...content.socials, { id: Date.now(), icon: "/sites/hooosberg-com-db2980a2/root-8a5edab2/icons/github.svg", label: "GitHub", handle: "your-name", href: "#" }] })}><Plus />添加社交链接</button>
        </EditorSection>
      </section>
      <aside className="publish-panel"><p>当前站点</p><strong>{content.site.brandName}</strong><span>/{slug}</span><button className="saas-primary" onClick={save} disabled={state === "saving"}>{state === "saving" ? <LoaderCircle className="spin" /> : <Save />}保存并发布</button><div className={`saas-notice ${state}`} role="status">{message}</div></aside>
    </div>}
    {!content && <div className={`saas-notice standalone ${state}`} role="status">{message}</div>}
  </main>;
}

function EditorSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="editor-section"><h2>{title}</h2>{children}</section>; }
function Field({ label, value, onChange, area = false }: { label: string; value: string; onChange: (value: string) => void; area?: boolean }) { return <label className="studio-field"><span>{label}</span>{area ? <textarea value={value} onChange={event => onChange(event.target.value)} /> : <input value={value} onChange={event => onChange(event.target.value)} />}</label>; }
