import type { Metadata } from "next";
import type { SiteContent } from "./content-types";

export const siteUrl = new URL(process.env.SITE_URL || "https://huangzhijun.online").origin;
export const absoluteUrl = (path: string) => new URL(path, `${siteUrl}/`).href;

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: { title, description, url: absoluteUrl(path), type: "website", locale: "zh_CN" },
  };
}

export function personSchema(content: SiteContent) {
  return {
    "@type": "Person",
    "@id": absoluteUrl("/about#person"),
    name: content.site.brandName,
    url: absoluteUrl("/about"),
    description: content.hero.description.replace(/\n/g, " "),
    sameAs: content.socials
      .filter(social => social.kind === "link" && /^https?:\/\//.test(social.href))
      .map(social => social.href),
  };
}

/** Escape HTML delimiters so CMS text cannot terminate the JSON-LD script. */
export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
