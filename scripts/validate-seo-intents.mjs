import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const origin = 'https://j-connect-global.com';
const intentsPath = 'content/seo-intents.json';
const pagesPath = 'content/registry/pages.json';
const sitemapPath = 'sitemap.xml';
const problems = [];

const intents = readJson(intentsPath);
const pages = readJson(pagesPath);
const pagesByUrl = new Map(pages.map((page) => [normalizeUrl(page.url), page]));
const sitemap = fs.readFileSync(path.join(root, sitemapPath), 'utf8');
const sitemapUrls = new Set(
  [...sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((match) => match[1].trim())
);
const seenUrls = new Set();
const seenQueries = new Set();

if (!Array.isArray(intents) || !intents.length) {
  problems.push(`${intentsPath} must contain a non-empty array.`);
} else {
  for (const [index, intent] of intents.entries()) validateIntent(intent, index);
}

if (problems.length) {
  console.error('SEO intent validation failed:');
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exitCode = 1;
} else {
  console.log(`SEO intent validation passed: ${intents.length} distinct search intents have aligned titles, content, canonicals, and sitemap entries.`);
}

function validateIntent(intent, index) {
  const label = `${intentsPath}[${index}]`;
  const url = normalizeUrl(intent?.url);
  const query = String(intent?.primary_query || '').trim();
  const titleTerms = toTerms(intent?.title_terms);
  const contentTerms = toTerms(intent?.content_terms);

  if (!url) problems.push(`${label} missing url.`);
  if (seenUrls.has(url)) problems.push(`${label} duplicates url ${url}.`);
  seenUrls.add(url);

  if (!query) problems.push(`${label} missing primary_query.`);
  if (seenQueries.has(query.toLowerCase())) problems.push(`${label} duplicates primary_query "${query}".`);
  seenQueries.add(query.toLowerCase());

  if (!titleTerms.length) problems.push(`${label} must define title_terms.`);
  if (!contentTerms.length) problems.push(`${label} must define content_terms.`);

  const page = pagesByUrl.get(url);
  if (!page) {
    problems.push(`${label} is not governed by ${pagesPath}: ${url}`);
    return;
  }
  if (page.status !== 'published' || page.sitemap_visible !== true) {
    problems.push(`${label} target must be a published, sitemap-visible page: ${url}`);
  }

  const file = fileForUrl(url);
  if (!fs.existsSync(file)) {
    problems.push(`${label} target HTML is missing: ${url}`);
    return;
  }
  const html = fs.readFileSync(file, 'utf8');
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
  const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1 = h1Matches.map((match) => stripHtml(match[1])).join(' ');
  const description = metaValue(html, 'name', 'description');
  const searchableText = stripHtml(`${title} ${description} ${h1} ${html}`);
  const canonical = linkValue(html, 'canonical');
  const robots = metaValue(html, 'name', 'robots').toLowerCase().replace(/\s+/g, '');
  const absolute = `${origin}${url}`;

  if (h1Matches.length !== 1) problems.push(`${label} target must contain exactly one H1: ${url}`);
  for (const term of titleTerms) {
    if (!title.includes(term)) problems.push(`${label} title is missing "${term}": ${url}`);
  }
  for (const term of contentTerms) {
    if (!searchableText.includes(term)) problems.push(`${label} content is missing "${term}": ${url}`);
  }
  if (canonical !== absolute) problems.push(`${label} canonical must be ${absolute}, got ${canonical || '(missing)'}.`);
  if (robots !== 'index,follow') problems.push(`${label} target must use robots "index, follow": ${url}`);
  if (!sitemapUrls.has(absolute)) problems.push(`${label} target is missing from sitemap.xml: ${absolute}`);
}

function readJson(relative) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
  } catch (error) {
    problems.push(`Unable to read ${relative}: ${error.message}`);
    return [];
  }
}

function fileForUrl(url) {
  if (url === '/') return path.join(root, 'index.html');
  return path.join(root, url.replace(/^\/+/, ''), 'index.html');
}

function normalizeUrl(value) {
  const url = String(value || '').trim();
  if (!url || url === '/') return url;
  return url.endsWith('/') ? url : `${url}/`;
}

function toTerms(value) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function metaValue(html, attributeName, expectedValue) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const name = tag.match(new RegExp(`\\b${attributeName}=["']([^"']+)["']`, 'i'))?.[1] || '';
    if (name.toLowerCase() !== expectedValue.toLowerCase()) continue;
    return tag.match(/\bcontent=["']([^"']*)["']/i)?.[1]?.trim() || '';
  }
  return '';
}

function linkValue(html, rel) {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rels = tag.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase().split(/\s+/) || [];
    if (!rels.includes(rel)) continue;
    return tag.match(/\bhref=["']([^"']*)["']/i)?.[1]?.trim() || '';
  }
  return '';
}
