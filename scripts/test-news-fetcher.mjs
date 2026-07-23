import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  NEWS_MINIMUM_ITEMS,
  fetchSourceNews,
  writeJsonAtomic
} from "./fetch-news.mjs";

const source = {
  country: "germany",
  country_ja: "ドイツ",
  city: "nationwide",
  city_ja: "全国",
  category: "life",
  category_ja: "生活",
  importance: "normal",
  importance_ja: "通常",
  source_type: "media",
  source_name: "Deutsche Welle",
  language: "de",
  rss_url: "https://rss.dw.com/xml/rss-de-news"
};

function fixture({
  language = "de",
  count = NEWS_MINIMUM_ITEMS,
  linkScheme = "https",
  hostname = "www.dw.com"
} = {}) {
  const items = Array.from({ length: count }, (_, index) => `
    <item>
      <title><![CDATA[Nachricht ${index + 1}]]></title>
      <link>${linkScheme}://${hostname}/de/nachricht-${index + 1}/a-${index + 1}</link>
      <description><![CDATA[Zusammenfassung ${index + 1}]]></description>
      <pubDate>Thu, 23 Jul 2026 10:00:00 GMT</pubDate>
    </item>`).join("");
  return `<rss><channel><language>${language}</language>${items}</channel></rss>`;
}

function response(xml, { ok = true, status = 200 } = {}) {
  return { ok, status, text: async () => xml };
}

const items = await fetchSourceNews(source, { fetchImpl: async () => response(fixture()) });
assert.equal(items.length, NEWS_MINIMUM_ITEMS);
assert.equal(items.every((item) => item.language === "de"), true);
assert.equal(items.every((item) => item.url.startsWith("https://www.dw.com/de/")), true);

await assert.rejects(
  fetchSourceNews(source, { fetchImpl: async () => response("", { ok: false, status: 503 }) }),
  /HTTP 503/
);
await assert.rejects(
  fetchSourceNews(source, { fetchImpl: async () => response(fixture({ language: "en" })) }),
  /language mismatch/
);
await assert.rejects(
  fetchSourceNews(source, { fetchImpl: async () => response(fixture({ count: NEWS_MINIMUM_ITEMS - 1 })) }),
  /at least 6/
);
await assert.rejects(
  fetchSourceNews(source, { fetchImpl: async () => response(fixture({ linkScheme: "http" })) }),
  /must use HTTPS/
);
await assert.rejects(
  fetchSourceNews(source, { fetchImpl: async () => response(fixture({ hostname: "notdw.com" })) }),
  /must remain on dw\.com/
);
await assert.rejects(
  fetchSourceNews(source, {
    timeoutMs: 5,
    fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    })
  }),
  /timed out/
);

const tempDir = await mkdtemp(path.join(os.tmpdir(), "jconnect-news-"));
try {
  const output = path.join(tempDir, "news.json");
  await writeJsonAtomic(output, items);
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")), items);
  assert.deepEqual((await readdir(tempDir)).sort(), ["news.json"], "Atomic write left a temporary file behind.");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("News fetcher validation passed.");
