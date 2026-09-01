"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Moon, Search, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api-client";
import { homepageContentSchema, type HomepageContent } from "@/lib/content-schema";

const allCategory = "全部";

function isReadableHref(href: string) {
  return href !== "" && href !== "#";
}

export function NotesLibrary() {
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [category, setCategory] = useState(allCategory);
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    const controller = new AbortController();
    const tenant = new URLSearchParams(window.location.search).get("tenant");
    fetch(apiUrl(`/api/content${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ""}`), { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("content request failed");
        return response.json();
      })
      .then(payload => setContent(homepageContentSchema.parse(payload.data)))
      .catch(fetchError => {
        if (fetchError.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, []);

  const categories = useMemo(
    () => content ? [allCategory, ...Array.from(new Set(content.articles.map(article => article.category)))] : [allCategory],
    [content],
  );

  const visibleArticles = useMemo(() => {
    if (!content) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    return content.articles.filter(article => {
      const matchesCategory = category === allCategory || article.category === category;
      const haystack = `${article.title} ${article.excerpt} ${article.category}`.toLocaleLowerCase("zh-CN");
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [category, content, query]);

  if (error) return <main className="notes-state"><p>笔记暂时无法读取，请稍后再试。</p><Link href="/">返回首页</Link></main>;
  if (!content) return <main className="notes-state" aria-busy="true"><p>正在整理笔记……</p></main>;

  return <main className="notes-page">
    <header className="notes-nav">
      <Link className="notes-brand" href="/" aria-label="返回 XMHUA 首页">
        <Image src={content.site.brandImage} alt="" width={29} height={29} priority />
        <strong>{content.site.brandName}</strong>
      </Link>
      <nav aria-label="笔记页导航">
        <Link href="/">首页</Link>
        <Link href="/work">案例</Link>
        <button type="button" onClick={() => setDark(!dark)} aria-label="切换深浅色主题">
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </nav>
    </header>

    <section className="notes-intro" aria-labelledby="notes-title">
      <div>
        <p>PUBLIC WORKING NOTES</p>
        <h1 id="notes-title">公开笔记</h1>
        <span>记录 AI 产品、Agent、数据系统与独立开发中的真实问题、判断和复盘。</span>
      </div>
      <dl>
        <div><dt>{content.articles.length}</dt><dd>篇公开记录</dd></div>
        <div><dt>{categories.length - 1}</dt><dd>个主题分类</dd></div>
      </dl>
    </section>

    <section className="notes-catalog" aria-label="笔记目录">
      <div className="notes-toolbar">
        <div className="notes-filters" aria-label="按分类筛选">
          {categories.map(item => <button type="button" className={item === category ? "is-active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}
        </div>
        <label className="notes-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">搜索笔记</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索标题或摘要" />
        </label>
      </div>

      <div className="notes-list" aria-live="polite">
        {visibleArticles.map((article, index) => {
          const number = String(content.articles.length - content.articles.indexOf(article)).padStart(2, "0");
          const body = <>
            <span className="notes-number">{number}</span>
            <span className="notes-copy"><small>{article.category}</small><strong>{article.title}</strong><span>{article.excerpt}</span></span>
            <time dateTime={article.publishedAt}>{article.publishedAt}</time>
            {isReadableHref(article.href) && <ArrowUpRight size={18} aria-hidden="true" />}
          </>;
          return isReadableHref(article.href)
            ? <a className="notes-row" href={article.href} key={article.id}>{body}</a>
            : <article className="notes-row notes-row--static" key={article.id} data-visible-index={index}>{body}</article>;
        })}
        {visibleArticles.length === 0 && <div className="notes-empty"><strong>没有匹配的笔记</strong><span>换一个分类或搜索词试试。</span></div>}
      </div>
    </section>

    <footer className="notes-footer">
      <span>持续整理真实构建过程，不把测试通过当作用户结果。</span>
      <Link href="/work">查看公开案例 <ArrowUpRight size={15} /></Link>
    </footer>
  </main>;
}
