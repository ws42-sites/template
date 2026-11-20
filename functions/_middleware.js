// Preview hosts (*.pages.dev aliases, localhost, or any host other than the configured production
// site) are never indexed: every response gets X-Robots-Tag: noindex and robots.txt disallows all.
// Production responses pass through untouched. Access to /api/auth and /api/callback is unchanged;
// this only adds a header to whatever they return.

export const PREVIEW_ROBOTS = "User-agent: *\nDisallow: /\n";

const bare = (host) =>
  host
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^www\./, "");

export function isPreviewHost(hostname, env = {}) {
  const host = bare(hostname);
  if (host.endsWith(".pages.dev") || host === "localhost" || host === "127.0.0.1") return true;
  const site = typeof env.PUBLIC_SITE_URL === "string" ? env.PUBLIC_SITE_URL.trim() : "";
  if (!site) return false;
  try {
    return bare(new URL(site).hostname) !== host;
  } catch {
    return false;
  }
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (!isPreviewHost(url.hostname, context.env)) return context.next();
  if (url.pathname === "/robots.txt") {
    return new Response(PREVIEW_ROBOTS, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }
  const response = await context.next();
  const out = new Response(response.body, response);
  out.headers.set("X-Robots-Tag", "noindex");
  return out;
}
