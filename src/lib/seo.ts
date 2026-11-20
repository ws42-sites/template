// Canonical copy: ops src/shared/seo.ts. Copy changes verbatim to template src/lib/seo.ts.
// Dependency-free so Pages Functions, browser tools and Astro can share the same policy.
export type AiCrawlers = "allow" | "block-training";
export interface SeoDocument {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  robots: "index" | "noindex";
  aiCrawlers: AiCrawlers;
}
export interface PostalAddress {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}
interface BusinessSeo {
  name: string;
  description?: string;
  tagline?: string;
  url: string;
  telephone?: string;
  email?: string;
  image?: string;
  sameAs?: string[];
  aiCrawlers?: AiCrawlers;
}
export interface LocalBusinessSeo extends BusinessSeo {
  kind: "LocalBusiness";
  legalName?: string;
  businessType?: string;
  address?: PostalAddress;
  areaServed?: string[];
  hours?: string[];
  services?: string[];
}
export interface OrganizationSeo extends BusinessSeo {
  kind: "Organization";
  logo?: string;
  offers?: { name: string; price: number; priceCurrency: string }[];
}
export type SiteSeo = LocalBusinessSeo | OrganizationSeo;
export interface HostContext {
  hostname: string;
  productionUrl: string;
}
export interface SeoPage {
  path: string;
  title: string;
  summary?: string;
  lastmod?: string;
}
export const OPS_PRIVATE_PATHS = [
  "/portal",
  "/admin",
  "/api",
  "/support",
  "/review",
  "/signed-out",
];

export function cleanSeoText(value: string | undefined): string | undefined {
  const text = value?.replace(/\s+/g, " ").trim();
  return text && !/[{}]/.test(text) ? text : undefined;
}
function webUrl(value: string | undefined): string | undefined {
  const text = cleanSeoText(value);
  if (!text) return undefined;
  try {
    const url = new URL(text);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
function texts(values: string[] = []): string[] {
  return [...new Set(values.map(cleanSeoText).filter((v): v is string => Boolean(v)))];
}
export function isPreviewHost(context: HostContext): boolean {
  try {
    const host = new URL(`https://${context.hostname}`).hostname.toLowerCase();
    const production = new URL(context.productionUrl);
    return (
      !webUrl(context.productionUrl) ||
      host.endsWith(".pages.dev") ||
      host === "pages.dev" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host !== production.hostname.toLowerCase()
    );
  } catch {
    return true;
  }
}
export function isPublicPath(path: string): boolean {
  try {
    const url = new URL(path, "https://site.invalid");
    if (url.origin !== "https://site.invalid" || url.search || url.hash) return false;
    const decoded = decodeURIComponent(url.pathname).replace(/\\/g, "/").toLowerCase();
    if (decoded.includes("%") || decoded.startsWith("//")) return false;
    const normalized = new URL(decoded, "https://site.invalid").pathname;
    return !OPS_PRIVATE_PATHS.some((p) => normalized === p || normalized.startsWith(`${p}/`));
  } catch {
    return false;
  }
}
export function robotsForPage(context: HostContext, path: string): SeoDocument["robots"] {
  return isPreviewHost(context) || !isPublicPath(path) ? "noindex" : "index";
}
export function toRobotsTxt(
  context: HostContext,
  options: { site?: "ops" | "client"; aiCrawlers?: AiCrawlers } = {},
): string {
  if (isPreviewHost(context)) return "User-agent: *\nDisallow: /\n";
  const ops = options.site === "ops";
  const rules = [
    "User-agent: *",
    "Allow: /",
    ...(ops ? ["Allow: /onboard"] : []),
    ...(ops ? OPS_PRIVATE_PATHS : ["/admin", "/api"]).map((p) => `Disallow: ${p}`),
  ];
  // Explicit crawler groups repeat private restrictions: a matching group supersedes '*'.
  if (options.aiCrawlers === "block-training") {
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
      rules.push("", `User-agent: ${bot}`, "Disallow: /");
    }
  }
  rules.push("", `Sitemap: ${new URL("/sitemap.xml", context.productionUrl).href}`);
  return `${rules.join("\n")}\n`;
}
export function publicSeoPages(pages: SeoPage[], site: "ops" | "client" = "client"): SeoPage[] {
  return pages.filter(
    (p) =>
      cleanSeoText(p.path) &&
      cleanSeoText(p.title) &&
      isPublicPath(p.path) &&
      (site !== "ops" || ["/", "/onboard"].includes(p.path)),
  );
}
const xml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c] ?? c,
  );
export function toSitemapXml(
  context: HostContext,
  pages: SeoPage[],
  site: "ops" | "client" = "client",
): string {
  const entries = isPreviewHost(context) ? [] : publicSeoPages(pages, site);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries
    .map((p) => {
      const date =
        p.lastmod &&
        /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(p.lastmod) &&
        Number.isFinite(Date.parse(p.lastmod))
          ? p.lastmod
          : undefined;
      return `<url><loc>${xml(new URL(p.path, context.productionUrl).href)}</loc>${date ? `<lastmod>${xml(date)}</lastmod>` : ""}</url>`;
    })
    .join("")}</urlset>\n`;
}

const days: Record<string, string> = {
  monday: "Mo",
  tuesday: "Tu",
  wednesday: "We",
  thursday: "Th",
  friday: "Fr",
  saturday: "Sa",
  sunday: "Su",
};
function clock(value: string): string | undefined {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return undefined;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (minute > 59 || hour > (match[3] ? 12 : 23) || (match[3] && hour < 1)) return undefined;
  // Bare hours such as '9-5' are ambiguous; require minutes or an AM/PM marker.
  if (!match[2] && !match[3]) return undefined;
  if (match[3]) hour = (hour % 12) + (match[3].toLowerCase() === "pm" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
export function parseOpeningHours(hours: string[] = []): string[] {
  return texts(hours).flatMap((line) => {
    const match = line.match(
      /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):?\s+(.+?)\s*[-–—]\s*(.+)$/i,
    );
    if (!match) return [];
    const start = clock(match[2] ?? ""),
      end = clock(match[3] ?? "");
    return start && end ? [`${days[(match[1] ?? "").toLowerCase()]} ${start}-${end}`] : [];
  });
}
function areas(business: LocalBusinessSeo): string[] {
  const street = cleanSeoText(business.address?.streetAddress)?.toLowerCase();
  return texts(business.areaServed).filter(
    (area) => !/^\d/.test(area) && (!street || !area.toLowerCase().includes(street)),
  );
}
export function toJsonLd(business: SiteSeo): Record<string, unknown> {
  const result: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": business.kind,
  };
  for (const key of ["name", "description", "telephone", "email"] as const) {
    const value = cleanSeoText(business[key]);
    if (value) result[key] = value;
  }
  for (const key of ["url", "image"] as const) {
    const value = webUrl(business[key]);
    if (value) result[key] = value;
  }
  const social = (business.sameAs ?? []).map(webUrl).filter(Boolean);
  if (social.length) result.sameAs = social;
  if (business.kind === "Organization") {
    if (webUrl(business.logo)) result.logo = webUrl(business.logo);
    const offers = (business.offers ?? []).filter(
      (o) =>
        cleanSeoText(o.name) &&
        Number.isFinite(o.price) &&
        o.price >= 0 &&
        /^[A-Z]{3}$/.test(o.priceCurrency),
    );
    if (offers.length)
      result.makesOffer = offers.map((o) => ({
        "@type": "Offer",
        ...o,
        name: cleanSeoText(o.name),
      }));
  } else {
    const legalName = cleanSeoText(business.legalName);
    if (legalName) result.legalName = legalName;
    const address = Object.fromEntries(
      Object.entries(business.address ?? {}).flatMap(([k, v]) =>
        cleanSeoText(v) ? [[k, cleanSeoText(v)]] : [],
      ),
    );
    if (Object.keys(address).length) result.address = { "@type": "PostalAddress", ...address };
    if (areas(business).length) result.areaServed = areas(business);
    const hours = parseOpeningHours(business.hours);
    if (hours.length) result.openingHours = hours;
    const services = texts(business.services);
    if (services.length)
      result.hasOfferCatalog = {
        "@type": "OfferCatalog",
        itemListElement: services.map((name) => ({ "@type": "Service", name })),
      };
  }
  return result;
}
export function serializeJsonLd(business: SiteSeo): string {
  // Safe inside an HTML script element even when imported copy contains '</script>'.
  return JSON.stringify(toJsonLd(business)).replace(/</g, "\\u003c");
}
export const WORKSHOP42_SEO: OrganizationSeo = {
  kind: "Organization",
  name: "Workshop 42",
  url: "https://build.ws42.ca",
  description: "A local business website for $42 to launch (one-time) and $42/month.",
  email: "support@ws42.ca",
  logo: "https://build.ws42.ca/icon-512.png",
  offers: [
    { name: "Website launch (one-time)", price: 42, priceCurrency: "CAD" },
    {
      name: "Website hosting and support per month",
      price: 42,
      priceCurrency: "CAD",
    },
  ],
};
export const WORKSHOP42_PAGES: SeoPage[] = [
  { path: "/", title: "Home" },
  { path: "/onboard", title: "Start your website" },
];
export function toLlmsTxt(business: SiteSeo, pages: SeoPage[] = []): string {
  const lines = [`# ${cleanSeoText(business.name) ?? "Business"}`];
  for (const value of [business.tagline, business.description]) {
    const text = cleanSeoText(value);
    if (text) lines.push(text);
  }
  for (const [label, value] of [
    ["Website", webUrl(business.url)],
    ["Phone", business.telephone],
    ["Email", business.email],
  ]) {
    if (cleanSeoText(value)) lines.push(`${label}: ${cleanSeoText(value)}`);
  }
  if (business.kind === "LocalBusiness") {
    for (const [label, values] of [
      ["Type", [business.businessType ?? ""]],
      ["Area served", areas(business)],
      ["Services", texts(business.services)],
      ["Hours", texts(business.hours)],
      ["Address", Object.values(business.address ?? {})],
    ] as const) {
      const safe = texts([...values]);
      if (safe.length) lines.push(`${label}: ${safe.join("; ")}`);
    }
  }
  const site =
    business.kind === "Organization" && business.url === WORKSHOP42_SEO.url ? "ops" : "client";
  const url = webUrl(business.url);
  if (url)
    for (const page of publicSeoPages(pages, site))
      lines.push(`- ${cleanSeoText(page.title)}: ${new URL(page.path, url).href}`);
  return `${lines.join("\n\n")}\n`;
}
export function toLlmsFullTxt(business: SiteSeo, pages: SeoPage[] = []): string {
  const site =
    business.kind === "Organization" && business.url === WORKSHOP42_SEO.url ? "ops" : "client";
  const summaries = publicSeoPages(pages, site).flatMap((page) =>
    cleanSeoText(page.summary)
      ? [`## ${cleanSeoText(page.title)}\n\n${cleanSeoText(page.summary)}`]
      : [],
  );
  return `${toLlmsTxt(business, pages)}${summaries.length ? `\n${summaries.join("\n\n")}\n` : ""}`;
}

export interface WebMcpInputs {
  get_business_info: Record<string, never>;
  get_hours: Record<string, never>;
  get_services: Record<string, never>;
  get_pricing: Record<string, never>;
  start_onboarding: Record<string, never>;
  submit_contact: {
    name: string;
    email: string;
    message: string;
    _gotcha: string;
    form_opened_at: string;
    _subject: string;
  };
}
export interface WebMcpOutputs {
  get_business_info: {
    name: string;
    businessType?: string;
    areaServed: string[];
    address?: PostalAddress;
    telephone?: string;
    url: string;
  };
  get_hours: { hours: string[] };
  get_services: { services: string[] };
  get_pricing: {
    launch: number;
    monthly: number;
    currency: string;
    includes: string[];
  };
  start_onboarding: { url: string };
  submit_contact: { ok: boolean; message: string };
}
export interface ToolJsonSchema {
  type: "object" | "string" | "number" | "boolean" | "array";
  properties?: Record<string, ToolJsonSchema>;
  required?: string[];
  additionalProperties?: false;
  items?: ToolJsonSchema;
  format?: "email" | "uri";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}
const stringSchema: ToolJsonSchema = { type: "string" };
const stringsSchema: ToolJsonSchema = { type: "array", items: stringSchema };
const objectSchema = (
  properties: Record<string, ToolJsonSchema>,
  required = Object.keys(properties),
): ToolJsonSchema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const emptySchema = objectSchema({});
export const webMcpTools = {
  get_business_info: {
    description: "Read public business information.",
    inputSchema: emptySchema,
    outputSchema: objectSchema(
      {
        name: stringSchema,
        businessType: stringSchema,
        areaServed: stringsSchema,
        address: objectSchema(
          {
            streetAddress: stringSchema,
            addressLocality: stringSchema,
            addressRegion: stringSchema,
            postalCode: stringSchema,
            addressCountry: stringSchema,
          },
          [],
        ),
        telephone: stringSchema,
        url: { type: "string", format: "uri" },
      },
      ["name", "areaServed", "url"],
    ),
  },
  get_hours: {
    description: "Read published opening hours.",
    inputSchema: emptySchema,
    outputSchema: objectSchema({ hours: stringsSchema }),
  },
  get_services: {
    description: "Read published services.",
    inputSchema: emptySchema,
    outputSchema: objectSchema({ services: stringsSchema }),
  },
  get_pricing: {
    description: "Read Workshop 42 website pricing.",
    inputSchema: emptySchema,
    outputSchema: objectSchema({
      launch: { type: "number" },
      monthly: { type: "number" },
      currency: stringSchema,
      includes: stringsSchema,
    }),
  },
  start_onboarding: {
    description: "Open /onboard; never submit a website request.",
    inputSchema: emptySchema,
    outputSchema: objectSchema({ url: { type: "string", format: "uri" } }),
  },
  // Matches ContactForm.astro's Formspree fields. No Turnstile exists there today.
  // The caller must use the existing form submission handler, including timing/honeypot checks.
  submit_contact: {
    description: "Send a message through the existing contact form.",
    annotations: { consequentialHint: true },
    inputSchema: objectSchema({
      name: { type: "string", minLength: 1 },
      email: { type: "string", format: "email" },
      message: { type: "string", minLength: 1 },
      _gotcha: { type: "string", maxLength: 0 },
      form_opened_at: { type: "string", pattern: "^[0-9]+$" },
      _subject: { type: "string", minLength: 1 },
    }),
    outputSchema: objectSchema({
      ok: { type: "boolean" },
      message: stringSchema,
    }),
  },
} satisfies Record<
  keyof WebMcpInputs,
  {
    description: string;
    inputSchema: ToolJsonSchema;
    outputSchema: ToolJsonSchema;
    annotations?: { consequentialHint: boolean };
  }
>;
export interface WebMcpTool<Name extends keyof WebMcpInputs> {
  name: Name;
  description: string;
  inputSchema: ToolJsonSchema;
  annotations?: { consequentialHint: boolean };
  execute: (input: WebMcpInputs[Name]) => Promise<WebMcpOutputs[Name]>;
}
