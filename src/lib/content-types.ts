/**
 * Shapes returned by the content API.
 *
 * The API owns the canonical zod schemas and validates every write. The frontend
 * only reads, so it keeps types rather than duplicating validation logic.
 */

export type Link = { label: string; href: string };

export type SectionHeading = {
  eyebrow: string;
  title: string;
  description: string;
  action?: Link;
};

export type DirectoryIcon = "search" | "code" | "layers" | "shield";

export type Article = {
  id: number;
  category: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  href: string;
  slug: string;
  body: string;
  published: boolean;
  /** Optional link to the material the note is about. */
  sourceUrl: string;
  sourceLabel: string;
};

export type ArticleDetail = Omit<Article, "published"> & { readingMinutes: number };

export type Product = {
  id: number;
  image: string;
  name: string;
  subtitle: string;
  summary: string;
  platform: string;
  href: string;
};

export type DirectoryLink = {
  id: number;
  icon: DirectoryIcon;
  title: string;
  description: string;
  href: string;
};

export type SocialKind = "link" | "qrcode";

export type SocialLink = {
  id: number;
  icon: string;
  label: string;
  handle: string;
  href: string;
  /** "qrcode" is for platforms with no linkable personal page, WeChat above all. */
  kind: SocialKind;
  qrAsset: string;
  note: string;
};

export type PageSummary = { slug: string; title: string; description: string };

export type PageDetail = PageSummary & { body: string };

export type SiteContent = {
  site: {
    brandName: string;
    brandImage: string;
    announcement: string;
    announcementLink: Link;
    announcementCode: string;
    announcementSuffix: string;
    navigation: Link[];
  };
  hero: {
    kicker: string;
    title: string;
    description: string;
    primaryAction: Link;
    secondaryAction: Link;
    tags: string[];
  };
  sections: {
    articles: SectionHeading;
    products: SectionHeading;
    directory: SectionHeading;
  };
  articles: Article[];
  products: Product[];
  directory: {
    kicker: string;
    title: string;
    description: string;
    primaryAction: Link;
    secondaryAction: Link;
    links: DirectoryLink[];
  };
  author: { kicker: string; title: string; paragraphs: string[] };
  socials: SocialLink[];
  pages: PageSummary[];
  footer: { description: string; legalLinks: Link[]; note: string; copyright: string };
  ui: {
    pageTitle: string;
    languageLabel: string;
    moreLabel: string;
    moreLinks: Link[];
    productStoreLabel: string;
    productNotesLabel: string;
    emailLink: Link;
    analytics: {
      enabled: boolean;
      title: string;
      description: string;
      privacyLink: Link;
      cookieLink: Link;
      rejectLabel: string;
      acceptLabel: string;
    };
  };
};

/** A href that is blank or a bare "#" was never filled in, so it must not render as a link. */
export function isLiveHref(href: string | undefined | null): href is string {
  const trimmed = href?.trim() ?? "";
  return trimmed.length > 0 && trimmed !== "#";
}
