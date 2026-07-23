import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  frontMatterComparableFields,
  frontMatterRequiredFields,
  parseFrontMatter
} from './sync-content-frontmatter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ORIGIN = 'https://j-connect-global.com';
const problems = [];

const contentTypes = {
  living: {
    registryPath: 'content/registry/living.json',
    hubPath: 'germany/ja/living/index.html',
    hubUrl: '/germany/ja/living/',
    gridMarker: 'living-grid',
    homeMarker: 'home-living',
    homeLimit: 3
  },
  events: {
    registryPath: 'content/registry/events.json',
    hubPath: 'germany/ja/events/index.html',
    hubUrl: '/germany/ja/events/',
    gridMarker: 'events-grid',
    homeMarker: 'home-events',
    homeLimit: 3,
    eventFields: ['city', 'location', 'event_date', 'official_url']
  },
  'learn-german': {
    registryPath: 'content/registry/learn-german.json',
    hubPath: 'germany/ja/learn-german/index.html',
    hubUrl: '/germany/ja/learn-german/',
    gridMarker: 'learn-german-grid',
    homeMarker: 'home-learn-german',
    homeLimit: 5,
    learnFields: ['level', 'situation', 'goal', 'skill', 'duration']
  }
};

const requiredFields = [
  'id',
  'title',
  'slug',
  'category',
  'summary',
  'url',
  'markdown_path',
  'published',
  'status',
  'published_at',
  'updated_at',
  'last_verified',
  'tags',
  'home_visible',
  'home_order',
  'hub_visible',
  'search_visible',
  'sitemap_visible',
  'canonical_url',
  'official_sources',
  'disclaimer_type',
  'related_articles',
  'review'
];
const learnGermanContentTypes = new Set(['phrase', 'route', 'resource']);
const learnGermanResourceFields = ['resource_skills', 'resource_format', 'resource_level', 'resource_price_type'];
const livingOfficialSourceTargets = new Set([
  'anmeldung-guide',
  'health-insurance-guide',
  'tax-id-steuernummer-steuerklasse',
  'pregnancy-birth-germany',
  'kita-u3-tagesmutter-guide',
  'schufa-guide',
  'bank-account-germany',
  'rent-apartment-germany'
]);

function main() {
  const datasets = {};
  const allItems = [];
  const ids = new Set();
  const urls = new Set();

  for (const type of Object.keys(contentTypes)) {
    const registry = readRegistry(type);
    datasets[type] = registry;
    const slugs = new Set();

    for (const [index, item] of registry.entries()) {
      const label = `${type}.json[${index}]`;
      validateRegistryItem(type, item, label);

      checkUnique(ids, item.id, `Duplicate content ID: ${item.id}`);
      checkUnique(slugs, item.slug, `Duplicate ${type} slug: ${item.slug}`);
      checkUnique(urls, item.url, `Duplicate content URL: ${item.url}`);

      if (!isValidGeneratedArticleUrl(type, item)) {
        problems.push(`${label} URL must match generated page path: ${item.url}`);
      }

      if (item.published === true) {
        validatePublishedFiles(type, item, label);
        validateFrontMatterConsistency(item, label);
      }

      allItems.push(item);
    }
  }

  validateHubs(datasets);
  validateHome(datasets);
  validateSearchIndex(allItems);
  validateSitemap(allItems);
  validateRelatedArticles(allItems);
  validateWildBirdCards();

  if (problems.length) {
    console.error(`Content validation failed with ${problems.length} issue(s):`);
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }

  const publishedCount = allItems.filter((item) => item.published === true).length;
  console.log(`Content validation passed: ${publishedCount} published Living/Events/Learn German articles checked.`);
}

function readRegistry(type) {
  const config = contentTypes[type];
  try {
    const parsed = JSON.parse(readText(config.registryPath));
    if (!Array.isArray(parsed)) {
      problems.push(`${config.registryPath} must contain a JSON array.`);
      return [];
    }
    return parsed;
  } catch (error) {
    problems.push(`${config.registryPath} is not valid JSON: ${error.message}`);
    return [];
  }
}

function validateRegistryItem(type, item, label) {
  for (const field of requiredFields) {
    if (!Object.prototype.hasOwnProperty.call(item, field)) {
      problems.push(`${label} missing required field: ${field}`);
    }
  }

  if (!Array.isArray(item.tags) || item.tags.length === 0) {
    problems.push(`${label} tags must be a non-empty array.`);
  }

  if (item.published === true) {
    for (const field of ['markdown_path', 'canonical_url', 'published_at', 'last_verified', 'summary', 'title']) {
      if (!String(item[field] ?? '').trim()) {
        problems.push(`${label} published item missing ${field}.`);
      }
    }
  }

  for (const field of contentTypes[type].eventFields || []) {
    if (!Object.prototype.hasOwnProperty.call(item, field)) {
      problems.push(`${label} missing event field: ${field}`);
    }
  }

  for (const field of contentTypes[type].learnFields || []) {
    if (!toArray(item[field]).length) {
      problems.push(`${label} missing Learn German field: ${field}`);
    }
  }

  if (type === 'learn-german' && Object.prototype.hasOwnProperty.call(item, 'related_living_guides') && !Array.isArray(item.related_living_guides)) {
    problems.push(`${label} related_living_guides must be an array when present.`);
  }

  if (type === 'learn-german') {
    if (!learnGermanContentTypes.has(item.content_type)) {
      problems.push(`${label} content_type must be one of: ${[...learnGermanContentTypes].join(', ')}.`);
    }

    if (item.content_type === 'resource') {
      for (const field of learnGermanResourceFields) {
        if (!toArray(item[field]).length) {
          problems.push(`${label} missing resource metadata field: ${field}`);
        }
      }
    }
  }

  if (!Array.isArray(item.official_sources)) {
    problems.push(`${label} official_sources must be an array.`);
  } else {
    for (const [sourceIndex, source] of item.official_sources.entries()) {
      const sourceLabel = `${label} official_sources[${sourceIndex}]`;
      if (!source || typeof source !== 'object' || Array.isArray(source)) {
        problems.push(`${sourceLabel} must be an object.`);
        continue;
      }
      if (!String(source.title || '').trim()) problems.push(`${sourceLabel} missing title.`);
      if (!/^https:\/\/[^ "]+$/i.test(String(source.url || ''))) {
        problems.push(`${sourceLabel} must use a real https URL.`);
      }
      if (/todo|placeholder|example\.com/i.test(`${source.title || ''} ${source.url || ''}`)) {
        problems.push(`${sourceLabel} must not contain placeholder source data.`);
      }
    }
  }

  if (type === 'living' && livingOfficialSourceTargets.has(item.slug) && (!Array.isArray(item.official_sources) || item.official_sources.length === 0)) {
    problems.push(`${label} should include official_sources for production trust metadata.`);
  }

  if (!Array.isArray(item.related_articles)) {
    problems.push(`${label} related_articles must be an array.`);
  }

  if (!item.disclaimer_type || typeof item.disclaimer_type !== 'string') {
    problems.push(`${label} disclaimer_type must be a non-empty string.`);
  }

  validateReview(item.review, label);
}

function validateReview(review, label) {
  if (!review || typeof review !== 'object' || Array.isArray(review)) {
    problems.push(`${label} review must be an object.`);
    return;
  }

  for (const field of ['status', 'reviewed_by', 'last_reviewed_at', 'next_review_due']) {
    if (!String(review[field] ?? '').trim()) {
      problems.push(`${label} review missing ${field}.`);
    }
  }
}

function validatePublishedFiles(type, item, label) {
  const markdownRel = trimLeadingSlash(item.markdown_path);
  const htmlRel = outputPathFromUrl(item.url);

  if (!exists(markdownRel)) {
    problems.push(`${label} markdown_path does not exist: ${item.markdown_path}`);
  }

  if (!exists(htmlRel)) {
    problems.push(`${label} generated HTML page does not exist: ${htmlRel}`);
    return;
  }

  const html = readText(htmlRel);
  if (!html.includes(item.title)) {
    problems.push(`${htmlRel} does not contain registry title: ${item.title}`);
  }

  if (!html.includes(item.canonical_url) && !html.includes(absoluteUrl(item.canonical_url))) {
    problems.push(`${htmlRel} does not contain canonical URL: ${item.canonical_url}`);
  }

  if (!html.includes(contentTypes[type].hubUrl)) {
    problems.push(`${htmlRel} does not link back to hub: ${contentTypes[type].hubUrl}`);
  }

  validateArticleMetaOutput(html, item, htmlRel);
  validateVisibleArticleFreshness(html, item, htmlRel);
  validateOfficialSourceOutput(html, item, htmlRel);
  validateNoMojibake(html, htmlRel);
  validateNoPlaceholderHash(html, htmlRel);
  validateInternalLinks(html, htmlRel);
}

function validateFrontMatterConsistency(item, label) {
  const markdownRel = trimLeadingSlash(item.markdown_path);
  if (!exists(markdownRel)) return;
  const frontMatter = parseFrontMatter(readText(markdownRel));

  for (const field of frontMatterRequiredFields) {
    if (!Object.prototype.hasOwnProperty.call(frontMatter, field)) {
      problems.push(`${label} Markdown front matter missing required field: ${field}`);
    }
  }

  for (const field of frontMatterComparableFields) {
    if (!Object.prototype.hasOwnProperty.call(frontMatter, field)
        || !Object.prototype.hasOwnProperty.call(item, field)) continue;
    if (normalizedMetadataValue(frontMatter[field]) !== normalizedMetadataValue(item[field])) {
      problems.push(`${label} registry/front matter mismatch for ${field}.`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(frontMatter, 'next_review')) {
    if (normalizedMetadataValue(frontMatter.next_review) !== normalizedMetadataValue(item.review?.next_review_due)) {
      problems.push(`${label} registry/front matter mismatch for next_review.`);
    }
  }
}

function validateWildBirdCards() {
  const relative = 'content/living/germany-wild-birds-guide.md';
  const source = readText(relative);
  const requiredBirdFields = ['de', 'jp', 'image', 'alt', 'description', 'tip', 'where', 'note'];
  const cards = [...source.matchAll(/:::bird-grid\r?\n([\s\S]*?)\r?\n:::/g)]
    .flatMap((grid) => grid[1].split(/^---\s*$/gm))
    .map((block) => Object.fromEntries([...block.matchAll(/^([a-z]+):\s*(.+)$/gm)].map((match) => [match[1], match[2].trim()])))
    .filter((card) => Object.keys(card).length);

  if (!cards.length) problems.push(`${relative} contains no bird cards.`);
  cards.forEach((card, index) => {
    for (const field of requiredBirdFields) {
      if (!String(card[field] || '').trim()) problems.push(`${relative} bird card ${index + 1} missing ${field}.`);
    }
    if (card.image && !/^https?:\/\//i.test(card.image) && !exists(trimLeadingSlash(card.image))) {
      problems.push(`${relative} bird card ${index + 1} references a missing image: ${card.image}`);
    }
  });

  const normalizedValues = {
    'German bird name': cards.map((card) => String(card.de || '').normalize('NFKC').toLocaleLowerCase('de')),
    'Japanese bird name': cards.map((card) => String(card.jp || '').normalize('NFKC').toLocaleLowerCase('ja')),
    'bird image': cards.map((card) => String(card.image || '').trim())
  };
  for (const [label, values] of Object.entries(normalizedValues)) {
    const seen = new Set();
    for (const value of values) {
      if (!value) continue;
      if (seen.has(value)) problems.push(`${relative} contains a duplicate ${label} card: ${value}`);
      seen.add(value);
    }
  }
}

function normalizedMetadataValue(value) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return JSON.stringify(value);
  if (typeof value === 'boolean') return String(value);
  return String(value ?? '').trim();
}

function latestMetadataDate(...values) {
  const candidates = values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .map((value) => ({ value, timestamp: Date.parse(value) }))
    .filter((entry) => Number.isFinite(entry.timestamp));
  candidates.sort((a, b) => b.timestamp - a.timestamp);
  return candidates[0]?.value || '';
}

function isValidGeneratedArticleUrl(type, item) {
  if (item.url === `/germany/ja/${type}/${item.slug}/`) return true;
  if (type === 'events' && item.content_type === 'news') {
    return item.url === `/germany/ja/events/news/${item.slug}/`;
  }
  return false;
}

function validateOfficialSourceOutput(html, item, relPath) {
  if (!item.official_sources.length) return;
  if (!html.includes('official-source-section')) {
    problems.push(`${relPath} missing official source section output.`);
  }
  for (const source of item.official_sources) {
    const htmlUrl = String(source.url || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;');
    if (source.url && !html.includes(source.url) && !html.includes(htmlUrl)) {
      problems.push(`${relPath} missing official source URL: ${source.url}`);
    }
  }
}

function visibleArticleFreshnessEntries(item) {
  const publishedAt = String(item.published_at || '').trim();
  const updatedAt = String(item.updated_at || '').trim();
  const verifiedAt = String(item.last_verified || '').trim();
  const hasDistinctUpdate = Boolean(updatedAt && updatedAt !== publishedAt);
  const entries = [];

  if (publishedAt) entries.push({ kind: 'published', label: '公開', value: publishedAt });
  if (hasDistinctUpdate && verifiedAt && updatedAt === verifiedAt) {
    entries.push({ kind: 'updated-verified', label: '最終更新・確認', value: updatedAt });
  } else {
    if (hasDistinctUpdate) entries.push({ kind: 'updated', label: '最終更新', value: updatedAt });
    if (verifiedAt) entries.push({ kind: 'verified', label: '最終確認', value: verifiedAt });
  }

  return entries;
}

function validateVisibleArticleFreshness(html, item, relPath) {
  const freshness = html.match(/<span\b[^>]*\bclass=["']article-freshness["'][^>]*>[\s\S]*?<\/span>/i)?.[0] || '';
  const expected = visibleArticleFreshnessEntries(item);
  if (!freshness) {
    problems.push(`${relPath} missing visible article freshness metadata.`);
    return;
  }

  const actualTimeCount = (freshness.match(/<time\b/gi) || []).length;
  if (actualTimeCount !== expected.length) {
    problems.push(`${relPath} emits ${actualTimeCount} visible freshness dates; expected ${expected.length}.`);
  }

  for (const entry of expected) {
    const expectedTime = `<time class="article-date article-date--${entry.kind}" datetime="${entry.value}">${entry.label}: ${entry.value}</time>`;
    if (!freshness.includes(expectedTime)) {
      problems.push(`${relPath} missing visible ${entry.label} date: ${entry.value}.`);
    }
  }
}

function validateArticleMetaOutput(html, item, relPath) {
  for (const expected of [
    'property="og:type"',
    'property="og:title"',
    'property="og:description"',
    'property="og:url"',
    '"@type":"Article"',
    '"@type":"BreadcrumbList"'
  ]) {
    if (!html.includes(expected)) {
      problems.push(`${relPath} missing article metadata output: ${expected}`);
    }
  }
  const expectedModified = latestMetadataDate(item.updated_at, item.last_verified, item.published_at);
  if (expectedModified && !html.includes(`property="article:modified_time" content="${expectedModified}"`)) {
    problems.push(`${relPath} article:modified_time does not match source metadata: ${expectedModified}.`);
  }
  if (expectedModified && !html.includes(`"dateModified":"${expectedModified}"`)) {
    problems.push(`${relPath} JSON-LD dateModified does not match source metadata: ${expectedModified}.`);
  }
}

function validateRelatedArticles(allItems) {
  const publishedSlugs = new Set(allItems.filter((item) => item.published === true).map((item) => item.slug));
  for (const item of allItems.filter((entry) => entry.published === true)) {
    const related = Array.isArray(item.related_articles) ? item.related_articles : [];
    const seen = new Set();
    for (const slug of related) {
      if (slug === item.slug) problems.push(`${item.markdown_path} related_articles contains a self-link: ${slug}.`);
      if (seen.has(slug)) problems.push(`${item.markdown_path} related_articles contains a duplicate: ${slug}.`);
      if (!publishedSlugs.has(slug)) problems.push(`${item.markdown_path} related_articles references an unknown published slug: ${slug}.`);
      seen.add(slug);
    }
  }
}

function validateHubs(datasets) {
  for (const [type, items] of Object.entries(datasets)) {
    const config = contentTypes[type];
    const html = readText(config.hubPath);
    const markerContent = extractMarker(html, config.gridMarker);

    for (const item of items.filter((entry) => entry.published === true && entry.hub_visible === true)) {
      if (!html.includes(item.url)) {
        problems.push(`${config.hubPath} missing published hub item: ${item.url}`);
      }
    }

    for (const item of items.filter((entry) => entry.published !== true || entry.hub_visible !== true)) {
      if (markerContent.includes(item.url)) {
        problems.push(`${config.hubPath} generated grid includes unpublished or hidden item: ${item.url}`);
      }
    }

    validateNoPlaceholderHash(markerContent, `${config.hubPath} generated grid`);
    validateNoDuplicateUrls(extractUrls(markerContent), `${config.hubPath} generated grid`);
  }
}

function validateHome(datasets) {
  const homePath = 'germany/ja/index.html';
  const html = readText(homePath);

  for (const [type, items] of Object.entries(datasets)) {
    const config = contentTypes[type];
    const selectableItems = type === 'events'
      ? items.filter((item) => item.content_type !== 'news')
      : items;
    const selected = homeItems(selectableItems, config.homeLimit);
    const markerContent = extractMarker(html, config.homeMarker);

    for (const item of selected) {
      if (!html.includes(item.url)) {
        problems.push(`${homePath} missing selected Home ${type} item: ${item.url}`);
      }
    }

    for (const item of items.filter((entry) => entry.published !== true || entry.home_visible !== true)) {
      if (markerContent.includes(item.url)) {
        problems.push(`${homePath} ${config.homeMarker} includes unpublished or hidden item: ${item.url}`);
      }
    }

    validateNoPlaceholderHash(markerContent, `${homePath} ${config.homeMarker}`);
    validateNoDuplicateUrls(extractUrls(markerContent), `${homePath} ${config.homeMarker}`);
  }
}

function validateSearchIndex(allItems) {
  const searchPath = 'assets/js/search-index.js';
  const searchIndex = readSearchIndex(searchPath);
  const urls = searchIndex.map((entry) => entry.url).filter(Boolean);
  validateNoDuplicateUrls(urls, searchPath);

  for (const item of allItems.filter((entry) => entry.published === true && entry.search_visible === true)) {
    if (!urls.includes(item.url)) {
      problems.push(`${searchPath} missing search-visible item: ${item.url}`);
    }
  }

  for (const item of allItems.filter((entry) => entry.published !== true || entry.search_visible !== true)) {
    if (urls.includes(item.url)) {
      problems.push(`${searchPath} includes unpublished or hidden item: ${item.url}`);
    }
  }
}

function validateSitemap(allItems) {
  const sitemapPath = 'sitemap.xml';
  const xml = readText(sitemapPath);
  const entries = [...xml.matchAll(/<url>\s*<loc>([\s\S]*?)<\/loc>([\s\S]*?)<\/url>/g)].map((match) => ({
    loc: match[1].trim(),
    lastmod: match[2].match(/<lastmod>([\s\S]*?)<\/lastmod>/)?.[1].trim() || ''
  }));
  const urls = entries.map((entry) => entry.loc);
  const lastmodByUrl = new Map(entries.map((entry) => [entry.loc, entry.lastmod]));
  validateNoDuplicateUrls(urls, sitemapPath);

  for (const item of allItems.filter((entry) => entry.published === true && entry.sitemap_visible === true)) {
    const loc = absoluteUrl(item.url);
    if (!urls.includes(loc)) {
      problems.push(`${sitemapPath} missing sitemap-visible item: ${loc}`);
    }
    const expectedLastmod = latestMetadataDate(item.updated_at, item.last_verified, item.published_at);
    if (lastmodByUrl.get(loc) !== expectedLastmod) {
      problems.push(`${sitemapPath} lastmod for ${loc} must match source metadata: ${expectedLastmod}.`);
    }
  }

  for (const item of allItems.filter((entry) => entry.published !== true || entry.sitemap_visible !== true)) {
    const loc = absoluteUrl(item.url);
    if (urls.includes(loc)) {
      problems.push(`${sitemapPath} includes unpublished or hidden item: ${loc}`);
    }
  }
}

function readSearchIndex(searchPath) {
  try {
    const sandbox = { window: {} };
    vm.runInNewContext(readText(searchPath), sandbox, { filename: searchPath, timeout: 1000 });
    if (!Array.isArray(sandbox.window.JCONNECT_SEARCH_INDEX)) {
      problems.push(`${searchPath} must define window.JCONNECT_SEARCH_INDEX as an array.`);
      return [];
    }
    return sandbox.window.JCONNECT_SEARCH_INDEX;
  } catch (error) {
    problems.push(`Unable to parse ${searchPath}: ${error.message}`);
    return [];
  }
}

function validateInternalLinks(html, relPath) {
  for (const href of extractUrls(html)) {
    if (!href.startsWith('/germany/ja/')) continue;
    if (!localTargetExists(href)) {
      problems.push(`${relPath} has unresolved internal link: ${href}`);
    }
  }
}

function validateNoMojibake(text, label) {
  for (const pattern of ['????', '???', 'ï¿½']) {
    if (text.includes(pattern)) {
      problems.push(`${label} contains mojibake pattern: ${pattern}`);
    }
  }
}

function validateNoPlaceholderHash(text, label) {
  if (/\bhref=["']#["']/i.test(text)) {
    problems.push(`${label} contains placeholder href=\"#\".`);
  }
}

function validateNoDuplicateUrls(urls, label) {
  const seen = new Set();
  for (const url of urls) {
    if (seen.has(url)) {
      problems.push(`${label} contains duplicate URL: ${url}`);
    }
    seen.add(url);
  }
}

function extractMarker(html, marker) {
  const start = `<!-- CONTENT:${marker}:start -->`;
  const end = `<!-- CONTENT:${marker}:end -->`;
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    problems.push(`Missing generated marker pair: ${marker}`);
    return '';
  }
  return html.slice(startIndex + start.length, endIndex);
}

function extractUrls(html) {
  return [...String(html || '').matchAll(/\bhref=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((href) => !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:') && !href.startsWith('tel:'))
    .map((href) => href.split('#')[0].split('?')[0])
    .filter(Boolean);
}

function localTargetExists(url) {
  const cleanUrl = url.split('#')[0].split('?')[0];
  const target = path.join(root, cleanUrl.slice(1));

  if (fs.existsSync(target) && fs.statSync(target).isFile()) return true;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    return fs.existsSync(path.join(target, 'index.html'));
  }
  return fs.existsSync(`${target}.html`);
}

function homeItems(items, limit) {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.published === true && item.home_visible === true)
    .sort(compareHomeItemEntries)
    .slice(0, limit)
    .map(({ item }) => item);
}

function compareHomeItemEntries(a, b) {
  const aTime = getHomeDateTimestamp(a.item);
  const bTime = getHomeDateTimestamp(b.item);
  const aHasDate = Number.isFinite(aTime);
  const bHasDate = Number.isFinite(bTime);
  if (aHasDate && bHasDate && aTime !== bTime) return bTime - aTime;
  if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
  return a.index - b.index;
}

function getHomeDateTimestamp(item) {
  for (const field of ['lastModifiedAt', 'last_modified_at', 'updatedAt', 'updated_at', 'publishedAt', 'published_at', 'postedAt', 'posted_at', 'date', 'createdAt', 'created_at']) {
    const time = Date.parse(item?.[field] || '');
    if (Number.isFinite(time)) return time;
  }
  return NaN;
}

function checkUnique(seen, value, message) {
  if (!value) return;
  if (seen.has(value)) {
    problems.push(message);
    return;
  }
  seen.add(value);
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter((entry) => String(entry).trim()).map(String);
  if (!value) return [];
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function readText(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function trimLeadingSlash(value) {
  return String(value || '').replace(/^\/+/, '');
}

function outputPathFromUrl(value) {
  const pathname = String(value || '')
    .replace(/^https?:\/\/[^/]+/i, '')
    .split('#')[0]
    .split('?')[0]
    .replace(/^\/+/, '');
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return path.posix.join(normalized, 'index.html');
}

function absoluteUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}

main();
