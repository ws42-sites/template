import { getSiteUrl, siteConfig } from "../site.config";
import type { LocalBusinessSeo, PostalAddress } from "./seo";

export interface SeoSiteConfig {
  name: string;
  legalName?: string;
  tagline?: string;
  description?: string;
  contactEmail?: string;
  telephone?: string;
  businessType?: string;
  address?: PostalAddress;
  areaServed?: string[];
  hours?: string[];
  services?: string[];
  sameAs?: string[];
  image?: string;
  aiCrawlers?: "allow" | "block-training";
}

// Factory-filled fields are optional; a raw mailingAddress is never guessed into structured data.
export function buildSeoFromSiteConfig(
  config: SeoSiteConfig = siteConfig,
  siteUrl = getSiteUrl(),
): LocalBusinessSeo {
  return {
    kind: "LocalBusiness",
    name: config.name,
    ...(config.legalName === undefined ? {} : { legalName: config.legalName }),
    ...(config.tagline === undefined ? {} : { tagline: config.tagline }),
    ...(config.description === undefined && config.tagline === undefined
      ? {}
      : { description: config.description ?? config.tagline ?? "" }),
    url: siteUrl,
    ...(config.contactEmail === undefined ? {} : { email: config.contactEmail }),
    ...(config.telephone === undefined ? {} : { telephone: config.telephone }),
    ...(config.businessType === undefined ? {} : { businessType: config.businessType }),
    ...(config.address === undefined ? {} : { address: config.address }),
    ...(config.areaServed === undefined ? {} : { areaServed: config.areaServed }),
    ...(config.hours === undefined ? {} : { hours: config.hours }),
    ...(config.services === undefined ? {} : { services: config.services }),
    ...(config.sameAs === undefined ? {} : { sameAs: config.sameAs }),
    ...(config.image === undefined ? {} : { image: config.image }),
    aiCrawlers: config.aiCrawlers ?? "allow",
  };
}
