import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ORIGIN = 'https://j-connect-global.com';
const PAGE_REGISTRY_PATH = 'content/registry/pages.json';
const SEARCH_INDEX_PATH = 'assets/js/search-index.js';
const SITEMAP_PATH = 'sitemap.xml';
const contentRegistryPaths = [
  'content/registry/living.json',
  'content/registry/events.json',
  'content/registry/learn-german.json'
];

const requiredPageFields = [
  'id',
  'title',
  'url',
  'type',
  'pillar',
  'status',
  'canonical_url',
  'nav_visible',
  'footer_visible',
  'search_visible',
  'sitemap_visible',
  'legacy',
  'redirect_target',
  'layout',
  'hero_type',
  'description'
];

const allowedTypes = new Set(['home', 'hub', 'article', 'directory', 'listing', 'detail', 'utility', 'legal', 'legacy']);
const allowedPillars = new Set(['home', 'community', 'living', 'jobs', 'events', 'learn-german', 'utility', 'legacy']);
const allowedStatuses = new Set(['published', 'legacy', 'redirect', 'draft']);
const requiredNavLinks = [
  '/germany/ja/community/',
  '/germany/ja/living/',
  '/germany/ja/jobs/',
  '/germany/ja/events/',
  '/germany/ja/learn-german/'
];

const problems = [];

function main() {
  const pages = readPages();
  const contentItems = readContentItems();
  const articleUrls = new Set(contentItems.filter((item) => item.published === true).map((item) => normalizeUrl(item.url)));
  const htmlFiles = walk(path.join(root, 'germany/ja')).filter((file) => file.endsWith('.html'));
  const htmlByUrl = new Map(htmlFiles.map((file) => [fileToUrl(toRelPath(file)), file]));
  const pagesByUrl = new Map();

  validatePagesRegistry(pages, pagesByUrl);
  validateRouteCoverage(htmlByUrl, pagesByUrl, articleUrls);

  for (const [url, file] of htmlByUrl.entries()) {
    validateHtmlPage(url, file, pagesByUrl.get(url));
  }

  validateSearchIndex(pages, contentItems);
  validateSitemap(pages, contentItems);

  if (problems.length) {
    console.error(`Layout validation failed with ${problems.length} issue(s):`);
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }

  console.log(`Layout validation passed: ${htmlFiles.length} JA HTML pages and ${pages.length} registry routes checked.`);
}

function readPages() {
  try {
    const pages = readJson(PAGE_REGISTRY_PATH);
    if (!Array.isArray(pages)) {
      problems.push(`${PAGE_REGISTRY_PATH} must contain a JSON array.`);
      return [];
    }
    return pages.map((page) => ({
      ...page,
      url: normalizeUrl(page.url),
      canonical_url: normalizeUrl(page.canonical_url || page.url)
    }));
  } catch (error) {
    problems.push(`Unable to parse ${PAGE_REGISTRY_PATH}: ${error.message}`);
    return [];
  }
}

function readContentItems() {
  const items = [];
  for (const relPath of contentRegistryPaths) {
    const registry = readJson(relPath);
    if (!Array.isArray(registry)) {
      problems.push(`${relPath} must contain a JSON array.`);
      continue;
    }
    for (const item of registry) {
      items.push({
        ...item,
        url: normalizeUrl(item.url),
        published: item.published === true || item.status === 'published'
      });
    }
  }
  return items;
}

function validatePagesRegistry(pages, pagesByUrl) {
  const ids = new Set();

  for (const [index, page] of pages.entries()) {
    const label = `${PAGE_REGISTRY_PATH}[${index}]`;
    for (const field of requiredPageFields) {
      if (!Object.prototype.hasOwnProperty.call(page, field)) {
        problems.push(`${label} missing required field: ${field}`);
      }
    }

    if (!page.id || ids.has(page.id)) problems.push(`${label} has duplicate or empty id: ${page.id || '(empty)'}`);
    ids.add(page.id);

    if (!page.url || pagesByUrl.has(page.url)) problems.push(`${label} has duplicate or empty url: ${page.url || '(empty)'}`);
    pagesByUrl.set(page.url, page);

    if (!allowedTypes.has(page.type)) problems.push(`${label} has unsupported type: ${page.type}`);
    if (!allowedPillars.has(page.pillar)) problems.push(`${label} has unsupported pillar: ${page.pillar}`);
    if (!allowedStatuses.has(page.status)) problems.push(`${label} has unsupported status: ${page.status}`);
    if (!String(page.description || '').trim()) problems.push(`${label} missing description.`);

    if (page.status === 'published' || page.status === 'legacy') {
      if (!localTargetExists(urlToTargetPath(page.url))) problems.push(`${label} URL does not resolve: ${page.url}`);
    }

    if (page.status === 'legacy') {
      if (page.legacy !== true) problems.push(`${label} legacy status must set legacy=true.`);
      if (page.nav_visible !== false) problems.push(`${label} legacy page must not be nav_visible.`);
      if (page.search_visible !== false) problems.push(`${label} legacy page must not be search_visible.`);
      if (page.sitemap_visible !== false) problems.push(`${label} legacy page must not be sitemap_visible.`);
      if (!page.redirect_target) problems.push(`${label} legacy page should declare redirect_target.`);
    }

    if (page.status === 'redirect' && !page.redirect_target) {
      problems.push(`${label} redirect page must declare redirect_target.`);
    }

    if ((page.search_visible === true || page.sitemap_visible === true) && page.status !== 'published') {
      problems.push(`${label} cannot be search/sitemap visible unless status=published.`);
    }
  }

  for (const url of ['/germany/ja/eat/', '/germany/ja/shopping/', '/germany/ja/medical/']) {
    const page = pagesByUrl.get(url);
    if (!page) {
      problems.push(`${PAGE_REGISTRY_PATH} missing directory route: ${url}`);
      continue;
    }
    if (page.type !== 'directory' || page.pillar !== 'living') {
      problems.push(`${url} must be classified as type="directory", pillar="living".`);
    }
  }

  const guides = pagesByUrl.get('/germany/ja/guides/');
  if (guides && (guides.type !== 'legacy' || guides.pillar !== 'legacy' || guides.nav_visible !== false)) {
    problems.push('/germany/ja/guides/ must remain a hidden legacy route.');
  }
}

function validateRouteCoverage(htmlByUrl, pagesByUrl, articleUrls) {
  for (const url of htmlByUrl.keys()) {
    if (pagesByUrl.has(url) || articleUrls.has(url)) continue;
    problems.push(`JA HTML page is not governed by pages.json or an article registry: ${url}`);
  }
}

function validateHtmlPage(url, file, page) {
  const rel = toRelPath(file);
  const html = fs.readFileSync(file, 'utf8');
  const headerBlock = extractLayoutBlock(html, 'ja-header', rel);
  const footerBlock = extractLayoutBlock(html, 'ja-footer', rel);

  if (headerBlock) {
    for (const requiredLink of requiredNavLinks) {
      if (!hasHref(headerBlock, requiredLink)) {
        problems.push(`${rel} header missing required nav link: ${requiredLink}`);
      }
    }
    if (/href=["']\/germany\/ja\/guides\/["']/i.test(headerBlock)) {
      problems.push(`${rel} header contains legacy Guides as a current nav link.`);
    }
  }

  if (footerBlock) {
    if (/href=["']\/germany\/ja\/guides\/["']/i.test(footerBlock)) {
      problems.push(`${rel} footer contains legacy Guides as a current link.`);
    }
    validateInternalLinks(footerBlock, rel, `${rel} footer`);
  }

  if (/\bhref=["']#["']/i.test(html)) problems.push(`${rel} contains placeholder href="#".`);
  validateNoMojibake(html, rel);
  validateCanonical(html, page, rel);
  validateTitleAndDescription(html, rel);
  validateCssOrder(html, rel);
  validateInternalLinks(html, rel, rel);

  if (page?.canonical_url && page.status !== 'redirect') {
    const expected = absoluteUrl(page.canonical_url);
    const hrefs = canonicalHrefs(html);
    if (hrefs.length === 1 && hrefs[0] !== expected) {
      problems.push(`${rel} canonical href should be ${expected}, got ${hrefs[0]}`);
    }
  }
}

function extractLayoutBlock(html, marker, rel) {
  const match = html.match(new RegExp(`<!-- LAYOUT:${marker}:start -->([\\s\\S]*?)<!-- LAYOUT:${marker}:end -->`));
  if (!match) {
    problems.push(`${rel} missing layout marker pair: ${marker}`);
    return '';
  }
  return match[1];
}

function validateCanonical(html, page, rel) {
  const hrefs = canonicalHrefs(html);
  if (hrefs.length > 1) problems.push(`${rel} contains duplicate canonical tags.`);
  if (page && page.status !== 'redirect' && hrefs.length === 0) problems.push(`${rel} missing canonical tag.`);
}

function canonicalHrefs(html) {
  return [...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
}

function validateTitleAndDescription(html, rel) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (!title) problems.push(`${rel} missing <title>.`);

  const description = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1]?.trim();
  if (!description) problems.push(`${rel} missing meta description.`);
}

function validateCssOrder(html, rel) {
  const styles = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
  const localStyles = styles.filter((href) => !/^https?:\/\//i.test(href)).map((href) => href.split('?')[0]);
  const siteIndex = localStyles.indexOf('/assets/css/site.css');
  const headerFooterIndex = localStyles.indexOf('/assets/css/ja-header-footer.css');
  const uiIndex = localStyles.indexOf('/assets/css/jconnect-ui.css');

  if (siteIndex === -1) problems.push(`${rel} missing /assets/css/site.css.`);
  if (uiIndex !== -1 && siteIndex !== -1 && siteIndex > uiIndex) {
    problems.push(`${rel} CSS order should load site.css before jconnect-ui.css.`);
  }
  if (headerFooterIndex !== -1 && siteIndex !== -1 && headerFooterIndex < siteIndex) {
    problems.push(`${rel} CSS order should load ja-header-footer.css after site.css.`);
  }
  if (headerFooterIndex !== -1 && uiIndex !== -1 && headerFooterIndex > uiIndex) {
    problems.push(`${rel} CSS order should load ja-header-footer.css before jconnect-ui.css.`);
  }

  const shared = new Set([
    '/assets/css/site.css',
    '/assets/css/ja-header-footer.css',
    '/assets/css/jconnect-ui.css',
    '/assets/css/cookie-consent.css'
  ]);
  if (uiIndex !== -1) {
    for (const [index, href] of localStyles.entries()) {
      if (shared.has(href)) continue;
      if (index < uiIndex) problems.push(`${rel} page-specific CSS should load after jconnect-ui.css: ${href}`);
    }
  }
}

function validateSearchIndex(pages, contentItems) {
  const searchIndex = readSearchIndex();
  const urls = searchIndex.map((item) => item?.url).filter(Boolean).map(normalizeUrl);
  validateNoDuplicateUrls(urls, SEARCH_INDEX_PATH);

  for (const page of pages) {
    const shouldInclude = page.status === 'published' && page.search_visible === true;
    validateVisibility(urls, page.url, shouldInclude, `${SEARCH_INDEX_PATH} page route`);
  }

  for (const item of contentItems) {
    const shouldInclude = item.published === true && item.search_visible !== false;
    validateVisibility(urls, item.url, shouldInclude, `${SEARCH_INDEX_PATH} article route`);
  }

  validateSearchItemsResolve(searchIndex);
}

function validateSitemap(pages, contentItems) {
  const xml = fs.readFileSync(path.join(root, SITEMAP_PATH), 'utf8');
  const urls = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((match) => normalizeUrl(toRootRelativeUrl(match[1].trim())));
  validateNoDuplicateUrls(urls, SITEMAP_PATH);

  for (const page of pages) {
    const shouldInclude = page.status === 'published' && page.sitemap_visible === true;
    validateVisibility(urls, page.url, shouldInclude, `${SITEMAP_PATH} page route`);
  }

  for (const item of contentItems) {
    const shouldInclude = item.published === true && item.sitemap_visible !== false;
    validateVisibility(urls, item.url, shouldInclude, `${SITEMAP_PATH} article route`);
  }

  for (const url of urls) {
    if (url.includes('/germany/ja/guides/')) problems.push(`${SITEMAP_PATH} includes legacy Guides URL: ${url}`);
    if (url.startsWith('/germany/ja/') && !localTargetExists(urlToTargetPath(url))) {
      problems.push(`${SITEMAP_PATH} URL does not resolve: ${url}`);
    }
  }
}

function validateVisibility(urls, url, shouldInclude, label) {
  const hasUrl = urls.includes(normalizeUrl(url));
  if (shouldInclude && !hasUrl) problems.push(`${label} missing visible URL: ${url}`);
  if (!shouldInclude && hasUrl) problems.push(`${label} includes hidden URL: ${url}`);
}

function validateSearchItemsResolve(searchIndex) {
  for (const [index, item] of searchIndex.entries()) {
    const label = `${SEARCH_INDEX_PATH}[${index}]`;
    if (!item || typeof item !== 'object') {
      problems.push(`${label} must be an object.`);
      continue;
    }
    for (const key of ['title', 'description', 'url', 'category']) {
      if (!String(item[key] || '').trim()) problems.push(`${label} missing ${key}.`);
    }
    if (!Array.isArray(item.tags) || item.tags.length === 0) problems.push(`${label} missing tags.`);
    if (String(item.url || '').startsWith('/germany/ja/') && !localTargetExists(urlToTargetPath(item.url))) {
      problems.push(`${label} URL does not resolve: ${item.url}`);
    }
    if (String(item.url || '').includes('/germany/ja/guides/')) {
      problems.push(`${label} includes legacy Guides URL.`);
    }
  }
}

function readSearchIndex() {
  try {
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(root, SEARCH_INDEX_PATH), 'utf8'), sandbox, {
      filename: SEARCH_INDEX_PATH,
      timeout: 1000
    });
    if (!Array.isArray(sandbox.window.JCONNECT_SEARCH_INDEX)) {
      problems.push(`${SEARCH_INDEX_PATH} must define window.JCONNECT_SEARCH_INDEX as an array.`);
      return [];
    }
    return sandbox.window.JCONNECT_SEARCH_INDEX;
  } catch (error) {
    problems.push(`Unable to parse ${SEARCH_INDEX_PATH}: ${error.message}`);
    return [];
  }
}

function validateInternalLinks(html, rel, label) {
  for (const href of extractLocalUrls(html)) {
    if (!href.startsWith('/germany/ja/') && !href.startsWith('/assets/')) continue;
    if (!localTargetExists(urlToTargetPath(href))) {
      problems.push(`${label} has unresolved internal link in ${rel}: ${href}`);
    }
  }
}

function extractLocalUrls(html) {
  return [...String(html || '').matchAll(/\b(?:href|src|action)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((href) => !/^(https?:|mailto:|tel:|javascript:|data:)/i.test(href))
    .map((href) => href.split('#')[0].split('?')[0])
    .filter(Boolean);
}

function validateNoMojibake(text, label) {
  if (/\?{3,}/.test(text)) problems.push(`${label} contains mojibake-like question marks.`);
  for (const pattern of ['ï¿½', '�']) {
    if (text.includes(pattern)) problems.push(`${label} contains mojibake pattern: ${pattern}`);
  }
}

function validateNoDuplicateUrls(urls, label) {
  const seen = new Set();
  for (const url of urls) {
    if (seen.has(url)) problems.push(`${label} contains duplicate URL: ${url}`);
    seen.add(url);
  }
}

function hasHref(html, url) {
  const escaped = escapeRegExp(url);
  return new RegExp(`href=["']${escaped}["']`, 'i').test(html);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

function fileToUrl(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  if (normalized === 'germany/ja/index.html') return '/germany/ja/';
  if (normalized.endsWith('/index.html')) return `/${normalized.slice(0, -'index.html'.length)}`;
  return `/${normalized}`;
}

function urlToTargetPath(url) {
  const cleanUrl = toRootRelativeUrl(url).split('#')[0].split('?')[0];
  if (cleanUrl === '/') return path.join(root, 'index.html');
  return path.join(root, cleanUrl.replace(/^\/+/, ''));
}

function localTargetExists(targetPath) {
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) return true;
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
    return fs.existsSync(path.join(targetPath, 'index.html'));
  }
  return fs.existsSync(`${targetPath}.html`);
}

function toRootRelativeUrl(value) {
  const url = String(value || '').trim();
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== SITE_ORIGIN) return url;
      return parsed.pathname || '/';
    } catch {
      return url;
    }
  }
  return url;
}

function normalizeUrl(value) {
  const url = toRootRelativeUrl(value);
  if (!url || url === '/') return url || '';
  return url.endsWith('/') ? url : `${url}/`;
}

function absoluteUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}

function toRelPath(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();
