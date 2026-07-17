import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = process.cwd();
const scriptPath = path.relative(root, fileURLToPath(import.meta.url));
const SITE_ORIGIN = 'https://j-connect-global.com';
const PRIMARY_JA_PATH = '/germany/ja/';
const PAGE_REGISTRY_PATH = 'content/registry/pages.json';

const requiredOgProperties = [
  'og:title',
  'og:description',
  'og:url',
  'og:image',
  'og:type',
  'og:site_name',
  'og:locale',
];

const requiredTwitterNames = [
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
];

const coreIndexableUrls = new Set([
  '/germany/ja/',
  '/germany/ja/about/',
  '/germany/ja/contact/',
  '/germany/ja/terms/',
  '/germany/ja/privacy/',
  '/germany/ja/impressum/',
  '/germany/ja/community/',
  '/germany/ja/living/',
  '/germany/ja/jobs/',
  '/germany/ja/events/',
  '/germany/ja/learn-german/',
  '/germany/ja/eat/',
  '/germany/ja/shopping/',
  '/germany/ja/medical/',
]);

const directoryStaticRequirements = new Map([
  ['/germany/ja/jobs/', ['jobs-list-loading', '求人情報を読み込んでいます。', '公開中の求人を一覧で確認できます。']],
  ['/germany/ja/eat/', ['directory-seed-card', '現在は基本ガイドを表示しています', '地図・営業時間・予約条件を公式情報で確認']],
  ['/germany/ja/shopping/', ['directory-seed-card', '現在は基本ガイドを表示しています', '日本食材・生活用品は在庫と配送条件を確認']],
  ['/germany/ja/medical/', ['directory-seed-card', '医療上の助言や診断ではありません', '重い症状は112', '116117']],
  ['/germany/ja/community/', ['hero-safety', '受け渡しは公共の場所推奨', '投稿内容や取引の成立をサイトが保証するものではありません']],
  ['/germany/ja/events/', ['data-events-card', 'data-news-card', 'イベント一覧']],
]);

const staleHomeEventBadgePatterns = [
  /<b>\s*日程\s*<\/b>\s*<strong>\s*確認\s*<\/strong>/,
  /<b>\s*冬\s*<\/b>\s*<strong>\s*確認\s*<\/strong>/,
  /日程\s*確認/,
  /冬\s*確認/,
  /æ—¥ç¨‹\s*ç¢ºèª/,
  /å†¬\s*ç¢ºèª/,
];

const requiredPages = [
  '/germany/ja/',
  '/germany/ja/about/',
  '/germany/ja/contact/',
  '/germany/ja/news/',
  '/germany/ja/events/',
  '/germany/ja/learn-german/',
  '/germany/ja/living/',
  '/germany/ja/jobs/',
  '/germany/ja/jobs/posting/',
  '/germany/ja/medical/',
  '/germany/ja/eat/',
  '/germany/ja/shopping/',
  '/germany/ja/community/',
  '/germany/ja/community/post/',
  '/germany/ja/community/contact/',
  '/germany/ja/community/contact/complete/',
  '/germany/ja/community/report/',
  '/germany/ja/community/report/complete/',
  '/germany/ja/community/delete/',
  '/germany/ja/community/thanks/',
  '/germany/ja/community/complete/',
  '/germany/ja/community/manage/',
  '/germany/ja/terms/',
  '/germany/ja/privacy/',
  '/germany/ja/impressum/',
  '/germany/en/coming-soon/',
  '/germany/de/coming-soon/',
  '/germany/ja/jobs/sales-assistant-japanese-duesseldorf/',
  '/germany/ja/jobs/it-support-specialist-cologne/',
  '/germany/ja/jobs/accounting-staff-munich/',
  '/germany/ja/jobs/detail/',
  '/germany/ja/events/japan-day-duesseldorf/',
  '/germany/ja/events/cologne-flea-market/',
  '/germany/ja/events/bonn-japanese-film-festival/',
  '/germany/ja/events/detail/',
  '/germany/ja/learn-german/appointment-phrase/',
  '/germany/ja/learn-german/hospital-phrases/',
  '/germany/ja/learn-german/work-email-phrases/',
  '/germany/ja/search/',
];

const searchIndexCandidates = [
  'assets/js/search-index.js',
  'assets/data/search-index.json',
];

const faviconIcoPath = path.join(root, 'favicon.ico');
const faviconPreviewPath = path.join(root, 'favicon-preview.png');

const blockedTerms = [
  '検索機能は準備中です',
  'サイト内検索は現在準備中です',
  '日本語トップ',
  '\u8868\u793a\u90fd\u5e02\u3092\u5207\u308a\u66ff\u3048\u308b',
  '\u73fe\u5728\u306e\u90fd\u5e02',
  'city' + 'Config',
  'apply' + 'City',
  'ngg_' + 'selected_' + 'city',
  'city-' + 'pill',
  'current-' + 'city',
  'city-' + 'dependent',
  '/cities/' + 'frankfurt/',
  '/cities/' + 'muenchen/',
  '/cities/' + 'berlin/',
  './cities/' + 'frankfurt/',
  './cities/' + 'muenchen/',
  './cities/' + 'berlin/',
  '\u4e2d' + '\u6587',
  '\ud55c\uad6d\uc5b4',
  'Espa' + 'nol',
  'Espa\u00f1ol',
  'Chi' + 'nese',
  'Kor' + 'ean',
  'Spa' + 'nish',
  'Nihon ' + 'Gateway',
  'Nihon' + 'Gateway',
  'Nihon' + 'Gateway' + 'Germany',
  'Nihon ' + 'Gateway Germany',
];

const checkedTextExts = new Set(['.html', '.css', '.js', '.mjs']);
const excludedWalkDirectories = new Set([
  '.git',
  'node_modules',
  'playwright-report',
  'test-results',
  '_site',
]);
const htmlFiles = [];
const textFiles = [];
const problems = [];
const pagesByUrl = loadPagesRegistry();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedWalkDirectories.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }

    const rel = path.relative(root, full);
    const normalizedRel = rel.split(path.sep).join('/');
    const ext = path.extname(entry.name);
    if (normalizedRel === scriptPath.split(path.sep).join('/')) continue;
    if (entry.name.endsWith('.html')) htmlFiles.push(full);
    if (checkedTextExts.has(ext)) textFiles.push(full);
  }
}

function loadPagesRegistry() {
  const fullPath = path.join(root, PAGE_REGISTRY_PATH);
  if (!fs.existsSync(fullPath)) return new Map();

  try {
    const pages = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    if (!Array.isArray(pages)) {
      problems.push(`${PAGE_REGISTRY_PATH} must contain a JSON array.`);
      return new Map();
    }
    return new Map(pages.map((page) => [normalizeUrl(page.url), {
      ...page,
      url: normalizeUrl(page.url),
      canonical_url: normalizeUrl(page.canonical_url || page.url),
    }]));
  } catch (error) {
    problems.push(`Unable to parse ${PAGE_REGISTRY_PATH}: ${error.message}`);
    return new Map();
  }
}

function localTargetExists(targetPath) {
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) return true;
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
    return fs.existsSync(path.join(targetPath, 'index.html'));
  }
  return fs.existsSync(`${targetPath}.html`);
}

function readSearchIndex(searchIndexPath) {
  const ext = path.extname(searchIndexPath);
  const text = fs.readFileSync(searchIndexPath, 'utf8');

  if (ext === '.json') {
    return JSON.parse(text);
  }

  const sandbox = { window: {} };
  vm.runInNewContext(text, sandbox, {
    filename: path.relative(root, searchIndexPath),
    timeout: 1000,
  });

  return sandbox.window.JCONNECT_SEARCH_INDEX;
}

function resolveInternalUrl(urlValue, file) {
  if (!urlValue || urlValue.startsWith('#')) return null;
  if (urlValue.includes('${')) return null;
  if (urlValue.includes('{{')) return null;
  if (/^(mailto|tel|javascript|data):/i.test(urlValue)) return null;

  let raw = urlValue.trim();
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (parsed.hostname !== 'j-connect-global.com') return null;
      raw = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  }

  if (/^[a-z]+:/i.test(raw)) return null;
  const [withoutHash] = raw.split('#');
  const [withoutQuery] = withoutHash.split('?');
  if (!withoutQuery) return null;

  const decoded = decodeURI(withoutQuery);
  if (decoded.startsWith('/')) return path.join(root, decoded.slice(1));
  return path.resolve(path.dirname(file), decoded);
}

walk(root);

for (const required of requiredPages) {
  const target = path.join(root, required.slice(1));
  if (!localTargetExists(target)) {
    problems.push(`Missing required page: ${required}`);
  }
}

const searchIndexRel = searchIndexCandidates.find((candidate) => fs.existsSync(path.join(root, candidate)));
if (!searchIndexRel) {
  problems.push(`Missing search index file: ${searchIndexCandidates.join(' or ')}`);
} else {
  const searchIndexPath = path.join(root, searchIndexRel);
  try {
    const searchIndex = readSearchIndex(searchIndexPath);

    if (!Array.isArray(searchIndex) || searchIndex.length === 0) {
      problems.push(`Search index must be a non-empty array: ${searchIndexRel}`);
    } else {
      for (const [index, item] of searchIndex.entries()) {
        const label = `${searchIndexRel}[${index}]`;
        if (!item || typeof item !== 'object') {
          problems.push(`Invalid search index item: ${label}`);
          continue;
        }

        for (const key of ['title', 'description', 'url', 'category']) {
          if (typeof item[key] !== 'string' || !item[key].trim()) {
            problems.push(`Search index item missing ${key}: ${label}`);
          }
        }

        if (!Array.isArray(item.tags) || item.tags.length === 0) {
          problems.push(`Search index item missing tags: ${label}`);
        }

        if (typeof item.url === 'string' && item.url.startsWith('/')) {
          const target = path.join(root, item.url.slice(1));
          if (!localTargetExists(target)) {
            problems.push(`Search index URL does not resolve: ${item.url}`);
          }
        } else {
          problems.push(`Search index URL must be root-relative: ${label}`);
        }
      }
    }
  } catch (error) {
    problems.push(`Unable to parse search index ${searchIndexRel}: ${error.message}`);
  }
}

if (fs.existsSync(faviconIcoPath) && fs.statSync(faviconIcoPath).size === 0) {
  problems.push('Root favicon.ico exists but is empty.');
}

if (fs.existsSync(faviconPreviewPath)) {
  problems.push('favicon-preview.png should not be committed.');
}

for (const file of textFiles) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');
  for (const term of blockedTerms) {
    if (text.includes(term)) {
      problems.push(`Forbidden text found in ${rel}: ${term}`);
    }
  }
}

for (const file of htmlFiles) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const html = fs.readFileSync(file, 'utf8');
  const url = fileToUrl(rel);

  const faviconLinks = html.match(/<link\b[^>]*rel=["']icon["'][^>]*href=["']\/assets\/images\/brand\/favicon\.png["'][^>]*>/gi) || [];
  for (const link of faviconLinks) {
    if (!/\btype=["']image\/png["']/i.test(link)) {
      problems.push(`Incorrect favicon MIME type in ${rel}: ${link}`);
    }
  }

  validateHtmlMetadata(rel, url, html, pagesByUrl.get(url));
  validateJsonLd(rel, html);
  validateStaticContentQuality(rel, url, html);
  validateInitialStateSafety(rel, url, html);

  const attrPattern = /\b(?:href|src|action)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(attrPattern)) {
    if (isDeferredArticleImageUrl(html, match.index, match[1])) continue;
    const target = resolveInternalUrl(match[1], file);
    if (!target) continue;
    if (!localTargetExists(target)) {
      problems.push(`Missing internal target in ${rel}: ${match[1]}`);
    }
  }
}

validateSitemap();

function validateHtmlMetadata(rel, url, html, page) {
  if (!url.startsWith(PRIMARY_JA_PATH)) return;

  const title = extractTitle(html);
  const htmlLang = String(html).match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1]?.toLowerCase() || '';
  const description = extractMetaContent(html, 'name', 'description');
  const robots = normalizeRobots(extractMetaContent(html, 'name', 'robots'));
  const canonical = extractCanonical(html);
  const expectedCanonical = absoluteUrl(page?.canonical_url || url);
  const shouldIndex = shouldIndexHtml(url, page);
  const hasNoindex = robots.includes('noindex');

  if (!title) problems.push(`${rel} missing <title>.`);
  if (htmlLang !== 'ja') problems.push(`${rel} must use <html lang="ja">.`);
  if (!description) problems.push(`${rel} missing meta description.`);
  if (!robots) problems.push(`${rel} missing robots meta.`);

  if (shouldIndex) {
    if (robots !== 'index, follow') problems.push(`${rel} should use robots "index, follow", got "${robots || '(missing)'}".`);
    if (coreIndexableUrls.has(url) && hasNoindex) problems.push(`${rel} core public page must not be noindex.`);
  } else if (page && robots !== 'noindex, follow') {
    problems.push(`${rel} non-indexable registry page should use robots "noindex, follow", got "${robots || '(missing)'}".`);
  }

  if (canonical !== expectedCanonical) {
    problems.push(`${rel} canonical should be ${expectedCanonical}, got ${canonical || '(missing)'}.`);
  }

  const shouldHaveJaAlternates = page
    ? page.status === 'published'
    : isArticleUrl(url, page);
  if (shouldHaveJaAlternates) {
    const alternates = hreflangEntries(html);
    if (alternates.length !== 2) problems.push(`${rel} must contain exactly ja and x-default hreflang alternates.`);
    for (const lang of ['ja', 'x-default']) {
      const matches = alternates.filter((entry) => entry.lang === lang);
      if (matches.length !== 1) problems.push(`${rel} must contain exactly one hreflang="${lang}".`);
      else if (matches[0].href !== canonical) problems.push(`${rel} hreflang="${lang}" must match the canonical URL.`);
    }
    for (const entry of alternates.filter((item) => !['ja', 'x-default'].includes(item.lang))) {
      problems.push(`${rel} exposes unsupported hreflang="${entry.lang}".`);
    }
  }

  for (const property of requiredOgProperties) {
    if (!extractMetaContent(html, 'property', property)) problems.push(`${rel} missing ${property}.`);
  }
  for (const name of requiredTwitterNames) {
    if (!extractMetaContent(html, 'name', name)) problems.push(`${rel} missing ${name}.`);
  }

  const ogUrl = extractMetaContent(html, 'property', 'og:url');
  if (ogUrl && ogUrl !== canonical) problems.push(`${rel} og:url should match canonical URL.`);

  if (isArticleUrl(url, page)) {
    if (!hasJsonLdType(html, 'Article')) problems.push(`${rel} article page missing Article JSON-LD.`);
    if (!hasJsonLdType(html, 'BreadcrumbList')) problems.push(`${rel} article page missing BreadcrumbList JSON-LD.`);
  }

  if (page && shouldIndex && page.id !== 'page-home' && ['hub', 'listing', 'directory', 'detail'].includes(page.type)) {
    if (!hasJsonLdType(html, 'BreadcrumbList')) problems.push(`${rel} indexable ${page.type} page missing BreadcrumbList JSON-LD.`);
  }

  validateTrustPlaceholders(rel, html);
}

function validateJsonLd(rel, html) {
  const scripts = [...html.matchAll(/<script\b(?=[^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [index, match] of scripts.entries()) {
    let parsed;
    try {
      parsed = JSON.parse(match[1]);
    } catch (error) {
      problems.push(`${rel} has invalid JSON-LD #${index + 1}: ${error.message}`);
      continue;
    }
    validateJsonLdUrls(parsed, `${rel} JSON-LD #${index + 1}`);
    validateJsonLdSchemaPolicy(parsed, `${rel} JSON-LD #${index + 1}`);
  }
}

function validateJsonLdUrls(value, label, keyPath = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateJsonLdUrls(item, label, [...keyPath, index]));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, data] of Object.entries(value)) {
    const nextPath = [...keyPath, key];
    if (typeof data === 'string' && isJsonLdUrlKey(key)) {
      if (data.startsWith('/') || /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?:[/:]|$)/i.test(data)) {
        problems.push(`${label} uses a non-production URL at ${nextPath.join('.')}: ${data}`);
      }
      if (/^http:\/\//i.test(data) && data.startsWith(`${SITE_ORIGIN.replace('https:', 'http:')}`)) {
        problems.push(`${label} uses http for production URL at ${nextPath.join('.')}: ${data}`);
      }
    }
    validateJsonLdUrls(data, label, nextPath);
  }
}

function validateJsonLdSchemaPolicy(value, label) {
  const items = Array.isArray(value) ? value : [value];
  for (const item of items) {
    const types = jsonLdTypes(item);
    if (types.includes('JobPosting')) {
      problems.push(`${label} contains JobPosting schema; job data is not verified enough for structured JobPosting output.`);
    }
    if (types.includes('Event') && !isRealSchemaDate(item.startDate)) {
      problems.push(`${label} contains Event schema without a real ISO startDate.`);
    }
  }
}

function validateTrustPlaceholders(rel, html) {
  if (!/^germany\/ja\/(?:terms|privacy|impressum|contact)\//.test(rel)) return;
  for (const term of ['Site Administrator', 'TODO', 'TBD', 'lorem ipsum']) {
    if (html.toLowerCase().includes(term.toLowerCase())) {
      problems.push(`${rel} contains placeholder-looking trust/legal text: ${term}`);
    }
  }
}

function validateStaticContentQuality(rel, url, html) {
  if (url === '/germany/ja/') validateHomeStaticQuality(rel, html);

  if (url === '/germany/ja/events/' || url === '/germany/ja/community/') {
    const initialMarkup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    if (/<h[1-6]\b[^>]*>\s*<\/h[1-6]>/i.test(initialMarkup)) {
      problems.push(`${rel} contains an empty heading in initial HTML.`);
    }
  }

  const requiredTexts = directoryStaticRequirements.get(url);
  if (!requiredTexts) return;

  for (const text of requiredTexts) {
    if (!html.includes(text)) problems.push(`${rel} missing visible static guidance/trust text: ${text}`);
  }

  if (/^\/germany\/ja\/(?:jobs|eat|shopping|medical)\/$/.test(url)) {
    if (/<div\b[^>]*id=["']cards["'][^>]*>\s*<\/div>/i.test(html)) {
      problems.push(`${rel} has an empty initial #cards container; public directory pages need static guidance before JavaScript runs.`);
    }
    const statusBox = extractElementById(html, 'statusBox');
    if (/^\s*(?:データを読み込んでいます|読み込み中)\.{0,3}\s*$/i.test(stripTags(statusBox))) {
      problems.push(`${rel} initial status box is loading-only instead of useful static guidance.`);
    }
  }
}

function validateInitialStateSafety(rel, url, html) {
  const initialText = stripTags(
    String(html || '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  ).replace(/\s+/g, ' ').trim();

  const blockedInitialCopy = new Map([
    ['/germany/ja/', ['掲示板の投稿を準備中です', '求人情報を確認中です', '求人データを確認中です']],
    ['/germany/ja/community/', ['最新データを取得できませんでした。保存済みの表示を継続しています。']],
    ['/germany/ja/jobs/', ['読み込み中...']],
    ['/germany/ja/jobs/detail/', ['求人情報を読み込んでいます', '指定された求人IDの内容を確認しています。']],
    ['/germany/ja/events/', ['ニュース解説を読み込み中です。', 'イベントを読み込み中です。', '日本語ニュース解説を準備中です', 'イベント情報を準備中です']],
    ['/germany/ja/eat/', ['静的ガイドを表示中']],
    ['/germany/ja/shopping/', ['静的ガイドを表示中']],
    ['/germany/ja/medical/', ['静的ガイドを表示中']],
    ['/germany/ja/living/', ['記事を読み込み中です。']],
    ['/germany/ja/learn-german/', ['このテーマの記事は準備中です。']],
    ['/germany/ja/learn-german/german-news-reading-guide/', ['ドイツ語ニュース素材を読み込み中です']],
  ]);

  for (const copy of blockedInitialCopy.get(url) || []) {
    if (initialText.includes(copy)) problems.push(`${rel} exposes transient or stale state copy in initial HTML: ${copy}`);
  }
}

function validateHomeStaticQuality(rel, html) {
  const eventsMarker = extractMarkedContent(html, 'home-events');
  if (!eventsMarker) {
    problems.push(`${rel} missing generated Home Events marker.`);
  } else {
    for (const pattern of staleHomeEventBadgePatterns) {
      if (pattern.test(eventsMarker)) problems.push(`${rel} contains stale Home event badge label: ${pattern}`);
    }
  }

  const jobsSection = extractSectionById(html, 'jobs');
  for (const text of [
    '掲載情報は掲載元の提供内容です。',
    '応募前に雇用条件、ビザ要件、連絡先をご確認ください。',
  ]) {
    if (!jobsSection.includes(text)) problems.push(`${rel} Home Jobs section missing trust copy: ${text}`);
  }

  const livingSection = extractSectionById(html, 'living');
  const livingCards = (livingSection.match(/class="portal3-card"/g) || []).length;
  if (livingCards < 5) problems.push(`${rel} Home Living section should contain at least 5 article cards.`);

  const latestDigest = extractMarkedContent(html, 'home-living');
  const latestRows = (latestDigest.match(/class="portal3-mini portal3-latest-mini"/g) || []).length;
  if (latestRows !== 3) problems.push(`${rel} Home latest digest should contain exactly 3 mixed-source rows.`);
  if (html.includes('<a class="portal3-panel-more" href="/germany/ja/living/">コンテンツ一覧へ</a>')) {
    problems.push(`${rel} Home latest digest should not render a top-right content list button.`);
  }
  if (/class="portal3-latest-date"[^>]*>[^<]*・/.test(latestDigest)) {
    problems.push(`${rel} Home latest digest date metadata should not repeat the source label.`);
  }
  for (const source of ['living', 'events', 'learn-german']) {
    if (!latestDigest.includes(`data-home-latest-source="${source}"`)) {
      problems.push(`${rel} Home latest digest missing ${source} row.`);
    }
  }
}

function extractMarkedContent(html, marker) {
  const start = `<!-- CONTENT:${marker}:start -->`;
  const end = `<!-- CONTENT:${marker}:end -->`;
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return '';
  return html.slice(startIndex + start.length, endIndex);
}

function extractSectionById(html, id) {
  const match = html.match(new RegExp(`<section\\b[^>]*id=["']${escapeRegExp(id)}["'][\\s\\S]*?<\\/section>`, 'i'));
  return match?.[0] || '';
}

function extractElementById(html, id) {
  const match = html.match(new RegExp(`<[^>]+\\bid=["']${escapeRegExp(id)}["'][^>]*>[\\s\\S]*?<\\/[^>]+>`, 'i'));
  return match?.[0] || '';
}

function stripTags(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function validateSitemap() {
  const sitemapPath = path.join(root, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    problems.push('Missing sitemap.xml.');
    return;
  }

  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const urls = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((match) => match[1].trim());
  const seen = new Set();
  for (const loc of urls) {
    if (seen.has(loc)) problems.push(`sitemap.xml contains duplicate URL: ${loc}`);
    seen.add(loc);

    if (!loc.startsWith(`${SITE_ORIGIN}${PRIMARY_JA_PATH}`)) {
      problems.push(`sitemap.xml URL should be a production JA URL: ${loc}`);
      continue;
    }

    const url = normalizeUrl(new URL(loc).pathname);
    const target = path.join(root, url.slice(1));
    if (!localTargetExists(target)) {
      problems.push(`sitemap.xml URL does not resolve locally: ${loc}`);
      continue;
    }

    const page = pagesByUrl.get(url);
    if (page && !shouldIndexHtml(url, page)) {
      problems.push(`sitemap.xml includes non-indexable registry page: ${url}`);
    }
  }
}

function fileToUrl(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  if (normalized === 'germany/ja/index.html') return '/germany/ja/';
  if (normalized.endsWith('/index.html')) return `/${normalized.slice(0, -'index.html'.length)}`;
  return `/${normalized}`;
}

function normalizeUrl(value) {
  const url = String(value || '').trim();
  if (!url || url === '/') return url || '';
  return url.endsWith('/') ? url : `${url}/`;
}

function absoluteUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}

function extractTitle(html) {
  return String(html || '').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
}

function extractMetaContent(html, attr, key) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*${attr}=["']${escapeRegExp(key)}["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>`, 'i');
  return String(html || '').match(pattern)?.[1]?.trim() || '';
}

function extractCanonical(html) {
  return String(html || '').match(/<link\b(?=[^>]*rel=["']canonical["'])(?=[^>]*href=["']([^"']*)["'])[^>]*>/i)?.[1]?.trim() || '';
}

function normalizeRobots(value) {
  return String(value || '').toLowerCase().replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();
}

function shouldIndexHtml(url, page) {
  if (page) return page.status === 'published' && (page.search_visible === true || page.sitemap_visible === true);
  return isArticleUrl(url, page);
}

function isArticleUrl(url, page) {
  if (page) return false;
  return /^\/germany\/ja\/(?:living|events|learn-german)\/.+\/$/.test(url);
}

function hreflangEntries(html) {
  const entries = [];
  for (const match of String(html || '').matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase().split(/\s+/) || [];
    if (!rel.includes('alternate')) continue;
    const lang = tag.match(/\bhreflang=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (!lang) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1]?.trim() || '';
    entries.push({ lang, href });
  }
  return entries;
}

function hasJsonLdType(html, type) {
  for (const match of String(html || '').matchAll(/<script\b(?=[^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      if (items.some((item) => jsonLdTypes(item).includes(type))) return true;
    } catch {
      return false;
    }
  }
  return false;
}

function jsonLdTypes(item) {
  const value = item?.['@type'];
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function isJsonLdUrlKey(key) {
  return /^(?:url|sameAs|image|logo|mainEntityOfPage|item|id|@id)$/i.test(key);
}

function isRealSchemaDate(value) {
  return /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(String(value || '').trim());
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDeferredArticleImageUrl(html, attrIndex, url) {
  if (!/^\/assets\/img\/(?:living|events|learn-german)\/[^"']+\.webp$/i.test(String(url || ''))) {
    return false;
  }

  const tagStart = html.lastIndexOf('<', attrIndex);
  const tagEnd = html.indexOf('>', attrIndex);
  if (tagStart === -1 || tagEnd === -1) return false;

  const tag = html.slice(tagStart, tagEnd + 1);
  return /\bdata-fallback-src=["']\/assets\/img\/placeholders\/jconnect-default-card\.webp["']/i.test(tag);
}

if (problems.length) {
  console.error(`Static-site validation failed with ${problems.length} issue(s):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Static-site validation passed: ${htmlFiles.length} HTML files checked.`);
