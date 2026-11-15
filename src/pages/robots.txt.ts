import type { APIRoute } from "astro";
import { getSiteUrl } from "../site.config";

export const GET: APIRoute = () => {
  const siteUrl = getSiteUrl();
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
