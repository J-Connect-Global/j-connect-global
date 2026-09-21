import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadArticlePhotoCredits } from './article-photo-credits.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const credits = loadArticlePhotoCredits(root);
const photos = new Set(credits.values());
const seen = new Set();
let articleCount = 0;
let photoCount = 0;

for (const file of credits.keys()) {
  assert.ok(fs.existsSync(path.join(root, file)), `Missing credited photo: ${file}`);
}

for (const file of walk(path.join(root, 'germany', 'ja'))) {
  if (!file.endsWith('.html')) continue;
  const html = fs.readFileSync(file, 'utf8');
  const article = html.match(/<article class="article-content-shell">([\s\S]*?)<\/article>/)?.[1];
  if (!article) continue;
  articleCount += 1;
  const label = path.relative(root, file);
  const images = [...article.matchAll(/<img\b[^>]*?\ssrc="([^"]+)"[^>]*>/g)]
    .filter(([, src]) => credits.has(src));
  let creditedFigures = 0;
  for (const [, figure] of article.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/g)) {
    const src = figure.match(/<img\b[^>]*?\ssrc="([^"]+)"/)?.[1];
    const credit = credits.get(src);
    if (!credit) continue;
    const caption = figure.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/)?.[1];
    assert.ok(caption, `${label}: ${src} needs a caption immediately below the photo.`);
    const attribution = caption.match(/<span class="article-photo-credit">([\s\S]*?)<\/span>/)?.[1];
    assert.ok(attribution, `${label}: ${src} has no visible photo credit in its caption.`);
    const links = new Map([...attribution.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)]
      .map(([, href, text]) => [href, text]));
    assert.equal(links.get(escapeHtml(credit.source_url)), escapeHtml(credit.source_name), `${label}: incorrect photo source link.`);
    assert.equal(links.get(escapeHtml(credit.license_url)), escapeHtml(credit.license), `${label}: incorrect photo license link.`);
    assert.ok(attribution.includes(`作者：${escapeHtml(credit.author)}`), `${label}: missing photo author.`);
    assert.ok(attribution.includes(`加工：${escapeHtml(credit.modifications)}`), `${label}: missing photo modification disclosure.`);
    seen.add(credit);
    creditedFigures += 1;
    photoCount += 1;
  }
  assert.equal(creditedFigures, images.length, `${label}: a photo appears outside a credited figure.`);
}

assert.ok(articleCount > 0, 'No generated articles were checked.');
assert.equal(seen.size, photos.size, 'Some registered photos have no credited article placement.');
console.log(`Photo credits passed: ${articleCount} articles checked, ${photoCount} credited placements, ${seen.size} distinct photos.`);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
