"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Article, SiteContent, TaxonomyGroup } from "@/lib/content-types";
import { stripInlineMarkdown } from "@/lib/markdown";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { CommandTrigger } from "@/components/site/command-palette";
import { CountUp } from "@/components/site/count-up";
import { useFlip } from "@/lib/flip";

/** Sentinel for "no category filter"; not a real category name. */
const ALL = "";
const UNGROUPED = "其他";

type Section = { label: string; description: string; items: { name: string; count: number }[] };

/**
 * Builds the browse tree actually shown in the sidebar.
 *
 * The console-editable taxonomy decides order and grouping, but it is never the
 * source of truth for what exists: a category is listed only if some article
 * carries it, and any category missing from the taxonomy still appears under
 * "其他". That way a note can never become unreachable by editing the tree.
 */
function buildSections(articles: Article[], taxonomy: TaxonomyGroup[]): Section[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    counts.set(article.category, (counts.get(article.category) ?? 0) + 1);
  }

  const placed = new Set<string>();
  const sections: Section[] = [];

  for (const group of taxonomy) {
    const items = group.categories
      .filter(name => counts.has(name))
      .map(name => {
        placed.add(name);
        return { name, count: counts.get(name) ?? 0 };
      });
    if (items.length > 0) sections.push({ label: group.label, description: group.description, items });
  }

  const orphans = [...counts.keys()].filter(name => !placed.has(name)).sort();
  if (orphans.length > 0) {
    sections.push({
      label: UNGROUPED,
      description: "还没有归入上面任何一组的分类。",
      items: orphans.map(name => ({ name, count: counts.get(name) ?? 0 })),
    });
  }
  return sections;
}

export function NotesLibrary({ content }: { content: SiteContent }) {
  const [category, setCategory] = useState(ALL);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Deep links from the command palette (/notes?category=… or ?tag=…). Read from
  // the URL after mount rather than through useSearchParams, which would opt this
  // statically rendered page into dynamic rendering for a query string that only
  // sets initial UI state.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get("category");
    const tag = params.get("tag");
    if (wanted) setCategory(wanted);
    if (tag) setActiveTags([tag]);
  }, []);

  const sections = useMemo(
    () => buildSections(content.articles, content.taxonomy ?? []),
    [content.articles, content.taxonomy],
  );

  const categoryCount = useMemo(
    () => new Set(content.articles.map(article => article.category)).size,
    [content.articles],
  );

  /** Which top-level group the current category sits in, for the breadcrumb. */
  const groupOfCategory = useMemo(() => {
    if (category === ALL) return "";
    return sections.find(section => section.items.some(item => item.name === category))?.label ?? "";
  }, [category, sections]);

  const inCategory = useMemo(
    () => (category === ALL ? content.articles : content.articles.filter(a => a.category === category)),
    [category, content.articles],
  );

  /** Tags offered are those inside the current category, so the facet never dead-ends. */
  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of inCategory) {
      for (const tag of article.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
      .map(([name, count]) => ({ name, count }));
  }, [inCategory]);

  const visibleArticles = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("zh-CN");
    return inCategory.filter(article => {
      const tags = article.tags ?? [];
      // Several tags narrow rather than widen: picking two means "has both".
      if (activeTags.length > 0 && !activeTags.every(tag => tags.includes(tag))) return false;
      if (!needle) return true;
      const haystack = `${article.title} ${article.excerpt} ${article.category} ${tags.join(" ")}`
        .toLocaleLowerCase("zh-CN");
      return haystack.includes(needle);
    });
  }, [activeTags, inCategory, query]);

  // Re-runs the FLIP pass whenever the visible set changes identity or order.
  useFlip(listRef, visibleArticles.map(article => article.id).join(","));

  const filtered = category !== ALL || activeTags.length > 0 || query.trim() !== "";

  function pickCategory(next: string) {
    setCategory(next);
    // Tags belong to the category that was on screen when they were picked.
    setActiveTags([]);
  }

  function toggleTag(tag: string) {
    setActiveTags(current =>
      current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag]);
  }

  function clearAll() {
    setCategory(ALL);
    setActiveTags([]);
    setQuery("");
  }

  return (
    <main className="notes-page">
      <header className="notes-nav">
        <Link className="notes-brand" href="/" aria-label="返回黄智军首页">
          <Image src={content.site.brandImage} alt="" width={29} height={29} priority />
          <strong>{content.site.brandName}</strong>
        </Link>
        <nav aria-label="笔记页导航">
          <Link href="/">首页</Link>
          <Link href="/work">案例</Link>
          <CommandTrigger />
          <ThemeToggle />
        </nav>
      </header>

      <section className="notes-intro" aria-labelledby="notes-title">
        <div>
          <p>PUBLIC WORKING NOTES</p>
          <h1 id="notes-title">{content.sections.articles.eyebrow}</h1>
          {/* Shared with the homepage section so one edit in the console updates both. */}
          <span>{content.sections.articles.description}</span>
        </div>
        <dl>
          <div><dt><CountUp value={content.articles.length} /></dt><dd>篇公开记录</dd></div>
          <div><dt><CountUp value={categoryCount} /></dt><dd>个主题分类</dd></div>
        </dl>
      </section>

      <div className="notes-browse">
        <aside className="notes-side" aria-label="笔记分类导航">
          <button
            type="button"
            className={`notes-side__all${category === ALL ? " is-active" : ""}`}
            onClick={() => pickCategory(ALL)}
            aria-current={category === ALL ? "true" : undefined}
          >
            全部笔记<span>{content.articles.length}</span>
          </button>

          {sections.map(section => (
            <section className="notes-side__group" key={section.label}>
              <h2>{section.label}</h2>
              <ul>
                {section.items.map(item => (
                  <li key={item.name}>
                    <button
                      type="button"
                      className={item.name === category ? "is-active" : ""}
                      onClick={() => pickCategory(item.name)}
                      aria-current={item.name === category ? "true" : undefined}
                    >
                      {item.name}<span>{item.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </aside>

        <section className="notes-catalog" aria-label="笔记目录">
          <div className="notes-toolbar">
            <p className="notes-crumb" aria-live="polite">
              {category === ALL
                ? <span>全部笔记</span>
                : <><span>{groupOfCategory || UNGROUPED}</span><i aria-hidden="true">/</i><strong>{category}</strong></>}
              <em>{visibleArticles.length} 篇</em>
            </p>
            <label className="notes-search">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">搜索笔记</span>
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="搜索标题、摘要或标签"
              />
            </label>
          </div>

          {availableTags.length > 0 && (
            <div className="notes-tags" aria-label="按标签筛选">
              {availableTags.map(tag => (
                <button
                  type="button"
                  key={tag.name}
                  className={activeTags.includes(tag.name) ? "is-active" : ""}
                  aria-pressed={activeTags.includes(tag.name)}
                  onClick={() => toggleTag(tag.name)}
                >
                  {tag.name}<span>{tag.count}</span>
                </button>
              ))}
              {filtered && (
                <button type="button" className="notes-tags__clear" onClick={clearAll}>
                  <X size={13} aria-hidden="true" />清除筛选
                </button>
              )}
            </div>
          )}

          <div className="notes-list" aria-live="polite" ref={listRef}>
            {visibleArticles.map((article, index) => {
              const number = String(content.articles.length - content.articles.indexOf(article)).padStart(2, "0");
              return (
                <Link
                  className="notes-row mo-spot"
                  href={`/notes/${article.slug}`}
                  key={article.id}
                  data-visible-index={index}
                  data-flip-id={String(article.id)}
                >
                  <span className="notes-number">{number}</span>
                  <span className="notes-copy">
                    <small>{article.category}</small>
                    <strong>{article.title}</strong>
                    <span>{stripInlineMarkdown(article.excerpt)}</span>
                  </span>
                  <time dateTime={article.publishedAt}>{article.publishedAt}</time>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              );
            })}
            {visibleArticles.length === 0 && (
              <div className="notes-empty">
                <strong>没有匹配的笔记</strong>
                <span>换一个分类、去掉一个标签，或者换个搜索词。</span>
                {filtered && (
                  <button type="button" onClick={clearAll}>清除全部筛选</button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="notes-footer">
        <span>持续整理真实构建过程，不把测试通过当作用户结果。</span>
        <Link href="/work">查看公开案例 <ArrowUpRight size={15} /></Link>
        <span className="notes-footer__icp">
          © 2026 黄智军 ·{" "}
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer noopener">闽ICP备2026035561号-1</a>
        </span>
      </footer>
    </main>
  );
}
