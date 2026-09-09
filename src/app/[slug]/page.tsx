import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ContentUnavailableError, getPage, getSiteContent } from "@/lib/api-client";
import { extractHeadings, renderMarkdown } from "@/lib/markdown";
import { DocOutline } from "@/components/site/doc-outline";
import "../notes/notes.css";
import "../notes/[slug]/detail.css";

export const revalidate = 300;

type StandalonePageProps = { params: Promise<{ slug: string }> };

/**
 * Editable standalone pages such as /privacy, /terms and /cookies. Static routes
 * take priority in Next.js, so this never shadows /notes, /work or /admin.
 */
export async function generateStaticParams() {
  try {
    const content = await getSiteContent();
    return content.pages.map(page => ({ slug: page.slug }));
  } catch {
    return [];
  }
}

async function loadPage(slug: string) {
  try {
    return await getPage(slug);
  } catch (error) {
    if (error instanceof ContentUnavailableError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: StandalonePageProps): Promise<Metadata> {
  const page = await loadPage((await params).slug);
  if (!page) return { title: "页面未找到 | 黄智军" };
  return { title: `${page.title} | 黄智军`, description: page.description };
}

export default async function StandalonePage({ params }: StandalonePageProps) {
  const page = await loadPage((await params).slug);
  if (!page) notFound();

  const headings = extractHeadings(page.body);

  return (
    <main className="notes-page note-detail doc-page">
      <header className="notes-nav">
        <Link className="notes-brand" href="/">黄智军</Link>
        <Link href="/"><ArrowLeft size={16} />返回首页</Link>
      </header>
      {/* Two columns on wide screens: the document, and an outline that follows
          the reader. Below 1080px the outline collapses above the text. */}
      <div className="doc-shell">
        <article className="note-article">
          <p className="doc-eyebrow">站点说明</p>
          <h1>{page.title}</h1>
          {page.description && <p className="note-lead">{page.description}</p>}
          <div className="note-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />
        </article>
        <DocOutline headings={headings} />
      </div>
      <footer className="notes-footer">
        <span className="notes-footer__icp">
          © 2026 黄智军 ·{" "}
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer noopener">闽ICP备2026035561号-1</a>
        </span>
      </footer>
    </main>
  );
}
