import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const pages = defineCollection({
  loader: glob({ pattern: "*.yml", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string().min(1),
    hero: z.string().optional(),
    body: z.string(),
  }),
});

const settings = defineCollection({
  loader: glob({ pattern: "*.yml", base: "./src/content/settings" }),
  schema: z.object({
    name: z.string().min(1),
    legalName: z.string(),
    tagline: z.string(),
    contactEmail: z.string().email(),
    phone: z.string().optional(),
    mailingAddress: z.string(),
    jurisdiction: z.string(),
    privacyLaw: z.string(),
    siteUrl: z.string().url(),
    colors: z.object({
      brand: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color"),
      accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color"),
      background: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color"),
    }),
  }),
});

export const collections = { pages, settings };
