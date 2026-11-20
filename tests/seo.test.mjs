import assert from "node:assert/strict";
import { test } from "node:test";
import { isPreviewHost, onRequest, PREVIEW_ROBOTS } from "../functions/_middleware.js";
import { llmsFullTxt, llmsTxt, summarize } from "../src/lib/llms.ts";
import { aiCrawlersFrom, isPreviewBuild, robotsTxt } from "../src/lib/robots.ts";

test("SEO-02 production robots allows /, disallows /admin and /api, and links the sitemap", () => {
  assert.equal(
    robotsTxt({ siteUrl: "https://harbourbakery.ca/", preview: false, aiCrawlers: "allow" }),
    "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://harbourbakery.ca/sitemap.xml\n",
  );
});

test("SEO-02 block-training disallows the four AI crawlers; preview builds disallow everything", () => {
  const body = robotsTxt({ siteUrl: "https://a.ca", preview: false, aiCrawlers: "block-training" });
  for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
    assert.ok(body.includes(`User-agent: ${bot}\nDisallow: /\n`), bot);
  }
  assert.ok(!/Googlebot|CCBot/.test(body));
  assert.equal(
    robotsTxt({ siteUrl: "https://a.ca", preview: true, aiCrawlers: "allow" }),
    PREVIEW_ROBOTS,
  );
  assert.deepEqual(
    [isPreviewBuild("main"), isPreviewBuild("factory-preview"), isPreviewBuild(undefined)],
    [false, true, false],
  );
  assert.equal(aiCrawlersFrom("", "block-training"), "block-training");
  assert.equal(aiCrawlersFrom("allow", "block-training"), "allow");
  assert.equal(aiCrawlersFrom(undefined, "nonsense"), "allow");
});

test("SEO-05 preview hosts are pages.dev, localhost or anything but the configured site", () => {
  const env = { PUBLIC_SITE_URL: "https://harbourbakery.ca" };
  assert.equal(isPreviewHost("harbour-bakery.pages.dev", {}), true);
  assert.equal(isPreviewHost("abc.harbour-bakery.pages.dev", env), true);
  assert.equal(isPreviewHost("harbourbakery.ca", env), false);
  assert.equal(isPreviewHost("www.harbourbakery.ca", env), false);
  assert.equal(isPreviewHost("other.example", env), true);
  assert.equal(isPreviewHost("harbourbakery.ca", {}), false);
});

const html = () =>
  new Response("<p>hi</p>", { status: 200, headers: { "Content-Type": "text/html" } });
const run = (url, next = async () => html()) =>
  onRequest({ request: new Request(url), env: { PUBLIC_SITE_URL: "https://a.ca" }, next });

test("SEO-05 middleware noindexes preview hosts, serves disallow-all robots and leaves production alone", async () => {
  const preview = await run("https://x.pages.dev/about/");
  assert.equal(preview.headers.get("X-Robots-Tag"), "noindex");
  assert.equal(await preview.text(), "<p>hi</p>");
  assert.equal(await (await run("https://x.pages.dev/robots.txt")).text(), PREVIEW_ROBOTS);
  const prod = await run("https://a.ca/");
  assert.equal(prod.headers.get("X-Robots-Tag"), null);
  const redirect = new Response(null, {
    status: 302,
    headers: { Location: "https://github.com/" },
  });
  const oauth = await run("https://x.pages.dev/api/auth", async () => redirect);
  assert.equal(oauth.status, 302);
  assert.equal(oauth.headers.get("Location"), "https://github.com/");
});

const card = {
  name: "Harbour Bakery",
  tagline: "Fresh bread daily",
  type: "Bakery",
  areaServed: ["Halifax", "{{service area}}"],
  services: ["Bread", "Cakes"],
  hours: ["Mon-Fri 7am-6pm", ""],
  phone: "+1 902 555 0100",
  email: "hi@harbourbakery.ca",
  address: "{{mailing address}}",
  url: "https://harbourbakery.ca/",
};
const pages = [
  { title: "Home", url: "/", summary: "Fresh bread daily" },
  { title: "About", url: "/about/", summary: "We bake." },
];
const legal = [{ title: "Privacy Policy", url: "/privacy/" }];

test("SEO-04 llms files are a business card plus page index and never leak placeholders", () => {
  const short = llmsTxt(card, pages, legal);
  assert.ok(short.startsWith("# Harbour Bakery\n\nFresh bread daily\n"));
  for (const line of [
    "Type: Bakery",
    "Area served: Halifax",
    "Services: Bread; Cakes",
    "Hours: Mon-Fri 7am-6pm",
    "Phone: +1 902 555 0100",
    "Website: https://harbourbakery.ca/",
    "- About: https://harbourbakery.ca/about/",
    "- Privacy Policy: https://harbourbakery.ca/privacy/",
  ]) {
    assert.ok(short.includes(line), line);
  }
  const full = llmsFullTxt(card, pages, legal);
  assert.ok(full.includes("## About\n\nWe bake."));
  for (const body of [short, full]) {
    assert.ok(!body.includes("{{"));
    assert.ok(!body.includes("Address:"));
    assert.ok(!/\/admin|\/api/.test(body));
  }
});

test("SEO-04 summaries take the first prose paragraph without markdown", () => {
  assert.equal(summarize("## Heading\n\nWe **bake** [bread](/b).\n\nMore."), "We bake bread.");
  assert.equal(summarize("x".repeat(500), 10), `${"x".repeat(9)}…`);
});
