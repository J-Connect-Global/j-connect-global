import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE_REGISTRY_PATH = 'content/registry/pages.json';
const SITE_ORIGIN = 'https://j-connect-global.com';
const DEFAULT_SOCIAL_IMAGE = '/assets/images/brand/logo_header.png';
const SOCIAL_SHARE_CSS = '/assets/css/social-share.css';
const SOCIAL_SHARE_JS = '/assets/js/social-share.js';

function main() {
  const pages = readJson(PAGE_REGISTRY_PATH);
  const pagesByUrl = new Map(pages.map((page) => [normalizeUrl(page.url), page]));
  const htmlFiles = walk(path.join(root, 'germany/ja')).filter((file) => file.endsWith('.html'));
  let changedCount = 0;

  for (const file of htmlFiles) {
    const relPath = toRelPath(file);
    const url = fileToUrl(relPath);
    const page = pagesByUrl.get(url);
    const html = fs.readFileSync(file, 'utf8');
    const nextHtml = applyCanonicalLayout(html, url, page);

    if (nextHtml !== html) {
      fs.writeFileSync(file, nextHtml, 'utf8');
      changedCount += 1;
    }
  }

  console.log(`Layout application complete: ${changedCount} JA HTML file(s) updated.`);
}

function applyCanonicalLayout(html, url, page) {
  const pillar = activePillar(url, page);
  const currentUrl = page?.status === 'legacy' && page.redirect_target ? normalizeUrl(page.redirect_target) : url;
  let next = html;
  next = ensureHeaderFooterStylesheet(next);
  next = ensureSocialShareStylesheet(next);
  next = ensureStaticSocialMeta(next, currentUrl, page);
  next = replaceLayoutBlock(next, 'ja-header', renderHeader(pillar, currentUrl), 'header');
  next = replaceLayoutBlock(next, 'ja-footer', readLayoutTemplate('ja-footer'), 'footer');
  next = ensureMainScript(next);
  next = ensureSocialShareScript(next);
  return next;
}

function ensureHeaderFooterStylesheet(html) {
  const stylesheetHref = '/assets/css/ja-header-footer.css?v=portal5-nav-20260618';
  const stylesheetLink = `  <link rel="stylesheet" href="${stylesheetHref}">`;

  // Remove any existing ja-header-footer.css link first, regardless of position/version.
  let next = html.replace(
    /\s*<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/css\/ja-header-footer\.css(?:\?[^"']*)?["']\s*\/?>\s*/g,
    '\n'
  );

  // Preferred order:
  // 1. site.css
  // 2. ja-header-footer.css
  // 3. jconnect-ui.css
  const jconnectUiLink = /(\s*<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/css\/jconnect-ui\.css(?:\?[^"']*)?["']\s*\/?>)/;

  if (jconnectUiLink.test(next)) {
    return next.replace(jconnectUiLink, `\n${stylesheetLink}$1`);
  }

  const siteCssLink = /(\s*<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/css\/site\.css(?:\?[^"']*)?["']\s*\/?>)/;

  if (siteCssLink.test(next)) {
    return next.replace(siteCssLink, `$1\n${stylesheetLink}`);
  }

  return next.replace('</head>', `${stylesheetLink}\n</head>`);
}

function ensureSocialShareStylesheet(html) {
  const stylesheetLink = `  <link rel="stylesheet" href="${SOCIAL_SHARE_CSS}">`;
  let next = html.replace(
    /\s*<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/css\/social-share\.css(?:\?[^"']*)?["']\s*\/?>\s*/g,
    '\n'
  );

  const cookieCssLink = /(\s*<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/css\/cookie-consent\.css(?:\?[^"']*)?["']\s*\/?>)/;
  if (cookieCssLink.test(next)) {
    return next.replace(cookieCssLink, `$1\n${stylesheetLink}`);
  }

  const jconnectUiLink = /(\s*<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/css\/jconnect-ui\.css(?:\?[^"']*)?["']\s*\/?>)/;
  if (jconnectUiLink.test(next)) {
    return next.replace(jconnectUiLink, `$1\n${stylesheetLink}`);
  }

  return next.replace('</head>', `${stylesheetLink}\n</head>`);
}

function ensureMainScript(html) {
  if (/<script\b[^>]*src=["']\/assets\/js\/main\.js(?:\?[^"']*)?["'][^>]*>/i.test(html)) return html;
  return html.replace(/(\s*)<\/body>/i, `\n<script src="/assets/js/main.js"></script>$1</body>`);
}

function ensureSocialShareScript(html) {
  if (/<script\b[^>]*src=["']\/assets\/js\/social-share\.js(?:\?[^"']*)?["'][^>]*>/i.test(html)) return html;
  return html.replace(/(\s*)<\/body>/i, `\n<script src="${SOCIAL_SHARE_JS}"></script>$1</body>`);
}

function ensureStaticSocialMeta(html, url, page) {
  if (!page || !['published', 'legacy'].includes(page.status)) return html;

  const meta = pageSocialMeta(html, url, page);
  const block = renderSocialMeta(meta, 2);
  const names = [
    'og:title',
    'og:description',
    'og:url',
    'og:image',
    'og:type',
    'og:site_name',
    'og:locale',
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image'
  ];
  const pattern = new RegExp(`\\s*<meta\\b(?=[^>]*(?:property|name)=["'](?:${names.map(escapeRegExp).join('|')})["'])[^>]*>\\s*`, 'gi');
  let next = html.replace(pattern, '\n');

  const canonicalPattern = /(\s*<link\s+rel=["']canonical["'][^>]*>)/i;
  if (canonicalPattern.test(next)) {
    return next.replace(canonicalPattern, `$1\n${block}`);
  }

  const descriptionPattern = /(\s*<meta\s+name=["']description["'][^>]*>)/i;
  if (descriptionPattern.test(next)) {
    return next.replace(descriptionPattern, `$1\n${block}`);
  }

  return next.replace('</head>', `${block}\n</head>`);
}

function pageSocialMeta(html, url, page) {
  const title = cleanTitle(
    page.id === 'page-community-post'
      ? '交流・掲示板の投稿 | J-Connect Germany'
      : extractTitle(html) || formatPageTitle(page.title)
  );
  const description = cleanTitle(
    page.id === 'page-community-post'
      ? 'ドイツ在住日本人向けの交流掲示板投稿ページです。投稿詳細はページ読み込み後に表示されます。'
      : extractMetaContent(html, 'description') || page.description || 'J-Connect Germanyのページです。'
  );
  const canonical = extractCanonical(html) || absoluteUrl(page.canonical_url || url);

  return {
    title,
    description,
    url: canonical,
    image: absoluteUrl(page.og_image || page.image || DEFAULT_SOCIAL_IMAGE),
    type: page.type === 'article' ? 'article' : 'website'
  };
}

function renderSocialMeta(meta, spaces) {
  const tags = [
    ['property', 'og:title', meta.title],
    ['property', 'og:description', meta.description],
    ['property', 'og:url', meta.url],
    ['property', 'og:image', meta.image],
    ['property', 'og:type', meta.type],
    ['property', 'og:site_name', 'J-Connect Germany'],
    ['property', 'og:locale', 'ja_JP'],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', meta.title],
    ['name', 'twitter:description', meta.description],
    ['name', 'twitter:image', meta.image]
  ];

  return tags
    .map(([attr, key, content]) => `${' '.repeat(spaces)}<meta ${attr}="${key}" content="${escapeAttribute(content)}">`)
    .join('\n');
}

function replaceLayoutBlock(html, marker, replacement, tag) {
  const markerPattern = new RegExp(`(^[ \\t]*)<!-- LAYOUT:${marker}:start -->[\\s\\S]*?<!-- LAYOUT:${marker}:end -->`, 'm');
  const markerMatch = html.match(markerPattern);
  if (markerMatch && markerMatch.index !== undefined) {
    const block = wrapLayoutBlock(marker, replacement, markerMatch[1] || '');
    return `${html.slice(0, markerMatch.index)}${block}${html.slice(markerMatch.index + markerMatch[0].length)}`;
  }

  const tagPattern = new RegExp(`(^[ \\t]*)<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'im');
  const tagMatch = html.match(tagPattern);
  if (!tagMatch || tagMatch.index === undefined) {
    throw new Error(`Unable to find <${tag}> block for layout marker ${marker}`);
  }

  const block = wrapLayoutBlock(marker, replacement, tagMatch[1] || '');
  return `${html.slice(0, tagMatch.index)}${block}${html.slice(tagMatch.index + tagMatch[0].length)}`;
}

function renderHeader(activeType, currentUrl) {
  const active = (type) => activeType === type ? ' class="active" aria-current="page"' : '';
  return fillTemplate(readLayoutTemplate('ja-header'), {
    active_home: active('home'),
    active_about: active('about'),
    active_community: active('community'),
    active_living: active('living'),
    active_jobs: active('jobs'),
    active_events: active('events'),
    active_learn_german: active('learn-german'),
    active_eat: active('eat'),
    active_shopping: active('shopping'),
    active_medical: active('medical'),
    current_url: escapeAttribute(currentUrl)
  });
}

function activePillar(url, page) {
  if (page?.status === 'legacy' && page.redirect_target) return activePillar(normalizeUrl(page.redirect_target), null);
  if (url === '/germany/ja/') return 'home';
  if (url.startsWith('/germany/ja/about/')) return 'about';
  if (['community', 'living', 'jobs', 'events', 'learn-german'].includes(page?.pillar)) return page.pillar;
  if (url.startsWith('/germany/ja/community/')) return 'community';
  if (url.startsWith('/germany/ja/living/')) return 'living';
  if (url.startsWith('/germany/ja/eat/')) return 'living';
  if (url.startsWith('/germany/ja/shopping/')) return 'living';
  if (url.startsWith('/germany/ja/medical/')) return 'living';
  if (url.startsWith('/germany/ja/guides/')) return 'living';
  if (url.startsWith('/germany/ja/jobs/')) return 'jobs';
  if (url.startsWith('/germany/ja/events/')) return 'events';
  if (url.startsWith('/germany/ja/news/')) return 'events';
  if (url.startsWith('/germany/ja/learn-german/')) return 'learn-german';
  return '';
}

function wrapLayoutBlock(marker, html, indent = '') {
  const content = html.trim().split('\n').map((line) => `${indent}${line}`).join('\n');
  return `${indent}<!-- LAYOUT:${marker}:start -->\n${content}\n${indent}<!-- LAYOUT:${marker}:end -->`;
}

function readLayoutTemplate(name) {
  return fs.readFileSync(path.join(root, 'templates/layout', `${name}.html`), 'utf8');
}

function fillTemplate(template, values) {
  return template.replace(/\{\{([a-z0-9_]+)\}\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) return match;
    return values[key];
  });
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

function toRelPath(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
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

function formatPageTitle(title) {
  const text = cleanTitle(title);
  if (!text || text === 'J-Connect Germany') return 'J-Connect Germany';
  return text.includes('J-Connect Germany') ? text : `${text} | J-Connect Germany`;
}

function cleanTitle(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function extractTitle(html) {
  const match = String(html || '').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanTitle(match[1]) : '';
}

function extractMetaContent(html, name) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*name=["']${escapeRegExp(name)}["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>`, 'i');
  const match = String(html || '').match(pattern);
  return match ? match[1] : '';
}

function extractCanonical(html) {
  const match = String(html || '').match(/<link\b(?=[^>]*rel=["']canonical["'])(?=[^>]*href=["']([^"']*)["'])[^>]*>/i);
  return match ? match[1] : '';
}

function escapeAttribute(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#096;');
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();
