import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const steps = [
  ["Synchronize front matter", "scripts/sync-content-frontmatter.mjs", "--write"],
  ["Generate tourism route overviews", "scripts/generate-tourism-route-overviews.mjs"],
  ["Build content", "scripts/build-content.mjs"],
  ["Apply canonical layout", "scripts/apply-layout.mjs"]
];

for (const [label, script, ...args] of steps) {
  console.log(`\n[build] ${label}`);
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("\nSite build completed.");
