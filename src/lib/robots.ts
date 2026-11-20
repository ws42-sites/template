// robots.txt policy for client sites. Thin wrappers around src/lib/seo.ts so Pages middleware
// tests and the Astro route share one implementation.
import { type HostContext, type AiCrawlers as SharedAiCrawlers, toRobotsTxt } from "./seo.ts";

export type AiCrawlers = SharedAiCrawlers;

/** AI crawlers blocked by "block-training" (same list as the shared toRobotsTxt). Googlebot is never blocked. */
export const TRAINING_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
] as const;

export const PREVIEW_ROBOTS = "User-agent: *\nDisallow: /\n";

export function aiCrawlersFrom(...values: Array<string | undefined>): AiCrawlers {
  const value = values.find((v) => v && v.trim().length > 0);
  return value?.trim().toLowerCase() === "block-training" ? "block-training" : "allow";
}

/** A Cloudflare Pages build of any branch other than main is a preview build. */
export function isPreviewBuild(branch: string | undefined): boolean {
  return Boolean(branch && branch !== "main");
}

function hostContext(siteUrl: string, preview: boolean): HostContext {
  let productionUrl = siteUrl;
  let hostname = "example.com";
  try {
    const url = new URL(siteUrl);
    productionUrl = url.href;
    hostname = preview ? "preview.pages.dev" : url.hostname;
  } catch {
    if (preview) hostname = "preview.pages.dev";
  }
  return { hostname, productionUrl };
}

export function robotsTxt(opts: {
  siteUrl: string;
  preview: boolean;
  aiCrawlers: AiCrawlers;
}): string {
  return toRobotsTxt(hostContext(opts.siteUrl, opts.preview), {
    site: "client",
    aiCrawlers: opts.aiCrawlers,
  });
}
