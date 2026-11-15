import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..");
const testDir = join(root, "test-temp");

function setup() {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true });
  }
  mkdirSync(testDir, { recursive: true });
}

function cleanup() {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true });
  }
}

function createTestOnboardingJson() {
  const data = {
    schema: "ws42.onboarding",
    version: 1,
    exportedAt: "2026-11-15T10:30:00Z",
    data: {
      contactName: "Jane Smith",
      businessName: "Test Business Co.",
      businessPhone: "416-555-9999",
      desiredEmail: "contact@testbiz.com",
      colors: {
        mode: "palette",
        paletteName: "Ocean teal",
        primary: "#0f766e",
        secondary: "#f97316",
        tertiary: "#ecfeff",
      },
    },
  };

  const path = join(testDir, "onboarding.json");
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
  return path;
}

function createTestHtmlExport() {
  const data = {
    schema: "ws42.onboarding",
    version: 1,
    exportedAt: "2026-11-15T10:30:00Z",
    data: {
      businessName: "HTML Test Business",
      businessPhone: "555-1234",
      desiredEmail: "hello@htmltest.com",
      colors: {
        primary: "#1f4e79",
        secondary: "#f2b134",
        tertiary: "#f4f1ea",
      },
    },
  };

  const html = `<!DOCTYPE html>
<html>
<head><title>Onboarding Export</title></head>
<body>
<h1>Onboarding Data</h1>
<script type="application/json" id="ws42-onboarding">
${JSON.stringify(data, null, 2)}
</script>
</body>
</html>`;

  const path = join(testDir, "onboarding.html");
  writeFileSync(path, html, "utf8");
  return path;
}

function backupSiteYml() {
  const siteYmlPath = join(root, "src/content/settings/site.yml");
  const backupPath = join(testDir, "site.yml.backup");
  if (existsSync(siteYmlPath)) {
    writeFileSync(backupPath, readFileSync(siteYmlPath, "utf8"), "utf8");
  }
  return backupPath;
}

function restoreSiteYml() {
  const siteYmlPath = join(root, "src/content/settings/site.yml");
  const backupPath = join(testDir, "site.yml.backup");
  if (existsSync(backupPath)) {
    writeFileSync(siteYmlPath, readFileSync(backupPath, "utf8"), "utf8");
  }
}

function runTest(name, fn) {
  try {
    console.log(`\n▶ ${name}`);
    fn();
    console.log(`✓ ${name} passed`);
    return true;
  } catch (error) {
    console.error(`✗ ${name} failed: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    return false;
  }
}

function testDryRun() {
  const jsonPath = createTestOnboardingJson();
  const logPath = join(testDir, "dry-run-log.json");

  const output = execSync(
    `node scripts/seed-from-onboarding.mjs --dry-run --log "${logPath}" "${jsonPath}"`,
    { cwd: root, encoding: "utf8" },
  );

  if (!output.includes("DRY RUN")) {
    throw new Error("Dry run output does not contain 'DRY RUN'");
  }

  if (!existsSync(logPath)) {
    throw new Error("Seed log was not created");
  }

  const log = JSON.parse(readFileSync(logPath, "utf8"));
  if (!log.dryRun) {
    throw new Error("Seed log does not indicate dry run");
  }

  const siteYml = readFileSync(join(root, "src/content/settings/site.yml"), "utf8");
  if (siteYml.includes("Test Business Co.")) {
    throw new Error("Dry run should not modify site.yml");
  }
}

function testValidationErrors() {
  const invalidData = {
    schema: "wrong.schema",
    version: 1,
    exportedAt: "2026-11-15T10:30:00Z",
    data: {},
  };

  const jsonPath = join(testDir, "invalid.json");
  writeFileSync(jsonPath, JSON.stringify(invalidData, null, 2), "utf8");

  try {
    execSync(`node scripts/seed-from-onboarding.mjs "${jsonPath}"`, {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    });
    throw new Error("Should have failed validation");
  } catch (error) {
    if (!error.message.includes("Invalid schema") && error.status !== 1) {
      throw new Error("Expected validation error");
    }
  }
}

function testHtmlInput() {
  const htmlPath = createTestHtmlExport();
  const logPath = join(testDir, "html-log.json");

  execSync(`node scripts/seed-from-onboarding.mjs --dry-run --log "${logPath}" "${htmlPath}"`, {
    cwd: root,
    encoding: "utf8",
  });

  if (!existsSync(logPath)) {
    throw new Error("Seed log was not created for HTML input");
  }

  const log = JSON.parse(readFileSync(logPath, "utf8"));
  if (log.changes.length === 0) {
    console.log("  ℹ No changes needed (values already set)");
  }
}

function testIdempotency() {
  const jsonPath = createTestOnboardingJson();
  const logPath1 = join(testDir, "idempotency-1.json");
  const logPath2 = join(testDir, "idempotency-2.json");

  execSync(`node scripts/seed-from-onboarding.mjs --dry-run --log "${logPath1}" "${jsonPath}"`, {
    cwd: root,
    encoding: "utf8",
  });

  execSync(`node scripts/seed-from-onboarding.mjs --dry-run --log "${logPath2}" "${jsonPath}"`, {
    cwd: root,
    encoding: "utf8",
  });

  const log1 = JSON.parse(readFileSync(logPath1, "utf8"));
  const log2 = JSON.parse(readFileSync(logPath2, "utf8"));

  delete log1.timestamp;
  delete log2.timestamp;

  if (JSON.stringify(log1) !== JSON.stringify(log2)) {
    throw new Error("Multiple runs produced different changes (not idempotent)");
  }
}

function main() {
  console.log("Running seed-from-onboarding.mjs tests...\n");

  setup();
  backupSiteYml();

  const tests = [
    ["Dry run does not modify files", testDryRun],
    ["Validation catches schema errors", testValidationErrors],
    ["HTML input is parsed correctly", testHtmlInput],
    ["Script is idempotent", testIdempotency],
  ];

  let passed = 0;
  let failed = 0;

  for (const [name, fn] of tests) {
    if (runTest(name, fn)) {
      passed++;
    } else {
      failed++;
    }
  }

  restoreSiteYml();
  cleanup();

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Tests: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
