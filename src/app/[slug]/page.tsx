import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ContentUnavailableError, getPage, getSiteContent } from "@/lib/api-client";
import { renderMarkdown } from "@/lib/markdown";
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
  if (!page) return { title: "页面未找到 | XMHUA" };
  return { title: `${page.title} | XMHUA`, description: page.description };
}

export default async function StandalonePage({ params }: StandalonePageProps) {
  const page = await loadPage((await params).slug);
  if (!page) notFound();

  return (
    <main className="notes-page note-detail">
      <header className="notes-nav">
        <Link className="notes-brand" href="/">XMHUA</Link>
        <Link href="/"><ArrowLeft size={16} />返回首页</Link>
      </header>
      <article className="note-article">
        <h1>{page.title}</h1>
        {page.description && <p className="note-lead">{page.description}</p>}
        <div className="note-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />
      </article>
    </main>
  );
}
