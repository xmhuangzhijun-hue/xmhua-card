import { z } from "zod";

const linkSchema = z.object({ label: z.string(), href: z.string() });

export const homepageContentSchema = z.object({
  site: z.object({
    brandName: z.string(),
    brandImage: z.string(),
    announcement: z.string(),
    announcementLink: linkSchema,
    announcementCode: z.string(),
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
    articles: z.object({ eyebrow: z.string(), title: z.string(), description: z.string() }),
    products: z.object({ eyebrow: z.string(), title: z.string(), description: z.string() }),
    directory: z.object({ eyebrow: z.string(), title: z.string(), description: z.string() }),
  }),
  articles: z.array(z.object({ id: z.number(), category: z.string(), title: z.string(), excerpt: z.string(), publishedAt: z.string(), href: z.string() })),
  products: z.array(z.object({ id: z.number(), image: z.string(), name: z.string(), subtitle: z.string(), summary: z.string(), platform: z.string(), href: z.string() })),
  directory: z.object({ kicker: z.string(), title: z.string(), description: z.string(), primaryAction: linkSchema, secondaryAction: linkSchema, links: z.array(z.object({ id: z.number(), icon: z.enum(["search", "code", "layers", "shield"]), title: z.string(), description: z.string(), href: z.string() })) }),
  author: z.object({ kicker: z.string(), title: z.string(), paragraphs: z.array(z.string()) }),
  socials: z.array(z.object({ id: z.number(), icon: z.string(), label: z.string(), handle: z.string(), href: z.string() })),
  footer: z.object({ description: z.string(), legalLinks: z.array(linkSchema), note: z.string(), copyright: z.string() }),
});

export type HomepageContent = z.infer<typeof homepageContentSchema>;

