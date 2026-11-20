// robots.txt policy for client sites. Kept free of imports so the Pages middleware tests and the
// Astro route share one implementation.
// TODO(seo-mid): replace with toRobotsTxt(hostContext) from src/lib/seo.ts once the shared module lands.

export type AiCrawlers = "allow" | "block-training";

/** AI crawlers blocked by "block-training" (same list as the shared toRobotsTxt). Googlebot is never blocked. */
export const TRAINING_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"] as const;

export const PREVIEW_ROBOTS = "User-agent: *\nDisallow: /\n";

export function aiCrawlersFrom(...values: Array<string | undefined>): AiCrawlers {
  const value = values.find((v) => v && v.trim().length > 0);
  return value?.trim().toLowerCase() === "block-training" ? "block-training" : "allow";
}

/** A Cloudflare Pages build of any branch other than main is a preview build. */
export function isPreviewBuild(branch: string | undefined): boolean {
  return Boolean(branch && branch !== "main");
}

export function robotsTxt(opts: {
  siteUrl: string;
  preview: boolean;
  aiCrawlers: AiCrawlers;
}): string {
  if (opts.preview) return PREVIEW_ROBOTS;
  const lines = ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /api", ""];
  if (opts.aiCrawlers === "block-training") {
    for (const bot of TRAINING_CRAWLERS) lines.push(`User-agent: ${bot}`, "Disallow: /", "");
  }
  lines.push(`Sitemap: ${opts.siteUrl.replace(/\/+$/, "")}/sitemap.xml`);
  return `${lines.join("\n")}\n`;
}
