// llms.txt / llms-full.txt for client sites: wrappers around src/lib/seo.ts plus a markdown summarizer
// used when filling page summaries from CMS content.
import { type LocalBusinessSeo, type SeoPage, toLlmsFullTxt, toLlmsTxt } from "./seo.ts";

export interface BusinessCard {
  name: string;
  tagline?: string;
  type?: string;
  areaServed?: string[];
  services?: string[];
  hours?: string[];
  phone?: string;
  email?: string;
  address?: string;
  url: string;
}

export interface LlmsPage {
  title: string;
  url: string;
  summary?: string;
}

/** Unfilled factory placeholders ({{legal name}}) and blanks are dropped, never published. */
export function clean(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v && !v.includes("{{") ? v : undefined;
}

function asBusiness(card: BusinessCard): LocalBusinessSeo {
  const business: LocalBusinessSeo = {
    kind: "LocalBusiness",
    name: card.name,
    url: card.url,
  };
  const tagline = clean(card.tagline);
  const businessType = clean(card.type);
  const telephone = clean(card.phone);
  const email = clean(card.email);
  if (tagline) business.tagline = tagline;
  if (businessType) business.businessType = businessType;
  if (card.areaServed) business.areaServed = card.areaServed;
  if (card.services) business.services = card.services;
  if (card.hours) business.hours = card.hours;
  if (telephone) business.telephone = telephone;
  if (email) business.email = email;
  // A raw mailing-address string is never guessed into a PostalAddress.
  return business;
}

function asPages(pages: LlmsPage[], legal: LlmsPage[]): SeoPage[] {
  return [...pages, ...legal].map((page) => ({
    path: page.url,
    title: page.title,
    ...(page.summary ? { summary: page.summary } : {}),
  }));
}

export function llmsTxt(card: BusinessCard, pages: LlmsPage[], legal: LlmsPage[]): string {
  return toLlmsTxt(asBusiness(card), asPages(pages, legal));
}

export function llmsFullTxt(card: BusinessCard, pages: LlmsPage[], legal: LlmsPage[]): string {
  return toLlmsFullTxt(asBusiness(card), asPages(pages, legal));
}

/** First readable paragraph of a markdown body, without markup, capped for agents. */
export function summarize(markdown: string, max = 400): string {
  const paragraph =
    markdown
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .find((p) => p && !p.startsWith("#")) ?? "";
  const text = paragraph
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
