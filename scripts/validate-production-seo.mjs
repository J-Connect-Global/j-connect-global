import { appendFile, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isIndexableJob, jobSitemapLastmod } from "./generate-public-details.mjs";
import { assertPublicDetailUrl } from "./public-detail-routes.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_ORIGIN = "https://j-connect-global.com";
const requiredOg = ["og:title", "og:description", "og:url", "og:image", "og:type", "og:site_name", "og:locale"];
const requiredTwitter = ["twitter:card", "twitter:title", "twitter:description", "twitter:image"];

// Add an entry only for an intentional, indexable JA canonical URL that must
// stay out of the sitemap. The value is the reviewable reason; stale or broad
// exclusions fail validation below. There are no such exceptions today.
export const SITEMAP_EXCLUSIONS = new Map();

async function walkHtml(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkHtml(fullPath, files);
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(fullPath);
  }
  return files;
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2] ?? null;
}

function metaValue(html, attributeName, expectedValue) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (attribute(tag, attributeName)?.toLowerCase() === expectedValue.toLowerCase()) return attribute(tag, "content") || "";
  }
  return "";
}

function canonicalValue(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if ((attribute(tag, "rel") || "").toLowerCase().split(/\s+/).includes("canonical")) return attribute(tag, "href") || "";
  }
  return "";
}

function urlForFile(siteDir, file) {
  const relative = path.relative(siteDir, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  return `/${relative.replace(/\/index\.html$/, "/")}`;
}

function localFileForUrl(siteDir, url) {
  const pathname = new URL(url).pathname;
  return path.join(siteDir, pathname.replace(/^\/+/, ""), "index.html");
}

function parseSitemapEntries(xml) {
  return [...xml.matchAll(/<url>\s*([\s\S]*?)<\/url>/g)].map((match) => {
    const block = match[1];
    return {
      loc: block.match(/<loc>([\s\S]*?)<\/loc>/)?.[1]?.trim() || "",
      lastmod: block.match(/<lastmod>([\s\S]*?)<\/lastmod>/)?.[1]?.trim() || ""
    };
  });
}

function parseProductionSitemapUrl(value) {
  try {
    const url = new URL(value);
    if (url.origin !== SITE_ORIGIN || url.search || url.hash || !url.pathname.startsWith("/germany/ja/")) return null;
    return url;
  } catch {
    return null;
  }
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isIndexFollow(robots) {
  const directives = String(robots || "").toLowerCase().split(/[\s,]+/).filter(Boolean);
  return directives.includes("index") && directives.includes("follow") && !directives.includes("noindex") && !directives.includes("nofollow");
}

function indexablePageProblems({ html, file, expectedUrl, siteDir }) {
  const errors = [];
  const label = path.relative(siteDir, file).split(path.sep).join("/");
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  if (!title) errors.push(`${label}: missing title.`);
  if (!metaValue(html, "name", "description").trim()) errors.push(`${label}: missing meta description.`);
  if (canonicalValue(html) !== expectedUrl) errors.push(`${label}: canonical does not match sitemap URL ${expectedUrl}.`);
  if (!isIndexFollow(metaValue(html, "name", "robots"))) errors.push(`${label}: sitemap URL is not index, follow.`);
  if (!/<html\b[^>]*\blang\s*=\s*["'][^"']+["']/i.test(html)) errors.push(`${label}: missing html lang.`);
  if (!metaValue(html, "name", "viewport").trim()) errors.push(`${label}: missing viewport meta.`);
  if ((html.match(/<h1\b[^>]*>/gi) || []).length !== 1) errors.push(`${label}: must contain exactly one H1.`);
  for (const property of requiredOg) if (!metaValue(html, "property", property).trim()) errors.push(`${label}: missing ${property}.`);
  for (const name of requiredTwitter) if (!metaValue(html, "name", name).trim()) errors.push(`${label}: missing ${name}.`);
  return errors;
}

function artifactProblems({ html, file, siteDir, sitemapUrls }) {
  const errors = [];
  const relative = path.relative(siteDir, file).split(path.sep).join("/");
  const robots = metaValue(html, "name", "robots").toLowerCase();
  const ownUrl = `${SITE_ORIGIN}${urlForFile(siteDir, file)}`;
  if (robots.includes("noindex") && sitemapUrls.has(ownUrl)) {
    errors.push(`${relative}: noindex page itself is present in sitemap.`);
  }
  for (const script of html.match(/<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>[\s\S]*?<\/script>/gi) || []) {
    const json = script.replace(/^.*?>/s, "").replace(/<\/script>$/i, "").trim();
    try {
      JSON.parse(json);
    } catch (error) {
      errors.push(`${relative}: invalid JSON-LD (${error.message}).`);
    }
  }
  for (const img of html.match(/<img\b[^>]*>/gi) || []) {
    const src = attribute(img, "src") || "";
    if (attribute(img, "alt") === null) errors.push(`${relative}: image ${src || "(missing src)"} has no alt attribute.`);
    const classes = attribute(img, "class") || "";
    if (/article-hero-image|article-card-image|home-card-image/.test(classes) && src.startsWith("/assets/img/")) {
      if (!attribute(img, "width") || !attribute(img, "height")) errors.push(`${relative}: content image ${src} has no intrinsic width/height.`);
    }
    if (/\bbrand-logo\b|\bfooter-logo\b/.test(classes) && (!attribute(img, "width") || !attribute(img, "height"))) {
      errors.push(`${relative}: brand image ${src || "(missing src)"} has no intrinsic width/height.`);
    }
  }
  return errors;
}

function sitemapCompletenessProblems(byUrl, sitemapUrls, siteDir) {
  const errors = [];
  const indexableCanonicalUrls = new Set();
  for (const { file, html } of byUrl.values()) {
    const route = urlForFile(siteDir, file);
    if (!route.startsWith("/germany/ja/") || !isIndexFollow(metaValue(html, "name", "robots"))) continue;
    const canonical = canonicalValue(html);
    if (!parseProductionSitemapUrl(canonical)) {
      errors.push(`${path.relative(siteDir, file).split(path.sep).join("/")}: index, follow JA page needs a production JA canonical URL.`);
      continue;
    }
    indexableCanonicalUrls.add(canonical);
    if (!sitemapUrls.has(canonical) && !SITEMAP_EXCLUSIONS.has(canonical)) {
      errors.push(`${path.relative(siteDir, file).split(path.sep).join("/")}: canonical index, follow JA URL is missing from sitemap.xml: ${canonical}`);
    }
  }
  for (const [canonical, reason] of SITEMAP_EXCLUSIONS) {
    if (!parseProductionSitemapUrl(canonical)) errors.push(`Sitemap exclusion has an invalid canonical JA URL: ${canonical}`);
    if (!String(reason || "").trim()) errors.push(`Sitemap exclusion is missing a documented reason: ${canonical}`);
    if (sitemapUrls.has(canonical)) errors.push(`Sitemap exclusion is redundant because the URL is present in sitemap.xml: ${canonical}`);
    if (!indexableCanonicalUrls.has(canonical)) errors.push(`Sitemap exclusion is stale because no indexable canonical JA page uses it: ${canonical}`);
  }
  return { errors, indexableCanonicalUrls };
}

async function generatedJobSitemapProblems({ siteDir, sitemapEntries, byUrl }) {
  const errors = [];
  let payload;
  try {
    payload = JSON.parse(await readFile(path.join(siteDir, "assets", "data", "jobs", "jobs.json"), "utf8"));
  } catch (error) {
    return { errors: [`assets/data/jobs/jobs.json: missing or invalid in the production artifact (${error.message}).`], indexableJobs: 0 };
  }
  if (!payload || !Array.isArray(payload.items)) {
    return { errors: ["assets/data/jobs/jobs.json: items must be an array in the production artifact."], indexableJobs: 0 };
  }
  const entriesByUrl = new Map();
  for (const entry of sitemapEntries) {
    if (!entriesByUrl.has(entry.loc)) entriesByUrl.set(entry.loc, []);
    entriesByUrl.get(entry.loc).push(entry);
  }
  let indexableJobs = 0;
  for (const [index, job] of payload.items.entries()) {
    const label = `assets/data/jobs/jobs.json item ${index + 1}`;
    let route;
    try {
      route = assertPublicDetailUrl("jobs", job.detail_url, job.id || job.job_id);
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
      continue;
    }
    const canonical = `${SITE_ORIGIN}${route}`;
    const entries = entriesByUrl.get(canonical) || [];
    if (!isIndexableJob(job)) {
      if (entries.length) errors.push(`${label}: non-indexable Jobs detail is present in sitemap.xml: ${canonical}`);
      continue;
    }
    indexableJobs += 1;
    const expectedLastmod = jobSitemapLastmod(job);
    if (!expectedLastmod) errors.push(`${label}: indexable Jobs detail has no valid sitemap lastmod source.`);
    if (entries.length !== 1) {
      errors.push(`${label}: indexable Jobs detail must appear exactly once in sitemap.xml: ${canonical}`);
      continue;
    }
    if (entries[0].lastmod !== expectedLastmod) {
      errors.push(`${label}: sitemap lastmod must be ${expectedLastmod || "a valid date"} for ${canonical}.`);
    }
    const generated = byUrl.get(route);
    if (!generated) {
      errors.push(`${label}: generated Jobs detail file is missing for ${canonical}.`);
      continue;
    }
    if (canonicalValue(generated.html) !== canonical || !isIndexFollow(metaValue(generated.html, "name", "robots"))) {
      errors.push(`${label}: generated Jobs detail is not canonical index, follow: ${canonical}.`);
    }
  }
  return { errors, indexableJobs };
}

async function responsiveImageProblems(html, file, siteDir) {
  const errors = [];
  const relative = path.relative(siteDir, file).split(path.sep).join("/");
  for (const img of html.match(/<img\b[^>]*>/gi) || []) {
    const src = attribute(img, "src") || "";
    const classes = attribute(img, "class") || "";
    if (!/article-hero-image|article-card-image|home-card-image/.test(classes) || !src.startsWith("/assets/img/") || !src.endsWith(".webp")) continue;
    const widths = /\bhome-card-image\b/.test(classes) ? [480, 768] : [768];
    const variants = widths.map((width) => ({
      width,
      path: path.join(siteDir, src.replace(/^\/+/, "").replace(/\.webp$/i, `-${width}w.webp`))
    }));
    const existing = [];
    for (const variant of variants) {
      try {
        await stat(variant.path);
        existing.push(variant);
      } catch {
        if (/\bhome-card-image\b/.test(classes)) errors.push(`${relative}: Home image ${src} is missing its ${variant.width}w responsive asset.`);
      }
    }
    if (existing.length && (!attribute(img, "srcset") || !attribute(img, "sizes"))) {
      errors.push(`${relative}: responsive image ${src} has stored variants but no srcset/sizes.`);
    }
    for (const variant of existing) {
      if (!String(attribute(img, "srcset") || "").includes(`-${variant.width}w.webp ${variant.width}w`)) {
        errors.push(`${relative}: responsive image ${src} does not advertise its ${variant.width}w variant.`);
      }
    }
  }
  return errors;
}

export async function validateProductionSeo({ siteDir = path.join(rootDir, "_site") } = {}) {
  const sitemap = await readFile(path.join(siteDir, "sitemap.xml"), "utf8");
  const sitemapEntries = parseSitemapEntries(sitemap);
  const sitemapUrls = sitemapEntries.map((entry) => entry.loc);
  const uniqueSitemapUrls = new Set(sitemapUrls);
  const errors = [];
  if (sitemapUrls.length !== uniqueSitemapUrls.size) errors.push("sitemap.xml contains duplicate loc values.");
  for (const [index, entry] of sitemapEntries.entries()) {
    if (!entry.loc) errors.push(`sitemap.xml entry ${index + 1} is missing loc.`);
    if (entry.lastmod && !isIsoDate(entry.lastmod)) errors.push(`sitemap.xml lastmod is invalid for ${entry.loc || `entry ${index + 1}`}: ${entry.lastmod}.`);
  }
  const files = await walkHtml(siteDir);
  const byUrl = new Map(await Promise.all(files.map(async (file) => [urlForFile(siteDir, file), { file, html: await readFile(file, "utf8") }])));

  for (const url of sitemapUrls) {
    const parsed = parseProductionSitemapUrl(url);
    if (!parsed) {
      errors.push(`sitemap.xml contains an invalid production JA URL: ${url}.`);
      continue;
    }
    const file = localFileForUrl(siteDir, url);
    const entry = byUrl.get(parsed.pathname);
    if (!entry) {
      errors.push(`sitemap URL has no generated file: ${url} (${path.relative(siteDir, file)}).`);
      continue;
    }
    errors.push(...indexablePageProblems({ html: entry.html, file: entry.file, expectedUrl: url, siteDir }));
  }

  for (const { file, html } of byUrl.values()) {
    errors.push(...artifactProblems({ html, file, siteDir, sitemapUrls: uniqueSitemapUrls }));
    errors.push(...await responsiveImageProblems(html, file, siteDir));
  }
  const completeness = sitemapCompletenessProblems(byUrl, uniqueSitemapUrls, siteDir);
  errors.push(...completeness.errors);
  const jobs = await generatedJobSitemapProblems({ siteDir, sitemapEntries, byUrl });
  errors.push(...jobs.errors);
  return {
    html_files: files.length,
    sitemap_urls: sitemapUrls.length,
    indexable_ja_pages: completeness.indexableCanonicalUrls.size,
    sitemap_exclusions: SITEMAP_EXCLUSIONS.size,
    indexable_jobs: jobs.indexableJobs,
    errors
  };
}

export function seoMarkdown(result) {
  const lines = [
    "## Production SEO and accessibility regression",
    "",
    `- ${result.html_files} generated HTML files checked; ${result.sitemap_urls} sitemap URLs checked.`,
    `- ${result.indexable_ja_pages} canonical indexable JA pages accounted for; ${result.sitemap_exclusions} explicit sitemap exclusions; ${result.indexable_jobs} generated indexable Jobs checked.`,
    `- ${result.errors.length ? "[FAIL]" : "[PASS]"} canonical, robots, metadata, H1, JSON-LD, image alt, and responsive-image checks.`
  ];
  if (result.errors.length) lines.push("", ...result.errors.map((error) => `- [FAIL] ${error}`));
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const siteIndex = args.indexOf("--site-dir");
  const siteDir = siteIndex >= 0 ? path.resolve(args[siteIndex + 1]) : path.join(rootDir, "_site");
  const result = await validateProductionSeo({ siteDir });
  const markdown = seoMarkdown(result);
  if (args.includes("--github-summary") && process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
  process.stdout.write(markdown);
  if (result.errors.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
