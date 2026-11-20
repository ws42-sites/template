// llms.txt / llms-full.txt for client sites: a business card for AI agents, then the page index.
// Pure and import-free so it can be unit tested with node --test.
// TODO(seo-mid): swap for toLlmsTxt()/toLlmsFullTxt() from src/lib/seo.ts once the shared module lands.

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

const cleanList = (values: string[] | undefined) =>
  (values ?? []).map(clean).filter((v): v is string => Boolean(v));

export function cardLines(card: BusinessCard): string[] {
  const rows: Array<[string, string | undefined]> = [
    ["Type", clean(card.type)],
    ["Area served", cleanList(card.areaServed).join(", ") || undefined],
    ["Services", cleanList(card.services).join(", ") || undefined],
    ["Hours", cleanList(card.hours).join("; ") || undefined],
    ["Phone", clean(card.phone)],
    ["Email", clean(card.email)],
    ["Address", clean(card.address)],
    ["Website", clean(card.url)],
  ];
  return rows.filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}`);
}

function header(card: BusinessCard): string[] {
  const tagline = clean(card.tagline);
  return [`# ${clean(card.name) ?? "Business"}`, "", ...(tagline ? [`> ${tagline}`, ""] : [])];
}

export function llmsTxt(card: BusinessCard, pages: LlmsPage[], legal: LlmsPage[]): string {
  const base = card.url.replace(/\/+$/, "");
  const link = (p: LlmsPage) => `- [${p.title}](${base}${p.url})`;
  const out = [...header(card), "## Business", "", ...cardLines(card), "", "## Pages", ""];
  out.push(...pages.map(link), "", "## Legal", "", ...legal.map(link), "");
  return out.join("\n");
}

export function llmsFullTxt(card: BusinessCard, pages: LlmsPage[], legal: LlmsPage[]): string {
  const base = card.url.replace(/\/+$/, "");
  const out = [...header(card), "## Business", "", ...cardLines(card), ""];
  for (const page of pages) {
    out.push(`## ${page.title}`, "", `URL: ${base}${page.url}`, "");
    if (page.summary) out.push(page.summary, "");
  }
  out.push("## Legal", "", ...legal.map((p) => `- [${p.title}](${base}${p.url})`), "");
  return out.join("\n");
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
