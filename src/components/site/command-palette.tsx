"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { apiUrl } from "@/lib/api-client";
import type { SiteContent } from "@/lib/content-types";

const SUMMON = "mo:command-palette";

type Entry = {
  kind: "笔记" | "分类" | "标签" | "页面";
  label: string;
  hint: string;
  href: string;
  /** Lower-cased haystack, precomputed once so keystrokes stay cheap. */
  haystack: string;
};

const STATIC_ENTRIES: Entry[] = ([
  { kind: "页面", label: "首页", hint: "AI 产品与 Agent", href: "/" },
  { kind: "页面", label: "公开笔记", hint: "全部记录", href: "/notes" },
  { kind: "页面", label: "AI 实战案例", hint: "工程作品", href: "/work" },
] as Omit<Entry, "haystack">[]).map(entry => ({
  ...entry,
  haystack: `${entry.label} ${entry.hint}`.toLocaleLowerCase("zh-CN"),
}));

/**
 * Subsequence match, the same rule editors use: the query characters must appear
 * in order but not adjacently, so "agentharn" finds "Agent ... Harness".
 * Returns a score where a tighter, earlier match wins.
 */
function score(haystack: string, needle: string): number {
  if (!needle) return 0;
  const direct = haystack.indexOf(needle);
  if (direct !== -1) return 1000 - direct;

  let at = 0;
  let hits = 0;
  let spread = 0;
  for (const char of needle) {
    const found = haystack.indexOf(char, at);
    if (found === -1) return -1;
    if (hits > 0) spread += found - at;
    at = found + 1;
    hits += 1;
  }
  return 400 - spread;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Content is fetched the first time the palette opens, never on page load, so
  // this feature costs a closed visitor nothing but the listener.
  const load = useCallback(async () => {
    if (entries) return;
    try {
      const response = await fetch(apiUrl("/api/content"), { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(String(response.status));
      const { data } = (await response.json()) as { data: SiteContent };

      const notes: Entry[] = data.articles.map(article => ({
        kind: "笔记",
        label: article.title,
        hint: `${article.category} · ${article.publishedAt}`,
        href: `/notes/${article.slug}`,
        haystack: `${article.title} ${article.excerpt} ${article.category} ${(article.tags ?? []).join(" ")}`
          .toLocaleLowerCase("zh-CN"),
      }));

      const seenCategory = new Set<string>();
      const categories: Entry[] = [];
      for (const article of data.articles) {
        if (seenCategory.has(article.category)) continue;
        seenCategory.add(article.category);
        categories.push({
          kind: "分类",
          label: article.category,
          hint: "在笔记页筛选",
          href: `/notes?category=${encodeURIComponent(article.category)}`,
          haystack: article.category.toLocaleLowerCase("zh-CN"),
        });
      }

      const seenTag = new Set<string>();
      const tags: Entry[] = [];
      for (const article of data.articles) {
        for (const tag of article.tags ?? []) {
          if (seenTag.has(tag)) continue;
          seenTag.add(tag);
          tags.push({
            kind: "标签",
            label: tag,
            hint: "在笔记页筛选",
            href: `/notes?tag=${encodeURIComponent(tag)}`,
            haystack: tag.toLocaleLowerCase("zh-CN"),
          });
        }
      }

      setEntries([...STATIC_ENTRIES, ...notes, ...categories, ...tags]);
    } catch {
      // A palette that cannot load its index still navigates the fixed pages.
      setEntries(STATIC_ENTRIES);
    }
  }, [entries]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const hotkey = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const target = event.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA)$/.test(target.tagName);
      // "/" is a search shortcut everywhere except inside a field being typed in.
      const slash = event.key === "/" && !typing && !event.metaKey && !event.ctrlKey;
      if (hotkey || slash) {
        event.preventDefault();
        setOpen(current => !current);
      }
      if (event.key === "Escape") setOpen(false);
    };
    const onSummon = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(SUMMON, onSummon);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(SUMMON, onSummon);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    setActive(0);
    // The dialog owns the viewport while open; restoring scroll is the browser's.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focus = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(focus);
    };
  }, [open, load]);

  const results = useMemo(() => {
    const pool = entries ?? STATIC_ENTRIES;
    const needle = query.trim().toLocaleLowerCase("zh-CN");
    if (!needle) return pool.slice(0, 24);
    return pool
      .map(entry => ({ entry, rank: score(entry.haystack, needle) }))
      .filter(row => row.rank >= 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 30)
      .map(row => row.entry);
  }, [entries, query]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [active, results.length]);

  const go = useCallback((entry: Entry | undefined) => {
    if (!entry) return;
    setOpen(false);
    setQuery("");
    router.push(entry.href);
  }, [router]);

  function onListKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(current => (current + 1) % Math.max(1, results.length));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(current => (current - 1 + Math.max(1, results.length)) % Math.max(1, results.length));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      go(results[active]);
    }
  }

  // Keeps the highlighted row inside the scroll box during keyboard travel.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    node?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let lastKind = "";

  if (!open) return null;

  return (
    <div
      className="mo-cmdk"
      role="button"
      tabIndex={-1}
      aria-label="关闭搜索"
      onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}
    >
      <div className="mo-cmdk__panel" role="dialog" aria-modal="true" aria-label="站内搜索" onKeyDown={onListKey}>
        <div className="mo-cmdk__search">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={event => { setQuery(event.target.value); setActive(0); }}
            placeholder="搜索笔记、分类或标签……"
            aria-label="搜索"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>ESC</kbd>
        </div>

        <div className="mo-cmdk__list" ref={listRef} role="listbox" aria-label="搜索结果">
          {results.length === 0 && (
            <p className="mo-cmdk__empty">{entries ? "没有匹配的内容。" : "正在载入索引……"}</p>
          )}
          {results.map((entry, index) => {
            const heading = entry.kind !== lastKind ? entry.kind : null;
            lastKind = entry.kind;
            return (
              <div key={`${entry.kind}:${entry.href}:${entry.label}`}>
                {heading && <p className="mo-cmdk__group">{heading}</p>}
                <button
                  type="button"
                  className="mo-cmdk__item"
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(entry)}
                >
                  <strong>{entry.label}</strong>
                  <em>{entry.kind}</em>
                  <span>{entry.hint}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="mo-cmdk__foot">
          <span><b>↑↓</b> 选择</span>
          <span><b><CornerDownLeft size={11} style={{ display: "inline", verticalAlign: "-1px" }} /></b> 打开</span>
          <span><b>/</b> 唤起</span>
          <span><b>Esc</b> 关闭</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Opens the palette from anywhere in the header. Kept separate from the dialog
 * so the dialog can live once at the document root while the button sits inside
 * each page's own chrome.
 */
export function CommandTrigger({ label = "搜索" }: { label?: string }) {
  return (
    <button
      type="button"
      className="mo-cmdk-trigger"
      aria-haspopup="dialog"
      onClick={() => window.dispatchEvent(new Event(SUMMON))}
    >
      <Search size={14} aria-hidden="true" />
      {label}
      <kbd>⌘K</kbd>
    </button>
  );
}
