import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const errors = [];

const isDir = (path) => existsSync(join(root, path)) && statSync(join(root, path)).isDirectory();
const isFile = (path) => existsSync(join(root, path)) && statSync(join(root, path)).isFile();

const requireDir = (path, why) => {
  if (!isDir(path)) errors.push(`Missing folder ${path}/ (${why})`);
};
const requireFile = (path, why) => {
  if (!isFile(path)) errors.push(`Missing file ${path} (${why})`);
};

requireDir("public", "static assets");
requireDir("public/images", "site images");
requireFile("public/images/ws42-logo-purple.svg", "WS42 logo used in the header");
requireFile("public/images/uploads/ws42-logo-purple.svg", "WS42 logo in the Decap media library");

for (const dir of ["src/pages", "src/components", "src/layouts"]) {
  requireDir(dir, "Astro structure");
}

requireFile("public/admin/config.yml", "Decap CMS config");
requireFile("biome.json", "Biome lint and format config");
requireFile("src/content/settings/site.yml", "Site settings (single source of truth for identity)");

if (existsSync(join(root, "netlify.toml"))) {
  errors.push("Found netlify.toml, but hosting is on Cloudflare Pages. Remove it.");
}

const checkForHardcodedIdentity = () => {
  const filesToCheck = ["src/site.config.ts", "src/layouts/Base.astro"];
  const _forbiddenPatterns = [
    {
      pattern: /siteConfig\s*=\s*{[^}]*name:\s*["'][^"']+["']/s,
      message:
        "site.config.ts should not have hardcoded name values; they should come from site.yml",
    },
    {
      pattern: /siteConfig\s*=\s*{[^}]*contactEmail:\s*["'][^"']+["']/s,
      message:
        "site.config.ts should not have hardcoded contactEmail values outside fallbacks; they should come from site.yml",
    },
  ];

  for (const file of filesToCheck) {
    if (!isFile(file)) continue;
    const content = readFileSync(join(root, file), "utf8");

    if (file === "src/site.config.ts") {
      if (content.includes("export const siteConfig = {")) {
        const hasGetSiteConfig = content.includes("export async function getSiteConfig()");
        const hasImportGetEntry = content.includes('import { getEntry } from "astro:content"');

        if (!hasGetSiteConfig || !hasImportGetEntry) {
          errors.push(
            "src/site.config.ts must import getEntry and export getSiteConfig() to read from site.yml",
          );
        }
      }
    }
  }
};

checkForHardcodedIdentity();

if (isFile("package.json")) {
  const scripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts ?? {};
  for (const name of ["build", "lint", "check"]) {
    if (!scripts[name]) errors.push(`package.json is missing the "${name}" script`);
  }
} else {
  errors.push("Missing file package.json");
}

const skip = new Set([".git", "node_modules", "dist", ".astro", ".wrangler"]);
const markdown = /\.(md|mdx|markdown)$/i;
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (markdown.test(entry.name)) {
      const rel = relative(root, full);
      if (rel !== "README.md" && !rel.startsWith("docs/"))
        errors.push(
          `Markdown file not allowed: ${rel} (only README.md and docs/*.md are permitted)`,
        );
    }
  }
};
walk(root);

if (errors.length > 0) {
  console.error(
    `Architecture check failed with ${errors.length} problem${errors.length === 1 ? "" : "s"}:`,
  );
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("Architecture check passed.");
