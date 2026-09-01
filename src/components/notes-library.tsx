"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { SiteContent } from "@/lib/content-types";
import { ThemeToggle } from "@/components/site/theme-toggle";

const allCategory = "全部";

/**
 * The list arrives already rendered from the server; only filtering and search
 * run in the browser, so the notes index is readable without JavaScript.
 */
export function NotesLibrary({ content }: { content: SiteContent }) {
  const [category, setCategory] = useState(allCategory);
  const [query, setQuery] = useState("");

  const categories = useMemo(
    () => [allCategory, ...Array.from(new Set(content.articles.map(article => article.category)))],
    [content.articles],
  );

  const visibleArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    return content.articles.filter(article => {
      const matchesCategory = category === allCategory || article.category === category;
      const haystack = `${article.title} ${article.excerpt} ${article.category}`.toLocaleLowerCase("zh-CN");
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [category, content.articles, query]);

  return (
    <main className="notes-page">
      <header className="notes-nav">
        <Link className="notes-brand" href="/" aria-label="返回 XMHUA 首页">
          <Image src={content.site.brandImage} alt="" width={29} height={29} priority />
          <strong>{content.site.brandName}</strong>
        </Link>
        <nav aria-label="笔记页导航">
          <Link href="/">首页</Link>
          <Link href="/work">案例</Link>
          <ThemeToggle />
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
            {categories.map(item => (
              <button type="button" className={item === category ? "is-active" : ""} onClick={() => setCategory(item)} key={item}>
                {item}
              </button>
            ))}
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
            return (
              <Link className="notes-row" href={`/notes/${article.slug}`} key={article.id} data-visible-index={index}>
                <span className="notes-number">{number}</span>
                <span className="notes-copy">
                  <small>{article.category}</small>
                  <strong>{article.title}</strong>
                  <span>{article.excerpt}</span>
                </span>
                <time dateTime={article.publishedAt}>{article.publishedAt}</time>
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            );
          })}
          {visibleArticles.length === 0 && (
            <div className="notes-empty">
              <strong>没有匹配的笔记</strong>
              <span>换一个分类或搜索词试试。</span>
            </div>
          )}
        </div>
      </section>

      <footer className="notes-footer">
        <span>持续整理真实构建过程，不把测试通过当作用户结果。</span>
        <Link href="/work">查看公开案例 <ArrowUpRight size={15} /></Link>
      </footer>
    </main>
  );
}
