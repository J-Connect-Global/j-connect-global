import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

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
    homeLimit: 3,
    learnFields: ['level', 'situation']
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

      if (item.url !== `/germany/ja/${type}/${item.slug}/`) {
        problems.push(`${label} URL must match generated page path: ${item.url}`);
      }

      if (item.published === true) {
        validatePublishedFiles(type, item, label);
      }

      allItems.push(item);
    }
  }

  validateHubs(datasets);
  validateHome(datasets);
  validateSearchIndex(allItems);
  validateSitemap(allItems);

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
    if (!String(item[field] ?? '').trim()) {
      problems.push(`${label} missing Learn German field: ${field}`);
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
  const htmlRel = path.posix.join('germany/ja', type, item.slug, 'index.html');

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

  validateArticleMetaOutput(html, htmlRel);
  validateOfficialSourceOutput(html, item, htmlRel);
  validateNoMojibake(html, htmlRel);
  validateNoPlaceholderHash(html, htmlRel);
  validateInternalLinks(html, htmlRel);
}

function validateOfficialSourceOutput(html, item, relPath) {
  if (!item.official_sources.length) return;
  if (!html.includes('official-source-section')) {
    problems.push(`${relPath} missing official source section output.`);
  }
  for (const source of item.official_sources) {
    if (source.url && !html.includes(source.url)) {
      problems.push(`${relPath} missing official source URL: ${source.url}`);
    }
  }
}

function validateArticleMetaOutput(html, relPath) {
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
    const selected = homeItems(items, config.homeLimit);
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
  const urls = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((match) => match[1].trim());
  validateNoDuplicateUrls(urls, sitemapPath);

  for (const item of allItems.filter((entry) => entry.published === true && entry.sitemap_visible === true)) {
    const loc = absoluteUrl(item.url);
    if (!urls.includes(loc)) {
      problems.push(`${sitemapPath} missing sitemap-visible item: ${loc}`);
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
    .filter((item) => item.published === true && item.home_visible === true)
    .sort((a, b) => Number(a.home_order) - Number(b.home_order) || String(b.published_at || '').localeCompare(String(a.published_at || '')))
    .slice(0, limit);
}

function checkUnique(seen, value, message) {
  if (!value) return;
  if (seen.has(value)) {
    problems.push(message);
    return;
  }
  seen.add(value);
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

function absoluteUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}

main();
