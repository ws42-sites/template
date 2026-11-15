export type AnalyticsProvider = "plausible" | "fathom" | "none";

export const siteConfig = {
  name: "Example Business",
  legalName: "{{legal name}}",
  tagline: "A local business site started from the WS42 factory.",
  contactEmail: "hello@example.com",
  mailingAddress: "{{mailing address}}",
  jurisdiction: "British Columbia, Canada",
  privacyLaw: "the Personal Information Protection and Electronic Documents Act (PIPEDA)",
  siteUrl: "https://example.com",
  analytics: {
    provider: "none" as AnalyticsProvider,
    domain: "",
    siteId: "",
  },
  formspreeFormId: "",
};

type PublicEnvKey =
  | "PUBLIC_SITE_URL"
  | "PUBLIC_ANALYTICS_PROVIDER"
  | "PUBLIC_ANALYTICS_DOMAIN"
  | "PUBLIC_FATHOM_SITE_ID"
  | "PUBLIC_FORMSPREE_ID"
  | "PUBLIC_SENTRY_DSN";

function readPublicEnv(name: PublicEnvKey): string {
  const value = import.meta.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getSiteUrl(): string {
  return readPublicEnv("PUBLIC_SITE_URL") || siteConfig.siteUrl;
}

export function getAnalyticsConfig(): {
  provider: AnalyticsProvider;
  domain: string;
  siteId: string;
} {
  const raw = (
    readPublicEnv("PUBLIC_ANALYTICS_PROVIDER") || siteConfig.analytics.provider
  ).toLowerCase();
  const provider: AnalyticsProvider = raw === "plausible" || raw === "fathom" ? raw : "none";
  const domain = readPublicEnv("PUBLIC_ANALYTICS_DOMAIN") || siteConfig.analytics.domain;
  const siteId = readPublicEnv("PUBLIC_FATHOM_SITE_ID") || siteConfig.analytics.siteId;

  if (provider === "plausible" && domain.length === 0) {
    return { provider: "none", domain: "", siteId: "" };
  }
  if (provider === "fathom" && siteId.length === 0) {
    return { provider: "none", domain: "", siteId: "" };
  }

  return { provider, domain, siteId };
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
