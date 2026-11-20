import assert from "node:assert/strict";
import { test } from "node:test";
import { toJsonLd, toLlmsTxt, toRobotsTxt, toSitemapXml, webMcpTools } from "../src/lib/seo.ts";

test("SEO-01 template business data omits placeholders and preserves PostalAddress", () => {
  const business = {
    kind: "LocalBusiness",
    name: "Cedar",
    legalName: "{{legal name}}",
    url: "https://cedar.ca",
    address: { streetAddress: "42 Cedar Street", addressLocality: "Ottawa" },
    areaServed: ["Ottawa", "42 Cedar Street"],
    services: ["Repairs", "{{service}}"],
  };
  assert.deepEqual(toJsonLd(business).areaServed, ["Ottawa"]);
  assert.equal(toJsonLd(business).address["@type"], "PostalAddress");
  assert.equal(toJsonLd(business).legalName, undefined);
  assert.equal(toLlmsTxt(business).includes("{{"), false);
});
test("SEO-02 template previews disallow all and SEO-03 sitemaps omit private routes", () => {
  const production = {
    hostname: "cedar.ca",
    productionUrl: "https://cedar.ca",
  };
  assert.equal(
    toRobotsTxt({ ...production, hostname: "cedar.pages.dev" }),
    "User-agent: *\nDisallow: /\n",
  );
  assert.equal(toRobotsTxt(production).includes("Disallow: /admin"), true);
  assert.equal(
    toSitemapXml(production, [{ path: "/admin", title: "Admin" }]).includes("<url>"),
    false,
  );
});
test("SEO-07 template contact contract uses the existing Formspree fields", () => {
  assert.deepEqual(webMcpTools.submit_contact.inputSchema.required, [
    "name",
    "email",
    "message",
    "_gotcha",
    "form_opened_at",
    "_subject",
  ]);
  assert.equal(webMcpTools.submit_contact.inputSchema.additionalProperties, false);
  assert.equal(webMcpTools.submit_contact.annotations.consequentialHint, true);
});
