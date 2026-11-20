import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { isReservedPageSlug } from "../lib/page-slugs";
import { getSiteUrl } from "../site.config";

type Entry = { url: string; priority: string; lastmod?: Date | undefined };

// Only public pages: /admin (Decap) and /api (OAuth functions) are never listed.
export const GET: APIRoute = async () => {
  const siteUrl = getSiteUrl().replace(/\/+$/, "");
  const cmsPages = await getCollection("pages");

  const staticPages: Entry[] = [
    { url: "/", priority: "1.0" },
    { url: "/privacy/", priority: "0.5" },
    { url: "/terms/", priority: "0.5" },
  ];

  const dynamicPages: Entry[] = cmsPages
    .filter((page) => !isReservedPageSlug(page.id))
    .map((page) => ({
      url: `/${page.id}/`,
      priority: "0.8",
      lastmod: page.data.updated,
    }));

  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const page of [...staticPages, ...dynamicPages]) {
    sitemap += "  <url>\n";
    sitemap += `    <loc>${siteUrl}${page.url}</loc>\n`;
    if (page.lastmod && !Number.isNaN(page.lastmod.getTime())) {
      sitemap += `    <lastmod>${page.lastmod.toISOString().slice(0, 10)}</lastmod>\n`;
    }
    sitemap += `    <priority>${page.priority}</priority>\n`;
    sitemap += "  </url>\n";
  }

  sitemap += "</urlset>\n";

  return new Response(sitemap, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
