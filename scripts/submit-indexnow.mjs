// Notify IndexNow (Bing, Yandex and others) about indexable pages that changed in a deploy.
// Only URLs listed in sitemap.xml are sent, so noindex and generated detail pages never are.
//
// Usage:
//   node scripts/submit-indexnow.mjs --from <sha> --to <sha> [--dry-run]
//   node scripts/submit-indexnow.mjs --all [--dry-run]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SITE_ORIGIN = "https://j-connect-global.com";
export const KEY_FILE = "indexnow-key.txt";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS = 10000;

export function readKey(root = rootDir) {
  const key = readFileSync(path.join(root, KEY_FILE), "utf8").trim();
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error(`${KEY_FILE} does not contain a valid IndexNow key.`);
  return key;
}

export function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((match) => match[1].trim());
}

// germany/ja/living/foo/index.html -> https://j-connect-global.com/germany/ja/living/foo/
export function fileToUrl(file) {
  const normalized = file.replace(/\\/g, "/");
  if (!/^germany\/ja\/(?:.+\/)?index\.html$/.test(normalized)) return null;
  return `${SITE_ORIGIN}/${normalized.replace(/index\.html$/, "")}`;
}

export function changedIndexableUrls(changedFiles, sitemap) {
  const allowed = new Set(sitemap);
  const urls = changedFiles.map(fileToUrl).filter((url) => url && allowed.has(url));
  return [...new Set(urls)];
}

function changedFiles(from, to) {
  for (const sha of [from, to]) {
    if (!/^[0-9a-f]{7,40}$/.test(sha || "")) throw new Error(`Invalid commit SHA: ${sha}`);
  }
  return execFileSync("git", ["diff", "--name-only", from, to], { cwd: rootDir, encoding: "utf8" })
    .split(/\r?\n/).filter(Boolean);
}

async function submit(urls, key) {
  const body = { host: new URL(SITE_ORIGIN).host, key, keyLocation: `${SITE_ORIGIN}/${KEY_FILE}`, urlList: urls };
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  });
  // 200 = accepted, 202 = accepted while the key is being verified.
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow responded ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  return response.status;
}

async function main() {
  const args = process.argv.slice(2);
  const valueOf = (flag) => args[args.indexOf(flag) + 1];
  const dryRun = args.includes("--dry-run");
  const sitemap = sitemapUrls(readFileSync(path.join(rootDir, "sitemap.xml"), "utf8"));
  const urls = args.includes("--all")
    ? sitemap
    : changedIndexableUrls(changedFiles(valueOf("--from"), valueOf("--to")), sitemap);
  if (!urls.length) {
    console.log("IndexNow: no changed indexable pages to submit.");
    return;
  }
  const batch = urls.slice(0, MAX_URLS);
  console.log(`IndexNow: ${batch.length} URL(s)${dryRun ? " (dry run)" : ""}`);
  for (const url of batch) console.log(`  ${url}`);
  if (dryRun) return;
  console.log(`IndexNow: submitted, status ${await submit(batch, readKey())}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
