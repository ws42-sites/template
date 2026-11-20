import { getCollection } from "astro:content";
import { getSiteUrl, siteConfig } from "../site.config";
import { type BusinessCard, type LlmsPage, summarize } from "./llms";
import { isReservedPageSlug } from "./page-slugs";

// Hook between site.config / CMS content and the pure llms.txt formatter.
export function businessCard(): BusinessCard {
  return {
    name: siteConfig.name,
    tagline: siteConfig.tagline,
    type: siteConfig.business.type,
    areaServed: siteConfig.business.areaServed,
    services: siteConfig.business.services,
    hours: siteConfig.business.hours,
    phone: siteConfig.business.phone,
    email: siteConfig.contactEmail,
    address: siteConfig.mailingAddress,
    url: getSiteUrl(),
  };
}

export async function llmsPages(): Promise<{ pages: LlmsPage[]; legal: LlmsPage[] }> {
  const cmsPages = (await getCollection("pages"))
    .filter((page) => !isReservedPageSlug(page.id))
    .sort((a, b) => a.data.title.localeCompare(b.data.title));
  return {
    pages: [
      { title: "Home", url: "/", summary: siteConfig.tagline },
      ...cmsPages.map((page) => ({
        title: page.data.title,
        url: `/${page.id}/`,
        summary: summarize(page.data.body),
      })),
    ],
    legal: [
      { title: "Privacy Policy", url: "/privacy/" },
      { title: "Terms of Service", url: "/terms/" },
    ],
  };
}
