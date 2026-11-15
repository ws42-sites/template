import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";

const { parse: parseYaml, stringify: stringifyYaml } = yaml;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

const DEFAULT_COLORS = {
  brand: "#8147ff",
  accent: "#d9822b",
  background: "#f5f5f0",
};

const PLACEHOLDER_VALUES = [
  "{{legal name}}",
  "{{mailing address}}",
  "hello@example.com",
  "Example Business",
];

function log(message, level = "info") {
  const timestamp = new Date().toISOString();
  const prefix = level === "error" ? "ERROR" : level === "warn" ? "WARN" : "INFO";
  console.log(`[${timestamp}] ${prefix}: ${message}`);
}

function parseOnboardingInput(inputPath) {
  if (!existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const content = readFileSync(inputPath, "utf8");

  let data;
  if (inputPath.endsWith(".json")) {
    data = JSON.parse(content);
  } else if (inputPath.endsWith(".html")) {
    const match = content.match(/<script[^>]*id="ws42-onboarding"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) {
      throw new Error('HTML file does not contain <script id="ws42-onboarding"> block');
    }
    data = JSON.parse(match[1]);
  } else {
    throw new Error("Input file must be .json or .html");
  }

  return data;
}

function validateOnboardingData(data) {
  const errors = [];

  if (data.schema !== "ws42.onboarding") {
    errors.push(`Invalid schema: expected "ws42.onboarding", got "${data.schema}"`);
  }

  if (data.version !== 1) {
    errors.push(`Unsupported version: expected 1, got ${data.version}`);
  }

  if (!data.exportedAt || Number.isNaN(Date.parse(data.exportedAt))) {
    errors.push("Missing or invalid exportedAt timestamp");
  }

  if (!data.data) {
    errors.push("Missing data object");
    return errors;
  }

  if (data.data.desiredEmail && !EMAIL_PATTERN.test(data.data.desiredEmail)) {
    errors.push(`Invalid email format: ${data.data.desiredEmail}`);
  }

  const colorFields = ["primary", "secondary", "tertiary"];
  if (data.data.colors) {
    for (const field of colorFields) {
      if (data.data.colors[field] && !HEX_COLOR_PATTERN.test(data.data.colors[field])) {
        errors.push(`Invalid hex color format for colors.${field}: ${data.data.colors[field]}`);
      }
    }
  }

  return errors;
}

function isPlaceholderValue(value) {
  if (!value || typeof value !== "string") return true;
  return PLACEHOLDER_VALUES.includes(value) || value.startsWith("{{") || value === "";
}

function isDefaultColor(value, colorType) {
  return value === DEFAULT_COLORS[colorType];
}

function generateSeedLog(changes, dryRun) {
  const log = {
    timestamp: new Date().toISOString(),
    dryRun,
    changes: changes.map((change) => ({
      field: change.field,
      from: change.from,
      to: change.to,
      reason: change.reason,
    })),
  };
  return log;
}

function seedSiteYml(onboardingData, dryRun = false, logPath = null) {
  const siteYmlPath = join(root, "src/content/settings/site.yml");

  if (!existsSync(siteYmlPath)) {
    throw new Error(`Site settings file not found: ${siteYmlPath}`);
  }

  const siteYmlContent = readFileSync(siteYmlPath, "utf8");
  const siteData = parseYaml(siteYmlContent);

  const changes = [];

  if (onboardingData.data.businessName) {
    if (isPlaceholderValue(siteData.name)) {
      changes.push({
        field: "name",
        from: siteData.name,
        to: onboardingData.data.businessName,
        reason: "name was empty or placeholder",
      });
      if (!dryRun) {
        siteData.name = onboardingData.data.businessName;
      }
    }

    if (isPlaceholderValue(siteData.legalName)) {
      changes.push({
        field: "legalName",
        from: siteData.legalName,
        to: onboardingData.data.businessName,
        reason: "legalName was empty or placeholder",
      });
      if (!dryRun) {
        siteData.legalName = onboardingData.data.businessName;
      }
    }
  }

  if (onboardingData.data.businessPhone) {
    if (isPlaceholderValue(siteData.phone)) {
      changes.push({
        field: "phone",
        from: siteData.phone || "(empty)",
        to: onboardingData.data.businessPhone,
        reason: "phone was empty",
      });
      if (!dryRun) {
        siteData.phone = onboardingData.data.businessPhone;
      }
    }
  }

  if (onboardingData.data.desiredEmail) {
    if (isPlaceholderValue(siteData.contactEmail)) {
      changes.push({
        field: "contactEmail",
        from: siteData.contactEmail,
        to: onboardingData.data.desiredEmail,
        reason: "contactEmail was empty or placeholder",
      });
      if (!dryRun) {
        siteData.contactEmail = onboardingData.data.desiredEmail;
      }
    }
  }

  if (onboardingData.data.colors) {
    if (onboardingData.data.colors.primary && isDefaultColor(siteData.colors.brand, "brand")) {
      changes.push({
        field: "colors.brand",
        from: siteData.colors.brand,
        to: onboardingData.data.colors.primary,
        reason: "brand color was default",
      });
      if (!dryRun) {
        siteData.colors.brand = onboardingData.data.colors.primary;
      }
    }

    if (onboardingData.data.colors.secondary && isDefaultColor(siteData.colors.accent, "accent")) {
      changes.push({
        field: "colors.accent",
        from: siteData.colors.accent,
        to: onboardingData.data.colors.secondary,
        reason: "accent color was default",
      });
      if (!dryRun) {
        siteData.colors.accent = onboardingData.data.colors.secondary;
      }
    }

    if (
      onboardingData.data.colors.tertiary &&
      isDefaultColor(siteData.colors.background, "background")
    ) {
      changes.push({
        field: "colors.background",
        from: siteData.colors.background,
        to: onboardingData.data.colors.tertiary,
        reason: "background color was default",
      });
      if (!dryRun) {
        siteData.colors.background = onboardingData.data.colors.tertiary;
      }
    }
  }

  if (changes.length === 0) {
    log("No changes needed. All values are already set or have been customized.");
    return { changes: [], seedLog: generateSeedLog([], dryRun) };
  }

  if (dryRun) {
    log(`DRY RUN: Would make ${changes.length} change(s):`);
    for (const change of changes) {
      log(`  - ${change.field}: "${change.from}" → "${change.to}" (${change.reason})`);
    }
  } else {
    const newYmlContent = stringifyYaml(siteData);
    writeFileSync(siteYmlPath, newYmlContent, "utf8");
    log(`Updated ${siteYmlPath} with ${changes.length} change(s)`);
    for (const change of changes) {
      log(`  - ${change.field}: "${change.from}" → "${change.to}"`);
    }
  }

  const seedLog = generateSeedLog(changes, dryRun);

  if (logPath) {
    const logFilePath = resolve(logPath);
    writeFileSync(logFilePath, JSON.stringify(seedLog, null, 2), "utf8");
    log(`Seed log written to: ${logFilePath}`);
  }

  return { changes, seedLog };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: npm run seed [options] <input-file>

Seed site.yml from an onboarding export.

Arguments:
  <input-file>        Path to onboarding.json or the HTML export

Options:
  --dry-run          Show what would change without modifying files
  --log <path>       Write a seed log to the specified file path
  -h, --help         Show this help message

Examples:
  npm run seed onboarding.json
  npm run seed --dry-run onboarding.json
  npm run seed --log seed-log.json clients/acme/onboarding.json
`);
    process.exit(0);
  }

  let inputFile = null;
  let dryRun = false;
  let logPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--log") {
      logPath = args[++i];
    } else if (!args[i].startsWith("--")) {
      inputFile = args[i];
    }
  }

  if (!inputFile) {
    log("Error: No input file specified", "error");
    process.exit(1);
  }

  try {
    log(`Parsing onboarding data from: ${inputFile}`);
    const onboardingData = parseOnboardingInput(inputFile);

    log("Validating onboarding data");
    const errors = validateOnboardingData(onboardingData);

    if (errors.length > 0) {
      log("Validation failed:", "error");
      for (const error of errors) {
        log(`  - ${error}`, "error");
      }
      process.exit(1);
    }

    log("Validation passed");

    const result = seedSiteYml(onboardingData, dryRun, logPath);

    if (result.changes.length === 0) {
      log("Seed complete: no changes needed");
    } else if (dryRun) {
      log(`Dry run complete: ${result.changes.length} change(s) would be made`);
    } else {
      log(`Seed complete: ${result.changes.length} change(s) applied`);
    }

    process.exit(0);
  } catch (error) {
    log(`Seed failed: ${error.message}`, "error");
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
