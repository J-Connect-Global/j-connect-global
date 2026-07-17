import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_IDENTITY, SERVICE_NAME, PARENT_BRAND_NAME } from "./site-identity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDirIndex = process.argv.indexOf("--site-dir");
const siteRoot = siteDirIndex >= 0 && process.argv[siteDirIndex + 1]
  ? path.resolve(root, process.argv[siteDirIndex + 1])
  : root;
const problems = [];

function walk(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file, output);
    else if (entry.isFile() && entry.name.endsWith(".html")) output.push(file);
  }
  return output;
}

function value(html, pattern) {
  return html.match(pattern)?.[1]?.trim() || "";
}

const identityScript = fs.readFileSync(path.join(siteRoot, "assets/js/site-identity.js"), "utf8");
for (const expected of [SITE_IDENTITY.serviceName, SITE_IDENTITY.parentBrandName, SITE_IDENTITY.relationship]) {
  if (!identityScript.includes(expected)) problems.push(`assets/js/site-identity.js is missing ${expected}.`);
}

const jaFiles = walk(path.join(siteRoot, "germany", "ja"));
for (const file of jaFiles) {
  const relative = path.relative(siteRoot, file).replaceAll(path.sep, "/");
  const html = fs.readFileSync(file, "utf8");
  const title = value(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const siteName = value(html, /<meta\b(?=[^>]*property=["']og:site_name["'])(?=[^>]*content=["']([^"']+)["'])[^>]*>/i);
  if (!html.includes('/assets/js/site-identity.js')) problems.push(`${relative} does not load the shared site identity.`);
  if (title.includes(PARENT_BRAND_NAME)) problems.push(`${relative} uses the parent brand as the page-title site name.`);
  if (siteName && siteName !== SERVICE_NAME) problems.push(`${relative} has og:site_name=${siteName}.`);
  if (/class=["']brand-title["'][^>]*>\s*J-CONNECT GLOBAL/i.test(html)) problems.push(`${relative} has the old header brand title.`);
  if (/class=["']footer-title["'][^>]*>\s*J-CONNECT GLOBAL/i.test(html)) problems.push(`${relative} has the old footer service title.`);
  if (/alt=["']J-Connect Global["']/i.test(html)) problems.push(`${relative} has a parent-brand-only image alt.`);
  if (/\{\{(?:service_name|service_name_upper|service_logo_alt|tagline|relationship|copyright_holder)\}\}/.test(html)) {
    problems.push(`${relative} contains an unresolved identity template token.`);
  }
}

const home = fs.readFileSync(path.join(siteRoot, "germany/ja/index.html"), "utf8");
if (!home.includes(`"@type": "WebSite"`) || !home.includes(`"name": "${SERVICE_NAME}"`)) {
  problems.push("Home WebSite structured data does not use the Germany service name.");
}
if (!home.includes(`"name": "${PARENT_BRAND_NAME}"`)) {
  problems.push("Home structured data does not identify the parent brand.");
}

if (problems.length) {
  console.error("Site identity validation failed:");
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exitCode = 1;
} else {
  console.log(`Site identity validation passed: ${jaFiles.length} JA pages use ${SERVICE_NAME} with ${PARENT_BRAND_NAME} identified as parent brand.`);
}
