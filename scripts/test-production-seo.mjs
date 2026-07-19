import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SITEMAP_EXCLUSIONS, validateProductionSeo } from "./validate-production-seo.mjs";

const ORIGIN = "https://j-connect-global.com";

function indexedPage(canonical, robots = "index, follow") {
  return `<!doctype html>
<html lang="ja"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SEO fixture</title>
<meta name="description" content="SEO validation fixture">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="SEO fixture">
<meta property="og:description" content="SEO validation fixture">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ORIGIN}/image.webp">
<meta property="og:type" content="website">
<meta property="og:site_name" content="J-Connect Germany">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="SEO fixture">
<meta name="twitter:description" content="SEO validation fixture">
<meta name="twitter:image" content="${ORIGIN}/image.webp">
</head><body><main><h1>SEO fixture</h1></main></body></html>`;
}

async function writePage(siteDir, route, html) {
  const segments = route.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  const file = path.join(siteDir, ...segments, "index.html");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html, "utf8");
}

function sitemap(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(({ loc, lastmod = "" }) => `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>\n`;
}

const job = {
  id: "job-ok",
  job_id: "job-ok",
  detail_url: "/germany/ja/jobs/job-ok/",
  status: "active",
  company_name: "Example GmbH",
  position_title: "Support Engineer",
  description: "A complete public role description.",
  location: "Düsseldorf",
  published_at: "2026-07-01T00:00:00.000Z",
  last_modified_at: "2026-07-15T00:00:00.000Z",
  expires_at: ""
};

const jobUrl = `${ORIGIN}${job.detail_url}`;
const staticUrl = `${ORIGIN}/germany/ja/in-sitemap/`;
const unlistedUrl = `${ORIGIN}/germany/ja/unlisted/`;
const originalExclusions = [...SITEMAP_EXCLUSIONS.entries()];

const siteDir = await mkdtemp(path.join(os.tmpdir(), "jconnect-production-seo-"));
try {
  await writePage(siteDir, "/germany/ja/in-sitemap/", indexedPage(staticUrl));
  await writePage(siteDir, job.detail_url, indexedPage(jobUrl));
  await mkdir(path.join(siteDir, "assets", "data", "jobs"), { recursive: true });
  await writeFile(path.join(siteDir, "assets", "data", "jobs", "jobs.json"), `${JSON.stringify({ count: 1, items: [job] })}\n`, "utf8");
  await writeFile(path.join(siteDir, "sitemap.xml"), sitemap([
    { loc: staticUrl, lastmod: "2026-07-01" },
    { loc: jobUrl, lastmod: "2026-07-15" }
  ]), "utf8");

  let result = await validateProductionSeo({ siteDir });
  assert.deepEqual(result.errors, []);
  assert.equal(result.indexable_ja_pages, 2);
  assert.equal(result.indexable_jobs, 1);

  await writePage(siteDir, "/germany/ja/unlisted/", indexedPage(unlistedUrl));
  result = await validateProductionSeo({ siteDir });
  assert.ok(result.errors.some((error) => error.includes("canonical index, follow JA URL is missing from sitemap.xml") && error.includes(unlistedUrl)));

  SITEMAP_EXCLUSIONS.set(unlistedUrl, "Synthetic fixture for explicit exclusion coverage.");
  result = await validateProductionSeo({ siteDir });
  assert.deepEqual(result.errors, []);
  SITEMAP_EXCLUSIONS.delete(unlistedUrl);

  await writePage(siteDir, "/germany/ja/unlisted/", indexedPage(unlistedUrl, "noindex, follow"));
  result = await validateProductionSeo({ siteDir });
  assert.deepEqual(result.errors, []);

  await writeFile(path.join(siteDir, "sitemap.xml"), sitemap([
    { loc: staticUrl, lastmod: "2026-07-01" },
    { loc: jobUrl, lastmod: "2026-07-14" }
  ]), "utf8");
  result = await validateProductionSeo({ siteDir });
  assert.ok(result.errors.some((error) => error.includes("sitemap lastmod must be 2026-07-15") && error.includes(jobUrl)));
} finally {
  SITEMAP_EXCLUSIONS.clear();
  for (const [canonical, reason] of originalExclusions) SITEMAP_EXCLUSIONS.set(canonical, reason);
  await rm(siteDir, { recursive: true, force: true });
}

console.log("Production SEO validator tests passed.");
