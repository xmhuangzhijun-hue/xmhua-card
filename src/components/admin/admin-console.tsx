"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight, ExternalLink, FileText, KeyRound, LayoutGrid, LoaderCircle,
  LogOut, Notebook, Settings, Share2, TriangleAlert,
} from "lucide-react";
import { adminApi, describeError, type Overview } from "./admin-api";
import { CollectionEditor, type CollectionConfig } from "./collection-editor";
import { SettingsEditor } from "./settings-editor";
import { LoginForm } from "./login-form";

const placeholderHref = (value: unknown) => {
  const href = String(value ?? "").trim();
  return !href || href === "#";
};

const articles: CollectionConfig = {
  collection: "articles",
  singular: "笔记",
  reorderable: true,
  title: row => String(row.title || ""),
  subtitle: row => `${row.category} · ${row.publishedAt}`,
  incomplete: row => {
    if (!row.published) return "草稿";
    return String(row.body ?? "").trim().length < 200 ? "正文太短" : null;
  },
  blank: {
    category: "", title: "", excerpt: "",
    publishedAt: new Date().toISOString().slice(0, 10),
    slug: "", body: "", published: false, sourceUrl: "", sourceLabel: "",
  },
  fields: [
    { name: "title", label: "标题", type: "text", placeholder: "这篇笔记讲什么" },
    { name: "slug", label: "网址后缀", type: "slug", prefix: "/notes/" },
    { name: "category", label: "分类", type: "text", help: "分类会自动成为笔记页的筛选项。", placeholder: "工程方法" },
    { name: "publishedAt", label: "发布日期", type: "date" },
    { name: "excerpt", label: "摘要", type: "textarea", help: "列表和搜索结果里显示的一两句话。" },
    {
      name: "sourceUrl", label: "原文链接", type: "url",
      help: "这篇笔记讲的东西在哪——论文、文章、仓库地址。会显示在正文上方，留空就不显示。",
      placeholder: "https://arxiv.org/abs/…",
    },
    {
      name: "sourceLabel", label: "原文标题", type: "text",
      help: "原文链接显示成什么文字。留空就显示域名。",
      visibleWhen: row => Boolean(String(row.sourceUrl ?? "").trim()),
    },
    { name: "published", label: "已发布", type: "boolean", help: "关掉就是草稿，公开页面看不到。" },
    { name: "body", label: "正文", type: "markdown", placeholder: "开始写……" },
  ],
};

const products: CollectionConfig = {
  collection: "products",
  singular: "项目",
  reorderable: true,
  title: row => String(row.name || ""),
  subtitle: row => String(row.subtitle || ""),
  incomplete: row => (placeholderHref(row.href) ? "没填链接" : null),
  blank: { image: "/xmhua-mark.svg", name: "", subtitle: "", summary: "", platform: "", href: "", published: true },
  fields: [
    { name: "name", label: "项目名称", type: "text" },
    { name: "subtitle", label: "一句话定位", type: "text" },
    { name: "summary", label: "项目介绍", type: "textarea" },
    { name: "platform", label: "标签", type: "text", placeholder: "Agent / SaaS" },
    { name: "href", label: "项目链接", type: "url", help: "没填的话，卡片只显示介绍，不会出现点不开的按钮。" },
    { name: "image", label: "图标地址", type: "text" },
    { name: "published", label: "显示在首页", type: "boolean" },
  ],
};

const isQrKind = (row: { kind?: unknown }) => String(row.kind ?? "link") === "qrcode";

const socialLinks: CollectionConfig = {
  collection: "social-links",
  singular: "社交账号",
  reorderable: true,
  title: row => String(row.label || ""),
  subtitle: row => String(row.handle || ""),
  incomplete: row => {
    // A QR entry is publishable once it has an image; a link entry needs a URL.
    if (isQrKind(row)) return String(row.qrAsset ?? "").trim() ? null : "还没传二维码，不会显示";
    return placeholderHref(row.href) ? "没绑定，不会显示" : null;
  },
  blank: { icon: "/xmhua-mark.svg", label: "", handle: "", href: "", kind: "link", qrAsset: "", note: "" },
  fields: [
    {
      name: "kind", label: "类型", type: "select",
      help: "微信这类没有可跳转主页的平台选「扫码」，访客点开会看到二维码。",
      options: [
        { value: "link", label: "链接 — 点击跳转到主页" },
        { value: "qrcode", label: "扫码 — 点击弹出二维码" },
      ],
    },
    { name: "label", label: "平台", type: "text", placeholder: "微信" },
    { name: "handle", label: "账号名", type: "text", help: "页面上显示的账号昵称或 ID。扫码类型下会附一个「复制」按钮。" },
    {
      name: "qrAsset", label: "二维码图片", type: "image",
      help: "微信 → 我 → 我的二维码 → 保存图片，然后传上来。支持 PNG / JPG / WebP，2MB 以内。",
      visibleWhen: isQrKind,
    },
    {
      name: "note", label: "扫码提示语", type: "text",
      placeholder: "扫码加我微信，请备注来意",
      help: "显示在二维码下方。留空则用默认提示。",
      visibleWhen: isQrKind,
    },
    {
      name: "href", label: "主页链接", type: "url",
      help: "打开你在该平台主页的完整地址，点击后会新标签页跳转。没填就不显示这一项。",
      visibleWhen: row => !isQrKind(row),
    },
    {
      name: "href", label: "附带主页链接（可选）", type: "url",
      help: "扫码类型下可留空。填了会在二维码下方多一个「打开主页」入口，适合公众号。",
      visibleWhen: isQrKind,
    },
    { name: "icon", label: "图标地址", type: "text" },
  ],
};

const directoryLinks: CollectionConfig = {
  collection: "directory-links",
  singular: "能力卡片",
  reorderable: true,
  title: row => String(row.title || ""),
  subtitle: row => String(row.description || ""),
  incomplete: row => (placeholderHref(row.href) ? "没填链接" : null),
  blank: { icon: "search", title: "", description: "", href: "" },
  fields: [
    { name: "title", label: "标题", type: "text" },
    { name: "description", label: "说明", type: "textarea" },
    { name: "href", label: "链接", type: "url", help: "没填的话卡片仍然显示，只是不可点击。" },
    {
      name: "icon", label: "图标", type: "select",
      options: [
        { value: "search", label: "放大镜" },
        { value: "code", label: "代码" },
        { value: "layers", label: "分层" },
        { value: "shield", label: "盾牌" },
      ],
    },
  ],
};

const pages: CollectionConfig = {
  collection: "pages",
  singular: "页面",
  title: row => String(row.title || ""),
  subtitle: row => `/${row.slug}`,
  incomplete: row => (row.published ? null : "未发布"),
  blank: { slug: "", title: "", description: "", body: "", published: true },
  fields: [
    { name: "title", label: "页面标题", type: "text" },
    { name: "slug", label: "网址后缀", type: "slug", prefix: "/" },
    { name: "description", label: "副标题", type: "textarea" },
    { name: "published", label: "已发布", type: "boolean" },
    { name: "body", label: "正文", type: "markdown" },
  ],
};

type TabId = "overview" | "articles" | "products" | "socials" | "directory" | "pages" | "settings" | "account";

const tabs: { id: TabId; label: string; icon: typeof Notebook }[] = [
  { id: "overview", label: "总览", icon: LayoutGrid },
  { id: "articles", label: "笔记", icon: Notebook },
  { id: "products", label: "项目", icon: LayoutGrid },
  { id: "socials", label: "社交账号", icon: Share2 },
  { id: "directory", label: "能力卡片", icon: LayoutGrid },
  { id: "pages", label: "独立页面", icon: FileText },
  { id: "settings", label: "站点设置", icon: Settings },
  { id: "account", label: "账号", icon: KeyRound },
];

export function AdminConsole() {
  const [status, setStatus] = useState<"checking" | "signed-out" | "signed-in">("checking");
  const [username, setUsername] = useState("");
  const [tab, setTab] = useState<TabId>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);

  const refreshOverview = useCallback(async () => {
    try {
      setOverview(await adminApi.overview());
    } catch {
      setOverview(null);
    }
  }, []);

  useEffect(() => {
    adminApi.me()
      .then(identity => {
        setUsername(identity.username);
        setStatus("signed-in");
        void refreshOverview();
      })
      .catch(() => setStatus("signed-out"));
  }, [refreshOverview]);

  if (status === "checking") {
    return <main className="ac-boot"><LoaderCircle className="ac-spin" size={22} /><p>正在检查登录状态……</p></main>;
  }

  if (status === "signed-out") {
    return (
      <LoginForm onSignedIn={name => {
        setUsername(name);
        setStatus("signed-in");
        void refreshOverview();
      }} />
    );
  }

  async function signOut() {
    await adminApi.logout().catch(() => undefined);
    setStatus("signed-out");
  }

  return (
    <main className="ac-shell">
      <header className="ac-masthead">
        <div className="ac-masthead__brand">
          <Link href="/">XMHUA</Link>
          <span>内容后台</span>
        </div>
        <div className="ac-masthead__right">
          <a href="/" target="_blank" rel="noreferrer" className="ac-button">
            查看网站 <ExternalLink size={14} />
          </a>
          <span className="ac-masthead__user">{username}</span>
          <button type="button" className="ac-button" onClick={signOut}><LogOut size={14} />退出</button>
        </div>
      </header>

      <nav className="ac-tabs">
        {tabs.map(item => (
          <button type="button" key={item.id} className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)}>
            <item.icon size={15} />{item.label}
          </button>
        ))}
      </nav>

      <div className="ac-panel">
        {tab === "overview" && <OverviewPanel overview={overview} onJump={setTab} />}
        {tab === "articles" && <CollectionEditor config={articles} onChanged={refreshOverview} />}
        {tab === "products" && <CollectionEditor config={products} onChanged={refreshOverview} />}
        {tab === "socials" && <CollectionEditor config={socialLinks} onChanged={refreshOverview} />}
        {tab === "directory" && <CollectionEditor config={directoryLinks} onChanged={refreshOverview} />}
        {tab === "pages" && <CollectionEditor config={pages} onChanged={refreshOverview} />}
        {tab === "settings" && <SettingsEditor onChanged={refreshOverview} />}
        {tab === "account" && <AccountPanel onSignedOut={() => setStatus("signed-out")} />}
      </div>
    </main>
  );
}

function OverviewPanel({ overview, onJump }: { overview: Overview | null; onJump: (tab: TabId) => void }) {
  if (!overview) return <div className="ac-form__placeholder"><p>正在读取站点数据……</p></div>;

  const { counts, unfinished } = overview;
  const candidates: { label: string; items: string[]; tab: TabId }[] = [
    { label: "正文太短的笔记", items: unfinished.emptyArticleBodies, tab: "articles" },
    { label: "还没填链接的项目", items: unfinished.placeholderProducts, tab: "products" },
    { label: "还没绑定的社交账号", items: unfinished.placeholderSocials, tab: "socials" },
    { label: "还没填链接的能力卡片", items: unfinished.placeholderDirectory, tab: "directory" },
  ];
  const todos = candidates.filter(entry => entry.items.length > 0);

  return (
    <div className="ac-overview">
      <div className="ac-stats">
        <button type="button" onClick={() => onJump("articles")}>
          <strong>{counts.articlesPublished}<small> / {counts.articles}</small></strong><span>已发布笔记</span>
        </button>
        <button type="button" onClick={() => onJump("products")}>
          <strong>{counts.products}</strong><span>项目</span>
        </button>
        <button type="button" onClick={() => onJump("socials")}>
          <strong>{counts.socials}</strong><span>社交账号</span>
        </button>
        <button type="button" onClick={() => onJump("pages")}>
          <strong>{counts.pages}</strong><span>独立页面</span>
        </button>
      </div>

      {todos.length > 0 ? (
        <section className="ac-todo">
          <h2><TriangleAlert size={17} />还没完成的部分</h2>
          <p>下面这些内容在公开页面上要么是空的，要么因为没填链接而被隐藏。填完它们，网站才算真的对外可用。</p>
          {todos.map(entry => (
            <div className="ac-todo__group" key={entry.label}>
              <div className="ac-todo__head">
                <strong>{entry.label}（{entry.items.length}）</strong>
                <button type="button" className="ac-button" onClick={() => onJump(entry.tab)}>
                  去处理 <ArrowUpRight size={14} />
                </button>
              </div>
              <ul>{entry.items.map(item => <li key={item}>{item}</li>)}</ul>
            </div>
          ))}
        </section>
      ) : (
        <section className="ac-todo ac-todo--clear">
          <h2>所有条目都填完了。</h2>
          <p>公开页面上没有空正文，也没有点不开的链接。</p>
        </section>
      )}
    </div>
  );
}

function AccountPanel({ onSignedOut }: { onSignedOut: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (nextPassword !== confirmPassword) {
      setNotice({ tone: "error", text: "两次输入的新密码不一致。" });
      return;
    }
    if (nextPassword.length < 10) {
      setNotice({ tone: "error", text: "新密码至少 10 位。" });
      return;
    }
    setBusy(true);
    try {
      await adminApi.changePassword(currentPassword, nextPassword);
      setNotice({ tone: "ok", text: "密码已修改，所有登录状态已失效，请重新登录。" });
      window.setTimeout(onSignedOut, 1200);
    } catch (error) {
      setNotice({ tone: "error", text: describeError(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="ac-account" onSubmit={submit}>
      <h2>修改密码</h2>
      <p>改完密码后，所有设备上的登录都会失效，需要用新密码重新登录。</p>
      <label>当前密码
        <input type="password" autoComplete="current-password" value={currentPassword}
          onChange={event => setCurrentPassword(event.target.value)} required />
      </label>
      <label>新密码
        <input type="password" autoComplete="new-password" value={nextPassword}
          onChange={event => setNextPassword(event.target.value)} required minLength={10} />
      </label>
      <label>再输一次新密码
        <input type="password" autoComplete="new-password" value={confirmPassword}
          onChange={event => setConfirmPassword(event.target.value)} required minLength={10} />
      </label>
      <button type="submit" className="ac-button ac-button--primary" disabled={busy}>
        {busy ? <LoaderCircle className="ac-spin" size={15} /> : <KeyRound size={15} />}修改密码
      </button>
      {notice && <p className={`ac-notice ac-notice--${notice.tone}`} role="status">{notice.text}</p>}
    </form>
  );
}
