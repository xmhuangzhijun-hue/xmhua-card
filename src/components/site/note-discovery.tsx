"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Shuffle } from "lucide-react";

type NotePreview = { id: number; category: string; title: string; excerpt: string; publishedAt: string; slug: string };

export function NoteDiscovery({ articles }: { articles: NotePreview[] }) {
  const [category, setCategory] = useState("");
  const [offset, setOffset] = useState(0);
  const categories = [...new Set(articles.map(article => article.category))];
  const candidates = category ? articles.filter(article => article.category === category) : articles;
  const selected = [...candidates.slice(offset), ...candidates.slice(0, offset)].slice(0, 6);
  return (
    <div className="note-discovery">
      <div className="discovery-toolbar">
        <div className="discovery-filters" role="group" aria-label="按主题探索笔记">
          {["", ...categories].map(value => <button type="button" key={value} aria-pressed={category === value} onClick={() => { setCategory(value); setOffset(0); }}>{value || "全部主题"}</button>)}
        </div>
        <button className="discovery-shuffle" type="button" disabled={candidates.length <= 6} onClick={() => setOffset((offset + 6) % candidates.length)}><Shuffle size={15} />换一组</button>
      </div>
      <p className="discovery-status" role="status">{category || "全部主题"} · {candidates.length} 篇，当前展示 {selected.length} 篇</p>
      <div className="discovery-grid" key={`${category}-${offset}`}>
        {selected.map((article, index) => <Link className="discovery-card mo-spot" href={`/notes/${article.slug}`} key={article.id}>
          <div className="discovery-card__top"><span>{article.category}</span><span aria-hidden="true">{String(offset + index + 1).padStart(2, "0")}</span></div>
          <h3>{article.title}</h3><p>{article.excerpt}</p>
          <div className="discovery-card__bottom"><time>{article.publishedAt}</time><span>展开阅读 <ArrowUpRight size={17} /></span></div>
        </Link>)}
      </div>
    </div>
  );
}
