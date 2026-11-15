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

export const collections = { pages };
