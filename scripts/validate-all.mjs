import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const withBuild = process.argv.includes("--build");
const withBrowser = process.argv.includes("--with-browser");
const summaryArgs = process.env.GITHUB_STEP_SUMMARY ? ["--github-summary"] : [];

const steps = [
  ["Front-matter synchronization", "scripts/sync-content-frontmatter.mjs"],
  ["Content metadata policy", "scripts/test-content-metadata.mjs"],
  ["News fetcher contract", "scripts/test-news-fetcher.mjs"],
  ["Deployment manifest contract", "scripts/test-deployment-manifest.mjs"],
  ["Accessibility behavior contracts", "scripts/test-accessibility-contracts.mjs"],
  ["Tourism usability", "scripts/test-tourism-usability.mjs"],
  ["Community data", "scripts/validate-community.mjs"],
  ["Jobs data", "scripts/validate-jobs.mjs"],
  ["Submission moderation", "scripts/validate-submission-moderation.mjs"],
  ["Public data pipeline", "scripts/test-public-data-pipeline.mjs"],
  ["Public data quality unit tests", "scripts/test-public-data-quality.mjs"],
  ["Directory capabilities", "scripts/test-directory-capabilities.mjs"],
  ["Public data quality baseline", "scripts/report-public-data-quality.mjs", "--check-baseline", ...summaryArgs],
  ["Image asset budget", "scripts/image-asset-budget.mjs", "--check", ...summaryArgs],
  ["GAS submissions", "scripts/test-gas-submissions.mjs"],
  ["Content registry and output", "scripts/validate-content.mjs"],
  ["Editorial freshness", "scripts/report-content-freshness.mjs", ...summaryArgs],
  ["Travel guide duplication", "scripts/check-travel-guide-duplication.mjs"],
  ["JA layout governance", "scripts/validate-layout.mjs"],
  ["Static site", "scripts/validate-static-site.mjs"],
  ["Site identity", "scripts/validate-site-identity.mjs"],
  ["Production parity markers", "scripts/validate-production-parity.mjs"],
  ["Build Pages artifact", "scripts/build-pages-artifact.mjs", "--site-dir", "_site"],
  ["Public detail generation", "scripts/test-public-detail-generation.mjs", "--site-dir", "_site"],
  ["Production SEO unit tests", "scripts/test-production-seo.mjs"],
  ["Production SEO artifact", "scripts/validate-production-seo.mjs", "--site-dir", "_site", ...summaryArgs]
];

function run(command, args, label) {
  console.log(`\n[validate] ${label}`);
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (withBuild) run(process.execPath, ["scripts/build-site.mjs"], "Build generated site files");
for (const [label, script, ...args] of steps) run(process.execPath, [script, ...args], label);
if (withBrowser) {
  run(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.config.mjs"],
    "Browser runtime smoke tests"
  );
}

console.log("\nAll requested validation checks passed.");
