import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { changedIndexableUrls, fileToUrl, readKey, sitemapUrls, SITE_ORIGIN } from "./submit-indexnow.mjs";

assert.equal(fileToUrl("germany/ja/living/anmeldung-guide/index.html"), `${SITE_ORIGIN}/germany/ja/living/anmeldung-guide/`);
assert.equal(fileToUrl("germany/ja/index.html"), `${SITE_ORIGIN}/germany/ja/`);
assert.equal(fileToUrl("content/living/anmeldung-guide.md"), null);
assert.equal(fileToUrl("assets/js/search-index.js"), null);

const sitemap = sitemapUrls(readFileSync("sitemap.xml", "utf8"));
assert.ok(sitemap.includes(`${SITE_ORIGIN}/germany/ja/`), "sitemap must list the Germany home");
const urls = changedIndexableUrls([
  "germany/ja/index.html",
  "germany/ja/index.html",
  "germany/ja/living/paris-weekend-trip/index.html",
  "germany/ja/community/post/index.html",
  "content/registry/living.json"
], sitemap);
assert.deepEqual(urls, [`${SITE_ORIGIN}/germany/ja/`], "only sitemap-listed pages are submitted, once each");
assert.match(readKey(), /^[a-f0-9]{32}$/);
console.log("IndexNow submission tests passed.");
