import { z } from "zod";

const linkSchema = z.object({ label: z.string(), href: z.string() });
const sectionHeadingSchema = z.object({ eyebrow: z.string(), title: z.string(), description: z.string(), action: linkSchema.optional() });

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
    brandName: z.string(),
    brandImage: z.string(),
    announcement: z.string(),
    announcementLink: linkSchema,
    announcementCode: z.string(),
    announcementSuffix: z.string().default(""),
    navigation: z.array(linkSchema),
  }),
  hero: z.object({
    kicker: z.string(),
    title: z.string(),
    description: z.string(),
    primaryAction: linkSchema,
    secondaryAction: linkSchema,
    tags: z.array(z.string()),
  }),
  sections: z.object({
    articles: sectionHeadingSchema,
    products: sectionHeadingSchema,
    directory: sectionHeadingSchema,
  }),
  articles: z.array(z.object({ id: z.number(), category: z.string(), title: z.string(), excerpt: z.string(), publishedAt: z.string(), href: z.string() })),
  products: z.array(z.object({ id: z.number(), image: z.string(), name: z.string(), subtitle: z.string(), summary: z.string(), platform: z.string(), href: z.string() })),
  directory: z.object({ kicker: z.string(), title: z.string(), description: z.string(), primaryAction: linkSchema, secondaryAction: linkSchema, links: z.array(z.object({ id: z.number(), icon: z.enum(["search", "code", "layers", "shield"]), title: z.string(), description: z.string(), href: z.string() })) }),
  author: z.object({ kicker: z.string(), title: z.string(), paragraphs: z.array(z.string()) }),
  socials: z.array(z.object({ id: z.number(), icon: z.string(), label: z.string(), handle: z.string(), href: z.string() })),
  footer: z.object({ description: z.string(), legalLinks: z.array(linkSchema), note: z.string(), copyright: z.string() }),
  ui: z.object({
    pageTitle: z.string(), languageLabel: z.string(), moreLabel: z.string(), moreLinks: z.array(linkSchema),
    productStoreLabel: z.string(), productNotesLabel: z.string(), emailLink: linkSchema,
    analytics: z.object({
      enabled: z.boolean(), title: z.string(), description: z.string(), privacyLink: linkSchema,
      cookieLink: linkSchema, rejectLabel: z.string(), acceptLabel: z.string(),
    }),
  }).default(defaultHomepageUi),
});

export type HomepageContent = z.infer<typeof homepageContentSchema>;
