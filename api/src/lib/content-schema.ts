import { z } from "zod";

const shortText = z.string().max(200);
const longText = z.string().max(10_000);
const href = z.string().max(2_048);
const bodyText = z.string().max(100_000);
const slug = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case");
const itemId = z.number().int().nonnegative();

const linkSchema = z.object({ label: shortText, href });
const sectionHeadingSchema = z.object({
  eyebrow: shortText,
  title: shortText,
  description: longText,
  action: linkSchema.optional(),
});

export const directoryIcons = ["search", "code", "layers", "shield"] as const;

/** Everything that is not a list. Stored as one JSON document in site_settings. */
export const siteSettingsSchema = z.object({
  site: z.object({
    brandName: shortText,
    brandImage: href,
    announcement: longText,
    announcementLink: linkSchema,
    announcementCode: shortText,
    announcementSuffix: longText.default(""),
    navigation: z.array(linkSchema).max(30),
  }),
  hero: z.object({
    kicker: shortText,
    title: shortText,
    description: longText,
    primaryAction: linkSchema,
    secondaryAction: linkSchema,
    tags: z.array(shortText).max(30),
  }),
  sections: z.object({
    articles: sectionHeadingSchema,
    products: sectionHeadingSchema,
    directory: sectionHeadingSchema,
  }),
  directory: z.object({
    kicker: shortText,
    title: shortText,
    description: longText,
    primaryAction: linkSchema,
    secondaryAction: linkSchema,
  }),
  author: z.object({ kicker: shortText, title: shortText, paragraphs: z.array(longText).max(20) }),
  footer: z.object({
    description: longText,
    legalLinks: z.array(linkSchema).max(30),
    note: longText,
    copyright: shortText,
  }),
  ui: z.object({
    pageTitle: shortText,
    languageLabel: shortText,
    moreLabel: shortText,
    moreLinks: z.array(linkSchema).max(30),
    productStoreLabel: shortText,
    productNotesLabel: shortText,
    emailLink: linkSchema,
    analytics: z.object({
      enabled: z.boolean(),
      title: shortText,
      description: longText,
      privacyLink: linkSchema,
      cookieLink: linkSchema,
      rejectLabel: shortText,
      acceptLabel: shortText,
    }),
  }),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const articleInputSchema = z.object({
  category: shortText.min(1),
  title: shortText.min(1),
  excerpt: longText,
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "publishedAt must be YYYY-MM-DD"),
  slug,
  body: bodyText,
  published: z.boolean(),
});

export const productInputSchema = z.object({
  image: href,
  name: shortText.min(1),
  subtitle: shortText,
  summary: longText,
  platform: shortText,
  href,
  published: z.boolean(),
});

export const directoryLinkInputSchema = z.object({
  icon: z.enum(directoryIcons),
  title: shortText.min(1),
  description: longText,
  href,
});

export const socialLinkInputSchema = z.object({
  icon: shortText.min(1),
  label: shortText.min(1),
  handle: shortText,
  href,
});

export const pageInputSchema = z.object({
  slug,
  title: shortText.min(1),
  description: longText,
  body: bodyText,
  published: z.boolean(),
});

export const reorderSchema = z.object({ ids: z.array(itemId).max(200) });

/** Shape returned by the public content endpoint. */
export const publicContentSchema = siteSettingsSchema.omit({ directory: true }).extend({
  articles: z.array(z.object({
    id: itemId,
    category: shortText,
    title: shortText,
    excerpt: longText,
    publishedAt: shortText,
    href,
    slug,
    body: bodyText,
    published: z.boolean(),
  })),
  products: z.array(z.object({
    id: itemId,
    image: href,
    name: shortText,
    subtitle: shortText,
    summary: longText,
    platform: shortText,
    href,
  })),
  directory: siteSettingsSchema.shape.directory.extend({
    links: z.array(z.object({
      id: itemId,
      icon: z.enum(directoryIcons),
      title: shortText,
      description: longText,
      href,
    })),
  }),
  socials: z.array(z.object({
    id: itemId,
    icon: href,
    label: shortText,
    handle: shortText,
    href,
  })),
  pages: z.array(z.object({ slug, title: shortText, description: longText })),
});

export type PublicContent = z.infer<typeof publicContentSchema>;
