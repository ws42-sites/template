export type AnalyticsProvider = "cloudflare" | "plausible" | "fathom" | "none";

export type StructuredPostalAddress = {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
};

export const siteConfig = {
  name: "Example Business",
  legalName: "{{legal name}}",
  tagline: "A local business site started from the WS42 factory.",
  businessType: "",
  contactEmail: "hello@example.com",
  phone: "",
  mailingAddress: "{{mailing address}}",
  address: {
    streetAddress: "",
    addressLocality: "",
    addressRegion: "",
    postalCode: "",
    addressCountry: "",
  } satisfies StructuredPostalAddress,
  areaServed: [] as string[],
  services: [] as string[],
  hours: [] as string[],
  socialLinks: [] as string[],
  ogImage: "",
  jurisdiction: "British Columbia, Canada",
  privacyLaw: "the Personal Information Protection and Electronic Documents Act (PIPEDA)",
  siteUrl: "https://example.com",
  analytics: {
    provider: "none" as AnalyticsProvider,
    domain: "",
    siteId: "",
    cloudflareToken: "",
  },
  formspreeFormId: "",
  support: {
    url: "https://ws42-ops.pages.dev/support?client={{slug}}",
    enabled: true,
  },
};

type PublicEnvKey =
  | "PUBLIC_SITE_URL"
  | "PUBLIC_ANALYTICS_PROVIDER"
  | "PUBLIC_ANALYTICS_DOMAIN"
  | "PUBLIC_FATHOM_SITE_ID"
  | "PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN"
  | "PUBLIC_OG_IMAGE"
  | "PUBLIC_FORMSPREE_ID"
  | "PUBLIC_SENTRY_DSN"
  | "CF_PAGES"
  | "CF_PAGES_BRANCH";

const PREVIEW_HOST_SUFFIXES = [
  ".pages.dev",
  ".workers.dev",
  ".netlify.app",
  ".vercel.app",
  ".localhost",
  ".local",
  ".internal",
  ".invalid",
  ".test",
  ".example",
  ".example.com",
  ".example.org",
  ".example.net",
] as const;

const RESERVED_PREVIEW_HOSTS = new Set([
  "localhost",
  "pages.dev",
  "workers.dev",
  "example.com",
  "example.org",
  "example.net",
]);

const PREVIEW_HOST_PREFIXES = ["preview.", "staging.", "dev."] as const;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const NUMERIC_LABEL_PATTERN = /^\d+$/;

function readPublicEnv(name: PublicEnvKey): string {
  const metaEnv = (import.meta as ImportMeta & { env?: Partial<Record<PublicEnvKey, unknown>> })
    .env;
  const procEnv = (
    globalThis as { process?: { env?: Partial<Record<PublicEnvKey, unknown>> } }
  ).process?.env;
  const value = metaEnv?.[name] ?? procEnv?.[name];
  return typeof value === "string" ? value.trim() : "";
}

function extractHostname(hostOrUrl: string): string {
  const trimmed = hostOrUrl.trim();
  if (trimmed.length === 0 || trimmed.includes("{{") || trimmed.includes("}}")) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).hostname.toLowerCase().replace(/\.+$/, "");
    } catch {
      return "";
    }
  }
  return trimmed.toLowerCase().replace(/\.+$/, "");
}

export function isPreviewHost(hostOrUrl: string): boolean {
  const host = extractHostname(hostOrUrl);
  if (host.length === 0 || /\s/.test(host) || host.includes("..")) {
    return true;
  }
  if (host.includes(":") || host.includes("/") || host.includes("@") || host.includes("[")) {
    return true;
  }
  const labels = host.split(".");
  const lastLabel = labels[labels.length - 1] ?? "";
  if (
    RESERVED_PREVIEW_HOSTS.has(host) ||
    labels.length < 2 ||
    NUMERIC_LABEL_PATTERN.test(lastLabel)
  ) {
    return true;
  }
  if (PREVIEW_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return true;
  }
  if (PREVIEW_HOST_PREFIXES.some((prefix) => host.startsWith(prefix))) {
    return true;
  }
  return host.includes("-preview.");
}

export function sanitizeAnalyticsToken(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.includes("{{") || trimmed.includes("}}")) {
    return "";
  }
  return TOKEN_PATTERN.test(trimmed) ? trimmed : "";
}

function isCloudflarePagesPreviewBuild(): boolean {
  if (readPublicEnv("CF_PAGES") !== "1") {
    return false;
  }
  const branch = readPublicEnv("CF_PAGES_BRANCH");
  return branch.length > 0 && branch !== "main";
}

export function getSiteUrl(): string {
  return readPublicEnv("PUBLIC_SITE_URL") || siteConfig.siteUrl;
}

export function getClientOgImage(): string {
  return readPublicEnv("PUBLIC_OG_IMAGE") || siteConfig.ogImage;
}

export function getAnalyticsConfig(options?: {
  siteUrl?: string | undefined;
  hostname?: string | undefined;
  provider?: string | undefined;
  cloudflareToken?: string | undefined;
}): {
  provider: AnalyticsProvider;
  domain: string;
  siteId: string;
  cloudflareToken: string;
} {
  const configuredProvider =
    readPublicEnv("PUBLIC_ANALYTICS_PROVIDER") || siteConfig.analytics.provider;
  const raw = (options?.provider ?? configuredProvider).toLowerCase();
  const provider: AnalyticsProvider =
    raw === "cloudflare" || raw === "plausible" || raw === "fathom" ? raw : "none";
  const domain = readPublicEnv("PUBLIC_ANALYTICS_DOMAIN") || siteConfig.analytics.domain;
  const siteId = readPublicEnv("PUBLIC_FATHOM_SITE_ID") || siteConfig.analytics.siteId;
  const configuredToken =
    readPublicEnv("PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN") || siteConfig.analytics.cloudflareToken;
  const cloudflareToken = sanitizeAnalyticsToken(options?.cloudflareToken ?? configuredToken);
  const effectiveSiteUrl = options?.siteUrl ?? getSiteUrl();

  if (provider === "cloudflare") {
    const hostnameArg = options?.hostname;
    const hostnamePreview =
      typeof hostnameArg === "string" && hostnameArg.length > 0 && isPreviewHost(hostnameArg);
    const hostIsPreview =
      isCloudflarePagesPreviewBuild() || isPreviewHost(effectiveSiteUrl) || hostnamePreview;
    if (cloudflareToken.length === 0 || hostIsPreview) {
      return { provider: "none", domain: "", siteId: "", cloudflareToken: "" };
    }
    return { provider: "cloudflare", domain: "", siteId: "", cloudflareToken };
  }
  if (provider === "plausible" && domain.length === 0) {
    return { provider: "none", domain: "", siteId: "", cloudflareToken: "" };
  }
  if (provider === "fathom" && siteId.length === 0) {
    return { provider: "none", domain: "", siteId: "", cloudflareToken: "" };
  }

  return { provider, domain, siteId, cloudflareToken: "" };
}

export function getFormspreeEndpoint(): string {
  const value = readPublicEnv("PUBLIC_FORMSPREE_ID") || siteConfig.formspreeFormId;
  if (value.length === 0) {
    return "";
  }
  if (value.startsWith("https://")) {
    return value;
  }
  return `https://formspree.io/f/${value}`;
}

export function isSentryEnabled(): boolean {
  return readPublicEnv("PUBLIC_SENTRY_DSN").length > 0;
}

export function getSupportUrl(
  support: { url: string; enabled: boolean } = siteConfig.support,
): string {
  const url = support.url.trim();
  if (!support.enabled || url.includes("{{") || !/^https:\/\/[^\s<>"'`]+$/.test(url)) {
    return "";
  }
  return url;
}
