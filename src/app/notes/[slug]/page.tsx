import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getHomepageContent } from "@/server/content-repository";
import "../notes.css";
import "./detail.css";

type NotePageProps = { params: Promise<{ slug: string }> };

async function findArticle(slug: string) {
  const { data } = await getHomepageContent();
  return data.articles.find(article => article.slug === slug);
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const article = await findArticle((await params).slug);
  return article ? { title: `${article.title} | XMHUA`, description: article.excerpt } : { title: "笔记未找到 | XMHUA" };
}

export default async function NotePage({ params }: NotePageProps) {
  const article = await findArticle((await params).slug);
  if (!article) notFound();
  return <main className="notes-page note-detail">
    <header className="notes-nav"><Link className="notes-brand" href="/">XMHUA</Link><Link href="/notes"><ArrowLeft size={16}/>全部笔记</Link></header>
    <article className="note-article">
      <p className="note-meta">{article.category} · {article.publishedAt}</p>
      <h1>{article.title}</h1>
      <p className="note-lead">{article.excerpt}</p>
      <div className="note-body">{article.body.split(/\n{2,}/).map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
    </article>
    <footer className="notes-footer"><span>记录真实问题、判断和复盘。</span><Link href="/notes">返回公开笔记</Link></footer>
  </main>;
}
