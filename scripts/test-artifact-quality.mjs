import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateArtifactQuality } from "./validate-artifact-quality.mjs";

const generousLimits = {
  html_bytes: 100000,
  css_bytes: 100000,
  js_bytes: 100000,
  shell_bytes: 300000
};

function budgetWith(limits = generousLimits) {
  return {
    maximum_crawl_depth: 4,
    templates: Object.fromEntries(
      ["redirect", "portal", "hub", "article", "directory", "detail", "utility"]
        .map((name) => [name, { ...limits }])
    )
  };
}

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function page({ title, body, links = "" }) {
  return `<!doctype html>
<html lang="ja"><head><meta name="robots" content="index, follow"><title>${title}</title></head>
<body><a href="#main-content">本文へ移動</a><main id="main-content" tabindex="-1"><h1>${title}</h1>${links}${body || ""}</main></body></html>`;
}

function redirectPage() {
  return `<!doctype html>
<html lang="ja"><head><meta name="robots" content="index, follow"><title>Redirect</title></head>
<body><a href="#main-content">本文へ移動</a><main id="main-content" tabindex="-1">
<h1>Germanyへ移動します</h1><a href="/germany/ja/">Germany</a>
</main></body></html>`;
}

function sitemap(routes) {
  return `<?xml version="1.0"?><urlset>${routes.map((route) => `<url><loc>https://j-connect-global.com${route}</loc></url>`).join("")}</urlset>`;
}

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "jconnect-artifact-quality-"));
try {
  const validRoot = path.join(fixtureRoot, "valid");
  write(validRoot, "index.html", redirectPage());
  write(validRoot, "germany/ja/index.html", page({ title: "Germany", links: '<a href="/germany/ja/">Germany home</a>' }));
  write(validRoot, "sitemap.xml", sitemap(["/germany/ja/"]));
  const valid = validateArtifactQuality({ siteDir: validRoot, budget: budgetWith() });
  assert.deepEqual(valid.errors, [], `clean fixture should pass:\n${valid.errors.join("\n")}`);

  const brokenRoot = path.join(fixtureRoot, "broken");
  write(brokenRoot, "index.html", page({ title: "Global", links: '<a href="/germany/ja/">Germany</a>' }));
  write(
    brokenRoot,
    "germany/ja/index.html",
    page({
      title: "Germany",
      links: '<a href="/missing/">Missing</a><a href="#absent">Fragment</a>',
      body: '<div id="duplicate"></div><span id="duplicate"></span><button aria-controls="missing-control">Open</button><img src="/pixel.svg" alt="">'
    })
  );
  write(brokenRoot, "orphan/index.html", page({ title: "Orphan" }));
  write(brokenRoot, "pixel.svg", '<svg width="1" height="1" viewBox="0 0 1 1"></svg>');
  write(brokenRoot, "sitemap.xml", sitemap(["/", "/germany/ja/"]));
  const tiny = { html_bytes: 1, css_bytes: 100000, js_bytes: 100000, shell_bytes: 300000 };
  const broken = validateArtifactQuality({ siteDir: brokenRoot, budget: budgetWith(tiny) });
  const messages = broken.errors.join("\n");
  for (const expected of [
    /broken internal target/,
    /broken fragment/,
    /duplicate id values/,
    /aria-controls references missing id/,
    /image lacks intrinsic dimensions/,
    /indexable route is unreachable/,
    /HTML budget exceeded/
  ]) {
    assert.match(messages, expected);
  }
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log("Artifact quality validator unit tests passed.");
