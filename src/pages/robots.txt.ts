import type { APIRoute } from "astro";
import { aiCrawlersFrom, isPreviewBuild, robotsTxt } from "../lib/robots";
import { getSiteUrl, siteConfig } from "../site.config";

// Build-time env (Cloudflare Pages sets CF_PAGES_BRANCH). Preview hosts on a production build are
// also covered at request time by functions/_middleware.js.
const buildEnv =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

export const GET: APIRoute = () => {
  const body = robotsTxt({
    siteUrl: getSiteUrl(),
    preview: isPreviewBuild(buildEnv.CF_PAGES_BRANCH),
    aiCrawlers: aiCrawlersFrom(import.meta.env.PUBLIC_AI_CRAWLERS, siteConfig.aiCrawlers),
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
