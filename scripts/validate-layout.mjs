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
const requiredPrimaryNavLinks = [
  '/germany/ja/',
  '/germany/ja/about/'
];
const requiredCategoryMainLinks = [
  '/germany/ja/community/',
  '/germany/ja/living/',
  '/germany/ja/jobs/',
  '/germany/ja/events/',
  '/germany/ja/learn-german/'
];
const requiredLivingSecondaryLinks = [
  '/germany/ja/eat/',
  '/germany/ja/shopping/',
  '/germany/ja/medical/'
];
const requiredCategoryLinks = [
  ...requiredCategoryMainLinks
];
const requiredFooterLinks = [
  '/germany/ja/',
  '/germany/ja/about/',
  '/germany/ja/living/',
  ...requiredCategoryMainLinks,
  '/germany/ja/jobs/posting/',
  '/germany/ja/contact/',
  '/germany/ja/terms/',
  '/germany/ja/privacy/',
  '/germany/ja/impressum/'
];
const forbiddenCategoryLinks = [
  ...requiredLivingSecondaryLinks,
  '/germany/ja/news/',
  '/germany/ja/about/'
];
const forbiddenPrimaryHeaderLinks = [
  ...requiredCategoryMainLinks,
  ...requiredLivingSecondaryLinks,
  '/germany/ja/news/'
];
const standardizedDirectoryListingUrls = new Set([
  '/germany/ja/eat/',
  '/germany/ja/shopping/',
  '/germany/ja/medical/',
  '/germany/ja/jobs/',
  '/germany/ja/community/'
]);

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
  validateProductionFixSharedAssets();
  validateEmailMigration();

  if (problems.length) {
    console.error(`Layout validation failed with ${problems.length} issue(s):`);
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }

  console.log(`Layout validation passed: ${htmlFiles.length} JA HTML pages and ${pages.length} registry routes checked.`);
}

function validateEmailMigration() {
  const productionRoots = ['germany', 'apps-script', 'assets', 'scripts'];
  const bannedFormEndpoint = ['form', 'spree.io'].join('');
  const bannedFormId = ['xlgo', 'jvar'].join('');
  const bannedGoogleTransport = new RegExp(`(?:Mail|Gmail)${['App', '.sendEmail'].join('')}`);
  const bannedPersonalMailbox = new RegExp(`@${['g', 'mail.com'].join('')}`, 'i');

  for (const productionRoot of productionRoots) {
    const directory = path.join(root, productionRoot);
    if (!fs.existsSync(directory)) continue;
    for (const file of walk(directory)) {
      if (!/\.(?:html|js|mjs|gs|css)$/i.test(file)) continue;
      const rel = toRelPath(file);
      const text = fs.readFileSync(file, 'utf8');
      for (const [label, pattern] of [
        ['removed form endpoint', bannedFormEndpoint],
        ['removed form identifier', bannedFormId],
        ['Google email transport', bannedGoogleTransport],
        ['personal mailbox domain', bannedPersonalMailbox]
      ]) {
        if (typeof pattern === 'string' ? text.toLowerCase().includes(pattern) : pattern.test(text)) {
          problems.push(`${rel} contains forbidden ${label}.`);
        }
      }
    }
  }
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

  const listingRoutes = [
    ['/germany/ja/jobs/', 'jobs'],
    ['/germany/ja/community/', 'community']
  ];

  for (const [url, pillar] of listingRoutes) {
    const page = pagesByUrl.get(url);
    if (!page) {
      problems.push(`${PAGE_REGISTRY_PATH} missing listing route: ${url}`);
      continue;
    }
    if (page.type !== 'listing' || page.pillar !== pillar) {
      problems.push(`${url} must be classified as type="listing", pillar="${pillar}".`);
    }
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
    const primaryNavBlock = extractClassedTagBlock(headerBlock, 'nav', 'header-nav') || headerBlock;
    const categoryDropdownBlock = extractClassedTagBlock(headerBlock, 'div', 'category-dropdown');
    if (!/<header\b[^>]*class=["'][^"']*\bsite-header\b/i.test(headerBlock)) {
      problems.push(`${rel} must use the canonical JA site-header template.`);
    }
    if (!/<script\b[^>]*src=["']\/assets\/js\/main\.js(?:\?[^"']*)?["'][^>]*>/i.test(html)) {
      problems.push(`${rel} must load /assets/js/main.js for shared header behavior.`);
    }
    for (const requiredLink of requiredPrimaryNavLinks) {
      if (!hasHref(primaryNavBlock, requiredLink)) {
        problems.push(`${rel} primary header missing required portal nav link: ${requiredLink}`);
      }
    }
    for (const forbiddenLink of forbiddenPrimaryHeaderLinks) {
      if (hasHref(primaryNavBlock, forbiddenLink)) {
        problems.push(`${rel} header contains secondary or legacy route in primary navigation: ${forbiddenLink}`);
      }
    }
    if (!categoryDropdownBlock) {
      problems.push(`${rel} header missing category dropdown.`);
    }
    for (const requiredLink of requiredCategoryLinks) {
      if (!hasHref(categoryDropdownBlock, requiredLink)) {
        problems.push(`${rel} category dropdown missing required link: ${requiredLink}`);
      }
    }
    for (const forbiddenLink of forbiddenCategoryLinks) {
      if (hasHref(categoryDropdownBlock, forbiddenLink)) {
        problems.push(`${rel} category dropdown contains non-primary category link: ${forbiddenLink}`);
      }
    }
  }

  if (footerBlock) {
    for (const requiredLink of requiredFooterLinks) {
      if (!hasHref(footerBlock, requiredLink)) {
        problems.push(`${rel} footer missing required link: ${requiredLink}`);
      }
    }
    for (const forbiddenLink of [...requiredLivingSecondaryLinks, '/germany/ja/community/post/']) {
      if (hasHref(footerBlock, forbiddenLink)) {
        problems.push(`${rel} footer contains removed hierarchy link: ${forbiddenLink}`);
      }
    }
    for (const requiredHeading of ['サイト', '主要カテゴリ', 'サポート・運営情報']) {
      if (!footerBlock.includes(requiredHeading)) {
        problems.push(`${rel} footer missing required group heading: ${requiredHeading}`);
      }
    }
    validateInternalLinks(footerBlock, rel, `${rel} footer`);
    if (!footerBlock.includes('mailto:contact@j-connect-global.com')) {
      problems.push(`${rel} footer must include the public J-Connect email address.`);
    }
  }

  if (/\bhref=["']#["']/i.test(html)) problems.push(`${rel} contains placeholder href="#".`);
  if (/\bportal3-header\b|\bportal3-footer\b|\bportal3-lang\b/i.test(html)) {
    problems.push(`${rel} contains legacy Home-only header/footer markup.`);
  }
  validateNoMojibake(html, rel);
  validateCanonical(html, page, rel);
  validateTitleAndDescription(html, rel);
  validateCssOrder(html, rel);
  validateInternalLinks(html, rel, rel);
  validateDirectoryListingPage(url, html, page, rel);
  validateProductionFixPage(url, html, rel);

  if (page?.canonical_url && page.status !== 'redirect') {
    const expected = absoluteUrl(page.canonical_url);
    const hrefs = canonicalHrefs(html);
    if (hrefs.length === 1 && hrefs[0] !== expected) {
      problems.push(`${rel} canonical href should be ${expected}, got ${hrefs[0]}`);
    }
  }
}

function validateDirectoryListingPage(url, html, page, rel) {
  if (page?.status !== 'published' || !standardizedDirectoryListingUrls.has(normalizeUrl(url))) return;

  if (/#f7f3ee/i.test(html)) {
    problems.push(`${rel} directory/listing page should not use old beige theme-color #f7f3ee.`);
  }

  for (const [className, label] of [
    ['jc-directory-hero', 'shared directory hero'],
    ['jc-control-panel', 'shared control panel'],
    ['jc-result-card', 'shared result card'],
    ['jc-result-grid', 'shared result grid']
  ]) {
    if (!html.includes(className)) {
      problems.push(`${rel} missing ${label} class: ${className}`);
    }
  }

  if (!html.includes('jc-empty-state') && !html.includes('jc-loading-state')) {
    problems.push(`${rel} missing shared empty/loading state class.`);
  }
}

function validateProductionFixPage(url, html, rel) {
  const normalizedUrl = normalizeUrl(url);

  const languageTriggerCount = (html.match(/class=["'][^"']*\bheader-language-trigger\b[^"']*["']/g) || []).length;
  if (languageTriggerCount > 1) {
    problems.push(`${rel} contains duplicate header language triggers.`);
  }

  if (['/germany/ja/jobs/', '/germany/ja/jobs/posting/', '/germany/ja/news/', '/germany/ja/events/'].includes(normalizedUrl) && /#f7f3ee/i.test(html)) {
    problems.push(`${rel} should not use old beige theme-color #f7f3ee.`);
  }

  const languageSelectGuardUrls = new Set([
    '/germany/ja/',
    '/germany/ja/community/',
    '/germany/ja/events/',
    '/germany/ja/news/',
    '/germany/ja/jobs/',
    '/germany/ja/jobs/posting/',
    '/germany/ja/jobs/detail/',
    '/germany/ja/jobs/sales-assistant-japanese-duesseldorf/',
    '/germany/ja/jobs/it-support-specialist-cologne/',
    '/germany/ja/jobs/accounting-staff-munich/'
  ]);
  if (languageSelectGuardUrls.has(normalizedUrl) && /id=["']languageSelect["']|languageSelect/i.test(html)) {
    problems.push(`${rel} contains legacy languageSelect wiring.`);
  }

  if (normalizedUrl === '/germany/ja/') {
    if (!html.includes('/assets/js/community-shared.js')) {
      problems.push(`${rel} must load shared Community post data for Home cards.`);
    }
    if (!html.includes('/assets/js/jobs-shared.js') || !html.includes('/assets/js/jobs-fallback.js')) {
      problems.push(`${rel} must load shared Jobs data/fallback helpers for Home Jobs cards.`);
    }
    if (!html.includes('id="homeCommunityCards"') || !html.includes('data-community-posts')) {
      problems.push(`${rel} must render Home Community cards from a data-marked container.`);
    }
    if (!html.includes('id="homeJobsCards"') || !html.includes('data-home-jobs')) {
      problems.push(`${rel} must render Home Jobs cards from a data-marked container.`);
    }
    if (!/buildDirectoryUrl\(\{\s*sheet:\s*dataSources\.directorySheets\.jobs/i.test(html)) {
      problems.push(`${rel} Home Jobs render path must use the shared jobs data source.`);
    }
    const newsSection = html.match(/<section\b[^>]*id=["']news-events["'][\s\S]*?<\/section>/i)?.[0] || '';
    if (!newsSection.includes('/germany/ja/events/')) {
      problems.push(`${rel} Home News/Events section must link primarily to /germany/ja/events/.`);
    }
    const sectionHead = newsSection.match(/<div class=["']portal3-section-head["'][\s\S]*?<\/div>\s*<div class=["']portal3-chips/i)?.[0] || '';
    if (/href=["']\/germany\/ja\/news\/["']/i.test(sectionHead)) {
      problems.push(`${rel} Home News/Events section head must not use /germany/ja/news/ as the primary link.`);
    }
  }

  if (normalizedUrl === '/germany/ja/community/') {
    if (!html.includes('/assets/js/community-shared.js')) {
      problems.push(`${rel} must load shared Community fallback data.`);
    }
    if (!/params\.get\(["']post["']\)/.test(html)) {
      problems.push(`${rel} must support ?post= Community deep links.`);
    }
    if (/console\.error\(["']Community posts load failed/i.test(html)) {
      problems.push(`${rel} should not emit console.error when Community GAS fallback is used.`);
    }
    validateCommunityPostTypeInference(html, rel);
  }

  if (normalizedUrl === '/germany/ja/events/') {
    if (!html.includes('id="life-updates"')) {
      problems.push(`${rel} Events hub must include the life updates/news section.`);
    }
    const hero = html.match(/<section class=["']jc-page-hero["'][\s\S]*?<\/section>/i)?.[0] || '';
    if (/href=["']\/germany\/ja\/news\/["']/i.test(hero)) {
      problems.push(`${rel} Events hero should not send the primary news/update action to /germany/ja/news/.`);
    }
  }

  if (normalizedUrl === '/germany/ja/news/') {
    if (/#f7f3ee/i.test(html)) problems.push(`${rel} should not use old beige theme-color #f7f3ee.`);
    if (/top-hero\.jpg/i.test(html)) problems.push(`${rel} should not use the old top-hero image.`);
    if (!html.includes('/germany/ja/events/')) problems.push(`${rel} should link back to the Events hub.`);
    if (!html.includes('/assets/css/news.css') || /<style\b/i.test(html)) {
      problems.push(`${rel} should use external news.css instead of inline legacy CSS.`);
    }
  }

  if (normalizedUrl === '/germany/ja/jobs/') {
    const postingLinks = html.match(/href=["']\/germany\/ja\/jobs\/posting\/["']/g) || [];
    if (postingLinks.length < 2) {
      problems.push(`${rel} Jobs index should expose /jobs/posting/ from both hero and results context.`);
    }
  }

  if (normalizedUrl === '/germany/ja/jobs/posting/') {
    for (const stale of ['#f7f3ee', 'top-hero.jpg', 'Sakura GmbH', 'For Companies']) {
      if (html.includes(stale)) problems.push(`${rel} contains stale Jobs posting marker: ${stale}`);
    }
    if (!html.includes('Publishing Flow') || !html.includes('posting-flow-grid')) {
      problems.push(`${rel} must include the production posting flow section.`);
    }
    if (!html.includes('directoryDataEndpoint') || !/name=["']action["']\s+value=["']submitJobPosting["']/i.test(html)) {
      problems.push(`${rel} must submit job posting requests to the J-Connect GAS endpoint.`);
    }
    if (!html.includes('/assets/css/jobs-posting.css')) {
      problems.push(`${rel} must load external jobs-posting.css.`);
    }
    const inlineStyleLength = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
      .reduce((total, match) => total + match[1].trim().length, 0);
    if (inlineStyleLength > 1200) {
      problems.push(`${rel} contains a large inline CSS block; move page styles to jobs-posting.css.`);
    }
  }

  if (normalizedUrl === '/germany/ja/contact/') {
    if (!html.includes('directoryDataEndpoint') || !/name=["']action["']\s+value=["']submitContact["']/i.test(html)) {
      problems.push(`${rel} must submit contact requests to the J-Connect GAS endpoint.`);
    }
    if (!html.includes('mailto:contact@j-connect-global.com')) {
      problems.push(`${rel} must publish the public J-Connect email address.`);
    }
  }

  if (
    normalizedUrl === '/germany/ja/jobs/detail/' ||
    /^\/germany\/ja\/jobs\/(sales-assistant-japanese-duesseldorf|it-support-specialist-cologne|accounting-staff-munich)\/$/.test(normalizedUrl)
  ) {
    if (!html.includes('/germany/ja/jobs/posting/')) {
      problems.push(`${rel} job detail page should include a secondary employer posting CTA.`);
    }
  }
}

function validateCommunityPostTypeInference(html, rel) {
  const subcategoryOptions = html.match(/const SUBCATEGORY_OPTIONS = (\{[\s\S]*?\n    \});/)?.[1];
  const snippets = [
    subcategoryOptions && `const SUBCATEGORY_OPTIONS = ${subcategoryOptions};`,
    extractFunction(html, 'normalize'),
    extractFunction(html, 'normalizeExplicitPostType'),
    extractFunction(html, 'validPostType'),
    extractFunction(html, 'inferPostType'),
    `
      const cases = [
        {
          label: 'explicit category1 beats purchased body text',
          post: { category1: '譲ります', body: '昨日購入しました。無料でお譲りします。' },
          expected: '譲ります'
        },
        {
          label: 'explicit buy category is preserved',
          post: { category1: '買います', title: '買います' },
          expected: '買います'
        },
        {
          label: 'legacy giveaway fallback',
          post: { body: '無料で差し上げます。' },
          expected: '譲ります'
        },
        {
          label: 'purchased alone is not buy intent',
          post: { body: '昨日購入しました。使い方について質問です。' },
          expected: '質問'
        }
      ];

      for (const item of cases) {
        const actual = inferPostType(item.post);
        if (actual !== item.expected) {
          throw new Error(\`\${item.label}: expected \${item.expected}, got \${actual}\`);
        }
      }
    `
  ];

  if (snippets.some((snippet) => !snippet)) {
    problems.push(`${rel} Community post type inference regression check could not find required script blocks.`);
    return;
  }

  try {
    vm.runInNewContext(snippets.join('\n'), {}, { timeout: 1000 });
  } catch (error) {
    problems.push(`${rel} Community post type inference regression failed: ${error.message}`);
  }
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start === -1) return '';
  const bodyStart = source.indexOf('{', start);
  if (bodyStart === -1) return '';

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return '';
}

function validateProductionFixSharedAssets() {
  const sharedCommunityPath = path.join(root, 'assets/js/community-shared.js');
  if (!fs.existsSync(sharedCommunityPath)) {
    problems.push('assets/js/community-shared.js is required for shared Community fallback posts.');
  } else {
    const sharedCommunity = fs.readFileSync(sharedCommunityPath, 'utf8');
    if (!sharedCommunity.includes('fallbackPosts') || !sharedCommunity.includes('communityDetailHref')) {
      problems.push('assets/js/community-shared.js must expose fallbackPosts and communityDetailHref.');
    }
    for (const imageField of ['photos', 'images', 'image_urls', 'image_url', 'thumbnail_url', 'photo_url', 'first_image']) {
      if (!sharedCommunity.includes(imageField)) {
        problems.push(`assets/js/community-shared.js must support image field: ${imageField}`);
      }
    }
    if (!sharedCommunity.includes('firstImage')) {
      problems.push('assets/js/community-shared.js must expose firstImage support for Home Community cards.');
    }
  }

  const sharedJobsPath = path.join(root, 'assets/js/jobs-shared.js');
  if (!fs.existsSync(sharedJobsPath)) {
    problems.push('assets/js/jobs-shared.js is required for Home Jobs shared rendering.');
  } else {
    const sharedJobs = fs.readFileSync(sharedJobsPath, 'utf8');
    for (const expected of ['normalizeJob', 'activeJobs', 'getJobDetailPath', 'getSalaryLabel']) {
      if (!sharedJobs.includes(expected)) {
        problems.push(`assets/js/jobs-shared.js must expose ${expected}.`);
      }
    }
  }

  for (const relPath of ['assets/css/site.css', 'assets/css/jconnect-ui.css']) {
    const css = fs.readFileSync(path.join(root, relPath), 'utf8');
    const footerLogoRule = css.match(/\.footer-logo\s*\{[\s\S]*?\}/g)?.join('\n') || '';
    if (!/background:\s*#fff/i.test(footerLogoRule) || !/border-radius:\s*8px/i.test(footerLogoRule) || !/padding:\s*6px\s+8px/i.test(footerLogoRule)) {
      problems.push(`${relPath} must keep the footer logo readable with a white backplate.`);
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

function extractClassedTagBlock(html, tag, className) {
  const pattern = new RegExp(`<${tag}\\b[^>]*class=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/${tag}>`, 'i');
  return html.match(pattern)?.[0] || '';
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
    .filter((match) => !isDeferredArticleImageUrl(html, match.index, match[1]))
    .map((match) => match[1])
    .filter((href) => !/^(https?:|mailto:|tel:|javascript:|data:)/i.test(href))
    .map((href) => href.split('#')[0].split('?')[0])
    .filter(Boolean);
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
