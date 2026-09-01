import { z } from "zod";

const shortText = z.string().max(200);
const longText = z.string().max(10_000);
const href = z.string().max(2_048);
const itemId = z.number().int().nonnegative();
const linkSchema = z.object({ label: shortText, href });
const sectionHeadingSchema = z.object({ eyebrow: shortText, title: shortText, description: longText, action: linkSchema.optional() });

export const defaultHomepageUi = {
  pageTitle: "XMHUA",
  languageLabel: "EN",
  moreLabel: "更多",
  moreLinks: [] as Array<{ label: string; href: string }>,
  productStoreLabel: "查看作品",
  productNotesLabel: "相关记录",
  emailLink: { label: "Email", href: "#" },
  analytics: {
    enabled: false,
    title: "网站统计选择",
    description: "只有在你同意后才会加载访问统计。",
    privacyLink: { label: "隐私政策", href: "#" },
    cookieLink: { label: "Cookie 说明", href: "#" },
    rejectLabel: "拒绝",
    acceptLabel: "同意统计",
  },
};

export const homepageContentSchema = z.object({
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
  articles: z.array(z.object({ id: itemId, category: shortText, title: shortText, excerpt: longText, publishedAt: shortText, href, slug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), body: z.string().max(100_000), published: z.boolean().default(true) })).max(100),
  products: z.array(z.object({ id: itemId, image: href, name: shortText, subtitle: shortText, summary: longText, platform: shortText, href })).max(50),
  directory: z.object({ kicker: shortText, title: shortText, description: longText, primaryAction: linkSchema, secondaryAction: linkSchema, links: z.array(z.object({ id: itemId, icon: z.enum(["search", "code", "layers", "shield"]), title: shortText, description: longText, href })).max(50) }),
  author: z.object({ kicker: shortText, title: shortText, paragraphs: z.array(longText).max(20) }),
  socials: z.array(z.object({ id: itemId, icon: href, label: shortText, handle: shortText, href })).max(50),
  footer: z.object({ description: longText, legalLinks: z.array(linkSchema).max(30), note: longText, copyright: shortText }),
  ui: z.object({
    pageTitle: shortText, languageLabel: shortText, moreLabel: shortText, moreLinks: z.array(linkSchema).max(30),
    productStoreLabel: shortText, productNotesLabel: shortText, emailLink: linkSchema,
    analytics: z.object({
      enabled: z.boolean(), title: shortText, description: longText, privacyLink: linkSchema,
      cookieLink: linkSchema, rejectLabel: shortText, acceptLabel: shortText,
    }),
  }).default(defaultHomepageUi),
});

export type HomepageContent = z.infer<typeof homepageContentSchema>;
