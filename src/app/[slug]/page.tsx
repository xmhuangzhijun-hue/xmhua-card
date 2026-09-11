import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentUnavailableError, getPage, getSiteContent } from "@/lib/api-client";
import { extractHeadings, renderMarkdown } from "@/lib/markdown";
import { SiteHeader, SiteFooter } from "@/components/site/site-chrome";
import { SocialGrid } from "@/components/site/social-grid";
import { ReadingTools } from "@/components/site/reading-tools";
import { GradientText } from "@/components/react-bits/GradientText";
import { DocOutline } from "@/components/site/doc-outline";
import "../notes/notes.css";
import "../notes/[slug]/detail.css";
import { absoluteUrl, pageMetadata, personSchema, serializeJsonLd } from "@/lib/seo";

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
  return pageMetadata(`${page.title} | 黄智军`, page.description, `/${page.slug}`);
}

export default async function StandalonePage({ params }: StandalonePageProps) {
  const page = await loadPage((await params).slug);
  if (!page) notFound();

  const headings = extractHeadings(page.body);
  const content = await getSiteContent();
  const isAbout = page.slug === "about";

  return (
    <main className={`notes-page note-detail doc-page${isAbout ? " about-page" : ""}`}>
      {isAbout && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({
        "@context": "https://schema.org", "@type": "ProfilePage",
        url: absoluteUrl("/about"), name: page.title,
        mainEntity: personSchema(content),
      }) }} />}
      <SiteHeader content={content} compact />
      <div className="reading-topbar"><span>{isAbout ? "关于 / ABOUT" : "站点说明"}</span><ReadingTools /></div>
      {/* Two columns on wide screens: the document, and an outline that follows
          the reader. Below 1080px the outline collapses above the text. */}
      <div className="doc-shell">
        <article className="note-article">
          <p className="doc-eyebrow">{isAbout ? "个人介绍" : "站点说明"}</p>
          <h1>{isAbout ? <GradientText>{page.title}</GradientText> : page.title}</h1>
          {page.description && <p className="note-lead">{page.description}</p>}
          <div className="note-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />
        </article>
        <DocOutline headings={headings} />
      </div>
      {isAbout && <section className="about-connect"><h2>继续交流</h2><SocialGrid socials={content.socials} /></section>}
      <SiteFooter content={content} />
    </main>
  );
}
