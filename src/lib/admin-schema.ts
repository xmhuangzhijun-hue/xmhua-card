import { z } from "zod";

export const tenantSlugValueSchema = z.string().trim().min(2).max(48).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const createTenantSchema = z.object({
  slug: tenantSlugValueSchema,
  name: z.string().trim().min(1).max(80),
  seedContent: z.boolean().default(true),
});

export const selfServiceTenantSchema = z.object({
  slug: tenantSlugValueSchema,
  name: z.string().trim().min(2).max(80),
});
