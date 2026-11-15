import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { isReservedPageSlug } from "../lib/page-slugs";
import { getSiteUrl, siteConfig } from "../site.config";

export const GET: APIRoute = async () => {
  const siteUrl = getSiteUrl();
  const cmsPages = (await getCollection("pages"))
    .filter((page) => !isReservedPageSlug(page.id))
    .sort((a, b) => a.data.title.localeCompare(b.data.title));

  const sections = [
    {
      title: "Main Pages",
      links: [
        { title: "Home", url: "/" },
        ...cmsPages.map((page) => ({
          title: page.data.title,
          url: `/${page.id}/`,
        })),
      ],
    },
    {
      title: "Legal",
      links: [
        { title: "Privacy Policy", url: "/privacy/" },
        { title: "Terms of Service", url: "/terms/" },
      ],
    },
  ];

  let llmsTxt = `# ${siteConfig.name}\n\n`;
  llmsTxt += `> ${siteConfig.tagline}\n\n`;

  for (const section of sections) {
    llmsTxt += `## ${section.title}\n\n`;
    for (const link of section.links) {
      llmsTxt += `- [${link.title}](${siteUrl}${link.url})\n`;
    }
    llmsTxt += "\n";
  }

  return new Response(llmsTxt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
