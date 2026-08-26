"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { homepageContentSchema, type HomepageContent } from "@/lib/content-schema";
import { apiUrl } from "@/lib/api-client";

type State = "idle" | "loading" | "saving" | "success" | "error";

async function studioApi<T>(slug: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(`/api/studio/content?tenant=${encodeURIComponent(slug)}`), { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "REQUEST_FAILED");
  return payload as T;
}

export function TenantStudio() {
  const [slug, setSlug] = useState(""); const [token, setToken] = useState("");
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [state, setState] = useState<State>("idle"); const [message, setMessage] = useState("输入站点标识和管理密钥后连接。");
  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      const value = new URLSearchParams(location.search).get("tenant") ?? "";
      const stored = sessionStorage.getItem(`xmhua-site-key:${value}`) ?? "";
      setSlug(value); setToken(stored);
      if (value) {
        setState("loading");
        try { const payload = await studioApi<{ data: HomepageContent }>(value, stored); setContent(payload.data); setState("success"); setMessage("内容已载入。修改后点击保存即可发布。"); }
        catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "连接失败"); }
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  async function connect(selectedSlug = slug, suppliedToken = token) { setState("loading"); try { const payload = await studioApi<{ data: HomepageContent }>(selectedSlug, suppliedToken); setContent(payload.data); if (suppliedToken) sessionStorage.setItem(`xmhua-site-key:${selectedSlug}`, suppliedToken); setState("success"); setMessage("内容已载入。修改后点击保存即可发布。"); } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "连接失败"); } }
  async function save() { if (!content) return; const parsed = homepageContentSchema.safeParse(content); if (!parsed.success) { setState("error"); setMessage("内容不完整，请检查必填字段。"); return; } setState("saving"); try { const payload = await studioApi<{ data: HomepageContent }>(slug, token, { method: "PUT", body: JSON.stringify(parsed.data) }); setContent(payload.data); setState("success"); setMessage("已保存并发布到公开站点。"); } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "保存失败"); } }
  function patch(section: "site" | "hero" | "author" | "footer", field: string, value: string | string[]) { if (!content) return; setContent({ ...content, [section]: { ...content[section], [field]: value } }); }

  return <main className="saas-shell studio-shell">
    <header className="saas-header"><Link href="/">XMHUA / STUDIO</Link><div><Link href="/start">创建新站</Link>{slug && <Link href={`/?tenant=${slug}`} target="_blank">查看站点 <ArrowUpRight /></Link>}</div></header>
    <section className="studio-login"><label>站点标识<input value={slug} onChange={event => setSlug(event.target.value)} placeholder="your-site" /></label><label>站点管理密钥<input type="password" value={token} onChange={event => setToken(event.target.value)} placeholder="输入创建站点时获得的密钥" /></label><button className="saas-primary" disabled={!slug || state === "loading"} onClick={() => connect()}>{state === "loading" ? <LoaderCircle className="spin" /> : "连接站点"}</button></section>
    {content && <div className="studio-layout">
      <section className="studio-form">
        <EditorSection title="站点导航与公告">
          <Field label="公告正文" value={content.site.announcement} onChange={value => patch("site", "announcement", value)} />
          <Field label="公告链接文字" value={content.site.announcementLink.label} onChange={value => setContent({ ...content, site: { ...content.site, announcementLink: { ...content.site.announcementLink, label: value } } })} />
          <Field label="公告链接地址" value={content.site.announcementLink.href} onChange={value => setContent({ ...content, site: { ...content.site, announcementLink: { ...content.site.announcementLink, href: value } } })} />
          <Field label="公告代码 / 短标签" value={content.site.announcementCode} onChange={value => patch("site", "announcementCode", value)} />
          <Field label="公告尾部文字" value={content.site.announcementSuffix} onChange={value => patch("site", "announcementSuffix", value)} />
          {content.site.navigation.map((link, index) => <div className="repeat-card" key={`${link.label}-${index}`}><button className="remove" aria-label="删除导航" onClick={() => setContent({ ...content, site: { ...content.site, navigation: content.site.navigation.filter((_, itemIndex) => itemIndex !== index) } })}><Trash2 /></button><Field label="导航名称" value={link.label} onChange={value => setContent({ ...content, site: { ...content.site, navigation: content.site.navigation.map((item, itemIndex) => itemIndex === index ? { ...item, label: value } : item) } })} /><Field label="导航地址" value={link.href} onChange={value => setContent({ ...content, site: { ...content.site, navigation: content.site.navigation.map((item, itemIndex) => itemIndex === index ? { ...item, href: value } : item) } })} /></div>)}
          <button className="add-row" onClick={() => setContent({ ...content, site: { ...content.site, navigation: [...content.site.navigation, { label: "新导航", href: "#" }] } })}><Plus />添加导航</button>
        </EditorSection>
        <EditorSection title="品牌与首页">
          <Field label="站点名称" value={content.site.brandName} onChange={value => patch("site", "brandName", value)} />
          <Field label="头像 / Logo 图片地址" value={content.site.brandImage} onChange={value => patch("site", "brandImage", value)} />
          <Field label="浏览器页面标题" value={content.ui.pageTitle} onChange={value => setContent({ ...content, ui: { ...content.ui, pageTitle: value } })} />
          <Field label="首页大标题" value={content.hero.title} onChange={value => patch("hero", "title", value)} />
          <Field label="一句话定位" value={content.hero.kicker} onChange={value => patch("hero", "kicker", value)} />
          <Field area label="首页介绍" value={content.hero.description} onChange={value => patch("hero", "description", value)} />
          <Field label="标签（用逗号分隔）" value={content.hero.tags.join(", ")} onChange={value => patch("hero", "tags", value.split(",").map(item => item.trim()).filter(Boolean))} />
          <Field label="主按钮文字" value={content.hero.primaryAction.label} onChange={value => setContent({ ...content, hero: { ...content.hero, primaryAction: { ...content.hero.primaryAction, label: value } } })} />
          <Field label="主按钮地址" value={content.hero.primaryAction.href} onChange={value => setContent({ ...content, hero: { ...content.hero, primaryAction: { ...content.hero.primaryAction, href: value } } })} />
          <Field label="次按钮文字" value={content.hero.secondaryAction.label} onChange={value => setContent({ ...content, hero: { ...content.hero, secondaryAction: { ...content.hero.secondaryAction, label: value } } })} />
          <Field label="次按钮地址" value={content.hero.secondaryAction.href} onChange={value => setContent({ ...content, hero: { ...content.hero, secondaryAction: { ...content.hero.secondaryAction, href: value } } })} />
        </EditorSection>
        <EditorSection title="区块标题">
          {(["articles", "products", "directory"] as const).map(section => <div className="repeat-card" key={section}><Field label="区块眉题" value={content.sections[section].eyebrow} onChange={value => setContent({ ...content, sections: { ...content.sections, [section]: { ...content.sections[section], eyebrow: value } } })} /><Field label="区块标题" value={content.sections[section].title} onChange={value => setContent({ ...content, sections: { ...content.sections, [section]: { ...content.sections[section], title: value } } })} /><Field area label="区块说明" value={content.sections[section].description} onChange={value => setContent({ ...content, sections: { ...content.sections, [section]: { ...content.sections[section], description: value } } })} /></div>)}
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
          <button className="add-row" onClick={() => setContent({ ...content, socials: [...content.socials, { id: Date.now(), icon: "/xmhua-mark.svg", label: "GitHub", handle: "your-name", href: "#" }] })}><Plus />添加社交链接</button>
        </EditorSection>
        <EditorSection title="能力与资源">
          <Field label="小标题" value={content.directory.kicker} onChange={value => setContent({ ...content, directory: { ...content.directory, kicker: value } })} />
          <Field label="标题" value={content.directory.title} onChange={value => setContent({ ...content, directory: { ...content.directory, title: value } })} />
          <Field area label="说明" value={content.directory.description} onChange={value => setContent({ ...content, directory: { ...content.directory, description: value } })} />
          {content.directory.links.map((link, index) => <div className="repeat-card" key={link.id}><button className="remove" aria-label="删除资源" onClick={() => setContent({ ...content, directory: { ...content.directory, links: content.directory.links.filter((_, itemIndex) => itemIndex !== index) } })}><Trash2 /></button><Field label="名称" value={link.title} onChange={value => setContent({ ...content, directory: { ...content.directory, links: content.directory.links.map((item, itemIndex) => itemIndex === index ? { ...item, title: value } : item) } })} /><Field area label="说明" value={link.description} onChange={value => setContent({ ...content, directory: { ...content.directory, links: content.directory.links.map((item, itemIndex) => itemIndex === index ? { ...item, description: value } : item) } })} /><Field label="链接" value={link.href} onChange={value => setContent({ ...content, directory: { ...content.directory, links: content.directory.links.map((item, itemIndex) => itemIndex === index ? { ...item, href: value } : item) } })} /></div>)}
          <button className="add-row" onClick={() => setContent({ ...content, directory: { ...content.directory, links: [...content.directory.links, { id: Date.now(), icon: "search", title: "新资源", description: "资源说明", href: "#" }] } })}><Plus />添加资源</button>
        </EditorSection>
        <EditorSection title="页脚与界面文字">
          <Field label="页脚介绍" value={content.footer.description} onChange={value => patch("footer", "description", value)} />
          <Field label="页脚说明" value={content.footer.note} onChange={value => patch("footer", "note", value)} />
          <Field label="版权信息" value={content.footer.copyright} onChange={value => patch("footer", "copyright", value)} />
          <Field label="产品主按钮" value={content.ui.productStoreLabel} onChange={value => setContent({ ...content, ui: { ...content.ui, productStoreLabel: value } })} />
          <Field label="产品次按钮" value={content.ui.productNotesLabel} onChange={value => setContent({ ...content, ui: { ...content.ui, productNotesLabel: value } })} />
          <Field label="Email 名称" value={content.ui.emailLink.label} onChange={value => setContent({ ...content, ui: { ...content.ui, emailLink: { ...content.ui.emailLink, label: value } } })} />
          <Field label="Email 地址" value={content.ui.emailLink.href} onChange={value => setContent({ ...content, ui: { ...content.ui, emailLink: { ...content.ui.emailLink, href: value } } })} />
          <label className="studio-check"><input type="checkbox" checked={content.ui.analytics.enabled} onChange={event => setContent({ ...content, ui: { ...content.ui, analytics: { ...content.ui.analytics, enabled: event.target.checked } } })} />启用统计授权弹层</label>
          <Field label="统计弹层标题" value={content.ui.analytics.title} onChange={value => setContent({ ...content, ui: { ...content.ui, analytics: { ...content.ui.analytics, title: value } } })} />
          <Field area label="统计弹层说明" value={content.ui.analytics.description} onChange={value => setContent({ ...content, ui: { ...content.ui, analytics: { ...content.ui.analytics, description: value } } })} />
        </EditorSection>
      </section>
      <aside className="publish-panel"><p>当前站点</p><strong>{content.site.brandName}</strong><span>/{slug}</span><button className="saas-primary" onClick={save} disabled={state === "saving"}>{state === "saving" ? <LoaderCircle className="spin" /> : <Save />}保存并发布</button><div className={`saas-notice ${state}`} role="status">{message}</div></aside>
    </div>}
    {!content && <div className={`saas-notice standalone ${state}`} role="status">{message}</div>}
  </main>;
}

function EditorSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="editor-section"><h2>{title}</h2>{children}</section>; }
function Field({ label, value, onChange, area = false }: { label: string; value: string; onChange: (value: string) => void; area?: boolean }) { return <label className="studio-field"><span>{label}</span>{area ? <textarea value={value} onChange={event => onChange(event.target.value)} /> : <input value={value} onChange={event => onChange(event.target.value)} />}</label>; }
