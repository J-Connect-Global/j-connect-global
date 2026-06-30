import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = process.cwd();
const scriptPath = path.relative(root, fileURLToPath(import.meta.url));

const requiredPages = [
  '/germany/ja/',
  '/germany/ja/about/',
  '/germany/ja/contact/',
  '/germany/ja/news/',
  '/germany/ja/events/',
  '/germany/ja/guides/',
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
  '/germany/ja/community/report/',
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
const htmlFiles = [];
const textFiles = [];
const problems = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
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

  const faviconLinks = html.match(/<link\b[^>]*rel=["']icon["'][^>]*href=["']\/assets\/images\/brand\/favicon\.png["'][^>]*>/gi) || [];
  for (const link of faviconLinks) {
    if (!/\btype=["']image\/png["']/i.test(link)) {
      problems.push(`Incorrect favicon MIME type in ${rel}: ${link}`);
    }
  }

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

function isDeferredArticleImageUrl(html, attrIndex, url) {
  if (!/^\/assets\/img\/(?:living|events|learn-german)\/[^"']+\.webp$/i.test(String(url || ''))) {
    return false;
  }

  const tagStart = html.lastIndexOf('<', attrIndex);
  const tagEnd = html.indexOf('>', attrIndex);
  if (tagStart === -1 || tagEnd === -1) return false;

  const tag = html.slice(tagStart, tagEnd + 1);
  return /\bdata-fallback-src=["']\/assets\/img\/placeholders\/jconnect-article-placeholder\.svg["']/i.test(tag);
}

if (problems.length) {
  console.error(`Static-site validation failed with ${problems.length} issue(s):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Static-site validation passed: ${htmlFiles.length} HTML files checked.`);
