import type { StructuredPostalAddress } from "../site.config";

export const DEFAULT_CLIENT_OG_IMAGE_PATH = "/images/og-default.png";

const WS42_LOGO_PATTERN =
  /(?:^|\/)ws42[-_](?:logo|mark)[^/]*\.(?:svg|png|webp|jpe?g|avif)(?:[?#]|$)/i;
const PLACEHOLDER_PATTERN = /\{\{[\s\S]*?\}\}/;
const FALLBACK_SITE_ORIGIN = "https://example.com";

export type ClientSeoSource = {
  name: string;
  legalName?: string | undefined;
  tagline?: string | undefined;
  businessType?: string | undefined;
  contactEmail?: string | undefined;
  phone?: string | undefined;
  mailingAddress?: string | undefined;
  address?: Partial<StructuredPostalAddress> | undefined;
  areaServed?: readonly string[] | undefined;
  services?: readonly string[] | undefined;
  hours?: readonly string[] | undefined;
  socialLinks?: readonly string[] | undefined;
};

export type ClientWebMcpData = {
  name: string;
  tagline: string;
  url: string;
  businessType?: string | undefined;
  email?: string | undefined;
  telephone?: string | undefined;
  address?: string | undefined;
  areaServed: string[];
  hours: string[];
  services: string[];
};

type PostalAddressJsonLd = {
  "@type": "PostalAddress";
  streetAddress?: string | undefined;
  addressLocality?: string | undefined;
  addressRegion?: string | undefined;
  postalCode?: string | undefined;
  addressCountry?: string | undefined;
};

export function isCleanSeoText(value: string | undefined): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && !PLACEHOLDER_PATTERN.test(trimmed);
}

export function resolveSafeSiteUrl(siteUrl: string | undefined): string {
  if (isCleanSeoText(siteUrl)) {
    try {
      const parsed = new URL(siteUrl.trim());
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.href.replace(/\/$/, "");
      }
    } catch {
      // Fall back to default origin.
    }
  }
  return FALLBACK_SITE_ORIGIN;
}

export function serializeSafeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function cleanList(items: readonly string[] | undefined): string[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.filter((item): item is string => isCleanSeoText(item)).map((item) => item.trim());
}

function cleanHttpUrls(items: readonly string[] | undefined): string[] {
  const out: string[] = [];
  for (const item of cleanList(items)) {
    try {
      const parsed = new URL(item);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        out.push(parsed.href);
      }
    } catch {
      // Skip malformed URLs.
    }
  }
  return out;
}

export function resolveClientOgImage(
  siteUrl: string,
  ...candidates: Array<string | undefined>
): string {
  const base = `${resolveSafeSiteUrl(siteUrl)}/`;
  for (const candidate of candidates) {
    if (!isCleanSeoText(candidate)) {
      continue;
    }
    const trimmed = candidate.trim();
    if (WS42_LOGO_PATTERN.test(trimmed)) {
      continue;
    }
    try {
      const resolved = new URL(trimmed, base);
      if (resolved.protocol === "https:" || resolved.protocol === "http:") {
        return resolved.href;
      }
    } catch {
      // Fall through to next candidate.
    }
  }
  return new URL(DEFAULT_CLIENT_OG_IMAGE_PATH, base).href;
}

function buildPostalAddress(
  structured: Partial<StructuredPostalAddress> | undefined,
  mailingAddress: string | undefined,
): PostalAddressJsonLd | undefined {
  if (structured) {
    const address: PostalAddressJsonLd = {
      "@type": "PostalAddress",
      ...(isCleanSeoText(structured.streetAddress)
        ? { streetAddress: structured.streetAddress.trim() }
        : {}),
      ...(isCleanSeoText(structured.addressLocality)
        ? { addressLocality: structured.addressLocality.trim() }
        : {}),
      ...(isCleanSeoText(structured.addressRegion)
        ? { addressRegion: structured.addressRegion.trim() }
        : {}),
      ...(isCleanSeoText(structured.postalCode)
        ? { postalCode: structured.postalCode.trim() }
        : {}),
      ...(isCleanSeoText(structured.addressCountry)
        ? { addressCountry: structured.addressCountry.trim() }
        : {}),
    };
    if (Object.keys(address).some((key) => !key.startsWith("@"))) {
      return address;
    }
  }
  if (isCleanSeoText(mailingAddress)) {
    return {
      "@type": "PostalAddress",
      streetAddress: mailingAddress.trim(),
    };
  }
  return undefined;
}

function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === "string") {
    return isCleanSeoText(value) ? value.trim() : undefined;
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => sanitizeJsonValue(item))
      .filter((item) => item !== undefined);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  if (value !== null && typeof value === "object") {
    const nested = stripPlaceholderFields(value as Record<string, unknown>);
    return Object.keys(nested).some((key) => !key.startsWith("@")) ? nested : undefined;
  }
  return value;
}

function stripPlaceholderFields(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith("@") && typeof value === "string" && isCleanSeoText(value)) {
      out[key] = value.trim();
      continue;
    }
    const sanitized = sanitizeJsonValue(value);
    if (sanitized !== undefined) {
      out[key] = sanitized;
    }
  }
  return out;
}

// Hook for mid's shared LocalBusinessSeo -> toJsonLd() mapper when src/lib/seo.ts lands.
export type LocalBusinessJsonLdMapper = (source: ClientSeoSource) => Record<string, unknown>;

export function buildClientJsonLd(
  source: ClientSeoSource,
  options: {
    siteUrl: string;
    ogImage: string;
    description?: string | undefined;
    mapper?: LocalBusinessJsonLdMapper | undefined;
  },
): Record<string, unknown> {
  if (options.mapper) {
    return stripPlaceholderFields(options.mapper(source));
  }

  const hasName = isCleanSeoText(source.name);
  const safeSiteUrl = resolveSafeSiteUrl(options.siteUrl);
  const desc = isCleanSeoText(options.description)
    ? options.description.trim()
    : isCleanSeoText(source.tagline)
      ? source.tagline.trim()
      : undefined;
  const postalAddress = buildPostalAddress(source.address, source.mailingAddress);
  const areaServed = cleanList(source.areaServed);
  const openingHours = cleanList(source.hours);
  const sameAs = cleanHttpUrls(source.socialLinks);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": hasName ? "LocalBusiness" : "Organization",
    ...(hasName ? { name: source.name.trim() } : {}),
    ...(desc ? { description: desc } : {}),
    url: safeSiteUrl,
    ...(isCleanSeoText(options.ogImage) && !WS42_LOGO_PATTERN.test(options.ogImage)
      ? { image: options.ogImage.trim() }
      : {}),
    ...(isCleanSeoText(source.legalName) ? { legalName: source.legalName.trim() } : {}),
    ...(isCleanSeoText(source.contactEmail) ? { email: source.contactEmail.trim() } : {}),
    ...(isCleanSeoText(source.phone) ? { telephone: source.phone.trim() } : {}),
    ...(postalAddress ? { address: postalAddress } : {}),
    ...(areaServed.length > 0 ? { areaServed } : {}),
    ...(openingHours.length > 0 ? { openingHours } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return stripPlaceholderFields(jsonLd);
}

export function buildClientWebMcpData(source: ClientSeoSource, siteUrl: string): ClientWebMcpData {
  const postalAddress = buildPostalAddress(source.address, source.mailingAddress);
  const formattedAddress = postalAddress
    ? [
        postalAddress.streetAddress,
        postalAddress.addressLocality,
        postalAddress.addressRegion,
        postalAddress.postalCode,
        postalAddress.addressCountry,
      ]
        .filter((part): part is string => typeof part === "string" && part.length > 0)
        .join(", ")
    : "";

  return {
    name: isCleanSeoText(source.name) ? source.name.trim() : "",
    tagline: isCleanSeoText(source.tagline) ? source.tagline.trim() : "",
    url: resolveSafeSiteUrl(siteUrl),
    ...(isCleanSeoText(source.businessType) ? { businessType: source.businessType.trim() } : {}),
    ...(isCleanSeoText(source.contactEmail) ? { email: source.contactEmail.trim() } : {}),
    ...(isCleanSeoText(source.phone) ? { telephone: source.phone.trim() } : {}),
    ...(formattedAddress.length > 0 ? { address: formattedAddress } : {}),
    areaServed: cleanList(source.areaServed),
    hours: cleanList(source.hours),
    services: cleanList(source.services),
  };
}
