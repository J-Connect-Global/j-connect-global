import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontMatter } from './sync-content-frontmatter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const livingDir = path.join(root, 'content', 'living');
const routeData = JSON.parse(read('data/tourism-route-overviews.json'));
const livingRegistry = JSON.parse(read('content/registry/living.json'));
const routeSlugs = new Set(routeData.routes.map((route) => route.slug));

const articles = fs.readdirSync(livingDir)
  .filter((name) => name.endsWith('.md'))
  .map((name) => {
    const markdown = fs.readFileSync(path.join(livingDir, name), 'utf8');
    return { name, markdown, meta: parseFrontMatter(markdown), body: stripFrontmatter(markdown) };
  })
  .filter((article) => article.meta.category === '観光');

assert(articles.length === routeData.routes.length, `Tourism content (${articles.length}) and route data (${routeData.routes.length}) must match`);
assert(articles.length === 20, `The reviewed baseline contains 20 tourism articles; found ${articles.length}`);

const registrySlugs = new Set(livingRegistry.filter((item) => item.category === '観光').map((item) => item.slug));
const contentSlugs = new Set(articles.map((article) => article.meta.slug));
assertSameSet(contentSlugs, registrySlugs, 'tourism content and living registry');
assertSameSet(contentSlugs, routeSlugs, 'tourism content and route data');

for (const article of articles) {
  const { slug } = article.meta;
  const routeSrc = `/assets/images/living/routes/${slug}-route-overview.svg`;
  const routeMatches = article.body.match(new RegExp(escapeRegExp(routeSrc), 'g')) || [];
  assert(routeMatches.length === 1, `${slug}: expected one route overview in Markdown`);
  assert(article.body.indexOf(routeSrc) / article.body.length <= 0.25, `${slug}: route overview must be within the first 25% of the body`);

  for (const suffix of ['-route-overview.svg', '-route-overview-mobile.svg']) {
    const relative = `assets/images/living/routes/${slug}${suffix}`;
    const svg = read(relative);
    assert(/<svg\b[^>]*\bwidth="\d+"[^>]*\bheight="\d+"[^>]*\bviewBox="0 0 \d+ \d+"/i.test(svg), `${relative}: missing safe intrinsic dimensions/viewBox`);
    assert(/<title\b[^>]*>[^<]+<\/title>/i.test(svg), `${relative}: missing title`);
    assert(/<desc\b[^>]*>[^<]+<\/desc>/i.test(svg), `${relative}: missing desc`);
    assert(!/<script\b|<foreignObject\b|\b(?:href|xlink:href)=["']https?:|data:image|base64/i.test(svg), `${relative}: contains prohibited active or external content`);
  }

  const headings = [...article.body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  assert(headings.filter((heading) => heading === 'まとめ').length === 1, `${slug}: expected exactly one まとめ heading`);
  assert(headings.at(-1) === 'まとめ', `${slug}: まとめ must be the final h2`);
  assert(!headings.some((heading) => /失敗|ミス/.test(heading)), `${slug}: blame-oriented heading remains`);
  assert(!headings.includes('関連記事'), `${slug}: standalone related articles heading remains`);
  assert(article.body.includes('/germany/ja/living/germany-train-travel-guide/#'), `${slug}: missing contextual train guide anchor`);
  assert(article.body.includes('/germany/ja/learn-german/travel-german-phrases/#'), `${slug}: missing contextual travel German anchor`);
  assert((article.body.match(/\]\(\/germany\/ja\//g) || []).length >= 3, `${slug}: expected at least three contextual internal links`);
  assert((article.body.match(/\*\*確認手順\*\*/g) || []).length >= 2, `${slug}: expected at least two major official verification procedures`);

  const htmlRel = `germany/ja/living/${slug}/index.html`;
  const html = read(htmlRel);
  assert(html.includes(`<source media="(max-width: 600px)" srcset="/assets/images/living/routes/${slug}-route-overview-mobile.svg">`), `${slug}: generated HTML does not use mobile SVG source`);
  assert(new RegExp(`<img src="${escapeRegExp(routeSrc)}"[^>]*width="820"[^>]*height="520"`).test(html), `${slug}: generated HTML lacks SVG intrinsic dimensions`);
  assert(count(html, 'class="article-sidebar-card article-sidebar-toc"') === 1, `${slug}: desktop sidebar TOC count is not one`);
  assert(count(html, 'class="article-mobile-toc"') === 1, `${slug}: mobile collapsible TOC count is not one`);
  const articleBody = html.match(/<div class="article-body">([\s\S]*?)<\/article>/)?.[1] || '';
  assert(!/article-(?:sidebar|mobile)-toc/.test(articleBody), `${slug}: duplicate TOC found in central article column`);
  assert(html.includes('href="#位置関係と基本ルート"'), `${slug}: route heading missing from TOC`);
  assert(html.includes('href="#まとめ"'), `${slug}: summary heading missing from TOC`);
  const summaryIndex = html.indexOf('id="まとめ"');
  const officialIndex = html.indexOf('class="related-section official-source-section"');
  const relatedIndex = html.indexOf('<h3>関連記事</h3>');
  assert(summaryIndex >= 0 && officialIndex > summaryIndex, `${slug}: generated official sources must follow the summary`);
  assert(relatedIndex < 0 || relatedIndex > officialIndex, `${slug}: related articles must follow official sources`);
}

const css = read('assets/css/jconnect-ui.css');
assert(/\.related-section ul,[\s\S]*?\.official-source-section ul[\s\S]*?padding-inline-start:/m.test(css), 'Related/official lists need explicit inline padding');
assert(/\.related-section li \+ li,[\s\S]*?\.official-source-section li \+ li[\s\S]*?margin-top:/m.test(css), 'Related/official list items need explicit spacing');

for (const relative of ['content/living/germany-train-travel-guide.md', 'content/learn-german/travel-german-phrases.md']) {
  assert(fs.existsSync(path.join(root, relative)), `Missing shared guide: ${relative}`);
}

console.log(`Tourism usability validation passed for ${articles.length} articles and ${articles.length * 2} responsive SVGs.`);

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function stripFrontmatter(markdown) {
  return String(markdown).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function assertSameSet(left, right, label) {
  const missing = [...left].filter((value) => !right.has(value));
  const extra = [...right].filter((value) => !left.has(value));
  assert(!missing.length && !extra.length, `${label} differ; missing=${missing.join(',') || '-'} extra=${extra.join(',') || '-'}`);
}

function count(value, token) {
  return value.split(token).length - 1;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
