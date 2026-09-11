import type { Metadata } from "next";
import { getSiteContent } from "@/lib/api-client";
import { HomePage } from "@/components/site/home-page";
import { absoluteUrl, pageMetadata, personSchema, serializeJsonLd } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return pageMetadata(content.ui.pageTitle, content.hero.description.replace(/\n/g, " "), "/");
}

export default async function Home() {
  const content = await getSiteContent();
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({
      "@context": "https://schema.org", "@type": "WebSite",
      "@id": absoluteUrl("/#website"), url: absoluteUrl("/"),
      name: content.ui.pageTitle, author: personSchema(content),
    }) }} />
    <HomePage content={content} />
  </>;
}
