import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { ContentUnavailableError, getSiteContent } from "@/lib/api-client";
import { isLiveHref } from "@/lib/content-types";
import { renderMarkdown } from "@/lib/markdown";
import "../notes.css";
import "./detail.css";

export const revalidate = 60;

type NotePageProps = { params: Promise<{ slug: string }> };

/** Pre-renders every published note at build time; new ones are picked up on revalidate. */
export async function generateStaticParams() {
  try {
    const content = await getSiteContent();
    return content.articles.map(article => ({ slug: article.slug }));
  } catch {
    return [];
  }
}

async function loadNote(slug: string) {
  const content = await getSiteContent();
  const index = content.articles.findIndex(article => article.slug === slug);
  if (index === -1) return null;
  return {
    content,
    article: content.articles[index]!,
    previous: content.articles[index - 1] ?? null,
    next: content.articles[index + 1] ?? null,
  };
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  try {
    const loaded = await loadNote((await params).slug);
    if (!loaded) return { title: "笔记未找到 | XMHUA" };
    return {
      title: `${loaded.article.title} | XMHUA`,
      description: loaded.article.excerpt,
      openGraph: { title: loaded.article.title, description: loaded.article.excerpt, type: "article" },
    };
  } catch (error) {
    if (error instanceof ContentUnavailableError) return { title: "笔记 | XMHUA" };
    throw error;
  }
}

export default async function NotePage({ params }: NotePageProps) {
  const loaded = await loadNote((await params).slug);
  if (!loaded) notFound();
  const { article, previous, next, content } = loaded;
  const minutes = Math.max(1, Math.round(article.body.replace(/\s+/g, "").length / 400));

  return (
    <main className="notes-page note-detail">
      <header className="notes-nav">
        <Link className="notes-brand" href="/">{content.site.brandName}</Link>
        <Link href="/notes"><ArrowLeft size={16} />全部笔记</Link>
      </header>

      <article className="note-article">
        <p className="note-meta">{article.category} · {article.publishedAt} · 约 {minutes} 分钟</p>
        <h1>{article.title}</h1>
        <p className="note-lead">{article.excerpt}</p>
        {isLiveHref(article.sourceUrl) && (
          <p className="note-source">
            原文：
            <a href={article.sourceUrl} target="_blank" rel="noreferrer noopener">
              {article.sourceLabel || hostOf(article.sourceUrl)} <ExternalLink size={13} />
            </a>
          </p>
        )}
        {article.body.trim()
          ? <div className="note-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }} />
          : <p className="note-body note-body--empty">这篇笔记还没有正文。</p>}
      </article>

      {(previous || next) && (
        <nav className="note-pager" aria-label="上一篇 / 下一篇">
          {previous
            ? <Link className="note-pager__link" href={`/notes/${previous.slug}`}>
                <span><ArrowLeft size={14} /> 上一篇</span>
                <strong>{previous.title}</strong>
              </Link>
            : <span />}
          {next && (
            <Link className="note-pager__link note-pager__link--next" href={`/notes/${next.slug}`}>
              <span>下一篇 <ArrowRight size={14} /></span>
              <strong>{next.title}</strong>
            </Link>
          )}
        </nav>
      )}

      <footer className="notes-footer">
        <span>记录真实问题、判断和复盘。</span>
        <Link href="/notes">返回公开笔记 <ArrowUpRight size={15} /></Link>
      </footer>
    </main>
  );
}

/** Falls back to the domain when no label was given for a source link. */
function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
