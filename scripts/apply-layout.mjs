import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE_REGISTRY_PATH = 'content/registry/pages.json';

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
    const nextHtml = page?.layout === 'home'
      ? applyHomeMarkers(html)
      : applyCanonicalLayout(html, url, page);

    if (nextHtml !== html) {
      fs.writeFileSync(file, nextHtml, 'utf8');
      changedCount += 1;
    }
  }

  console.log(`Layout application complete: ${changedCount} JA HTML file(s) updated.`);
}

function applyHomeMarkers(html) {
  let next = html;
  next = preserveExistingLayoutBlock(next, 'ja-header', 'header');
  next = preserveExistingLayoutBlock(next, 'ja-footer', 'footer');
  return next;
}

function applyCanonicalLayout(html, url, page) {
  const pillar = activePillar(url, page);
  const currentUrl = page?.status === 'legacy' && page.redirect_target ? normalizeUrl(page.redirect_target) : url;
  let next = html;
  next = replaceLayoutBlock(next, 'ja-header', renderHeader(pillar, currentUrl), 'header');
  next = replaceLayoutBlock(next, 'ja-footer', readLayoutTemplate('ja-footer'), 'footer');
  return next;
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

function preserveExistingLayoutBlock(html, marker, tag) {
  if (html.includes(`<!-- LAYOUT:${marker}:start -->`) && html.includes(`<!-- LAYOUT:${marker}:end -->`)) {
    return html;
  }

  const tagPattern = new RegExp(`(^[ \\t]*)<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'im');
  const tagMatch = html.match(tagPattern);
  if (!tagMatch || tagMatch.index === undefined) {
    throw new Error(`Unable to find Home <${tag}> block for layout marker ${marker}`);
  }

  const block = wrapLayoutBlock(marker, tagMatch[0].trim(), tagMatch[1] || '');
  return `${html.slice(0, tagMatch.index)}${block}${html.slice(tagMatch.index + tagMatch[0].length)}`;
}

function renderHeader(activeType, currentUrl) {
  const active = (type) => activeType === type ? ' class="active" aria-current="page"' : '';
  return fillTemplate(readLayoutTemplate('ja-header'), {
    active_community: active('community'),
    active_living: active('living'),
    active_jobs: active('jobs'),
    active_events: active('events'),
    active_learn_german: active('learn-german'),
    current_url: escapeAttribute(currentUrl)
  });
}

function activePillar(url, page) {
  if (page?.status === 'legacy' && page.redirect_target) return activePillar(normalizeUrl(page.redirect_target), null);
  if (['community', 'living', 'jobs', 'events', 'learn-german'].includes(page?.pillar)) return page.pillar;
  if (url.startsWith('/germany/ja/community/')) return 'community';
  if (url.startsWith('/germany/ja/living/')) return 'living';
  if (url.startsWith('/germany/ja/jobs/')) return 'jobs';
  if (url.startsWith('/germany/ja/events/')) return 'events';
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

function escapeAttribute(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#096;');
}

main();
