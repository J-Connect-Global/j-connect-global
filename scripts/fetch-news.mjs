import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const NEWS_OUTPUT_PATH = path.join(rootDir, "assets", "data", "news.json");
export const NEWS_FETCH_TIMEOUT_MS = 15_000;
export const NEWS_MINIMUM_ITEMS = 6;
export const NEWS_MAXIMUM_ITEMS = 10;

export const sources = [
  {
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
  }
];

function validatedHttpsUrl(value, label) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw new Error(`${label} is not a valid URL.`);
  }
  if (url.protocol !== "https:") throw new Error(`${label} must use HTTPS.`);
  return url;
}

function isDwHostname(hostname) {
  const normalized = String(hostname || "").toLowerCase();
  return normalized === "dw.com" || normalized.endsWith(".dw.com");
}

function feedLanguage(xml) {
  return cleanXml(getTag(xml, "language")).toLowerCase().split(/[-_]/)[0];
}

export async function fetchSourceNews(source, {
  fetchImpl = fetch,
  timeoutMs = NEWS_FETCH_TIMEOUT_MS,
  minimumItems = NEWS_MINIMUM_ITEMS,
  maximumItems = NEWS_MAXIMUM_ITEMS
} = {}) {
  const feedUrl = validatedHttpsUrl(source.rss_url, `${source.source_name} RSS URL`);
  if (!isDwHostname(feedUrl.hostname)) throw new Error(`${source.source_name} RSS URL must remain on dw.com.`);
  const expectedLanguage = String(source.language || "").toLowerCase();
  if (!expectedLanguage) throw new Error(`${source.source_name} is missing an expected language.`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(feedUrl, {
      signal: controller.signal,
      headers: { "user-agent": "J-Connect news fetcher" }
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`${source.source_name} RSS request timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response?.ok) {
    throw new Error(`${source.source_name} RSS request failed with HTTP ${response?.status ?? "unknown"}.`);
  }

  const xml = await response.text();
  const actualLanguage = feedLanguage(xml);
  if (actualLanguage !== expectedLanguage) {
    throw new Error(`${source.source_name} RSS language mismatch: expected ${expectedLanguage}, received ${actualLanguage || "missing"}.`);
  }

  const parsedItems = parseRssItems(xml).slice(0, maximumItems);
  if (parsedItems.length < minimumItems) {
    throw new Error(`${source.source_name} RSS returned ${parsedItems.length} items; at least ${minimumItems} are required.`);
  }

  return parsedItems.map((item, index) => {
    if (!item.title) throw new Error(`${source.source_name} RSS item ${index + 1} is missing a title.`);
    const articleUrl = validatedHttpsUrl(item.link, `${source.source_name} RSS item ${index + 1} URL`);
    if (!isDwHostname(articleUrl.hostname)) {
      throw new Error(`${source.source_name} RSS item ${index + 1} URL must remain on dw.com.`);
    }
    return {
      id: createId(source.source_name, articleUrl.href),
      country: source.country,
      country_ja: source.country_ja,
      city: source.city,
      city_ja: source.city_ja,
      category: source.category,
      category_ja: source.category_ja,
      topic: "general",
      topic_ja: "一般",
      importance: source.importance,
      importance_ja: source.importance_ja,
      source_type: source.source_type,
      source_name: source.source_name,
      language: expectedLanguage,
      title: item.title,
      summary: item.description,
      published_at: item.pubDate,
      url: articleUrl.href
    };
  });
}

export async function fetchNews(options = {}) {
  const sourceList = options.sourceList || sources;
  const groups = [];
  for (const source of sourceList) groups.push(await fetchSourceNews(source, options));
  return groups.flat();
}

export async function writeJsonAtomic(file, value) {
  const directory = path.dirname(file);
  await mkdir(directory, { recursive: true });
  const tempFile = path.join(directory, `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(tempFile, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(tempFile, file);
  } finally {
    await rm(tempFile, { force: true });
  }
}

export function parseRssItems(xml) {
  const itemBlocks = [...String(xml || "").matchAll(/<item>([\s\S]*?)<\/item>/g)];
  return itemBlocks.map((match) => {
    const block = match[1];
    return {
      title: cleanXml(getTag(block, "title")),
      link: cleanXml(getTag(block, "link")),
      description: cleanXml(getTag(block, "description")),
      pubDate: cleanXml(getTag(block, "pubDate")).slice(0, 16)
    };
  });
}

function getTag(block, tagName) {
  const match = String(block || "").match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? match[1] : "";
}

function cleanXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function createId(sourceName, link) {
  return `${sourceName}-${link}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);
}

export async function main() {
  const items = await fetchNews();
  await writeJsonAtomic(NEWS_OUTPUT_PATH, items);
  console.log(`Wrote ${items.length} verified German news items to ${path.relative(rootDir, NEWS_OUTPUT_PATH)}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
