import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
let count = 0;
const srcOf = (tag) => tag?.match(/\bsrc="([^"]+)"/)?.[1];
const hashOf = (src) => {
  const file = src && path.join(root, src.replace(/^\//, ''));
  return file && fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
};
for (const section of ['living', 'events', 'learn-german']) {
  const items = JSON.parse(fs.readFileSync(path.join(root, 'content/registry', `${section}.json`), 'utf8'));
  for (const item of items.filter((row) => row.published)) {
    count++;
    const html = fs.readFileSync(path.join(root, item.url.replace(/^\//, ''), 'index.html'), 'utf8');
    const hero = srcOf(html.match(/<img\b[^>]*class="[^"]*\barticle-hero-image\b[^>]*>/)?.[0]);
    const heroHash = hashOf(hero);
    if (!heroHash || /placeholder|default|logo/i.test(hero)) failures.push(`${item.url}: missing or placeholder hero`);
    const seen = new Set();
    for (const figure of html.matchAll(/<figure\b[^>]*class="[^"]*\barticle-inline-figure\b[^>]*>([\s\S]*?)<\/figure>/g)) {
      for (const image of figure[1].matchAll(/<img\b[^>]*>/g)) {
        const src = srcOf(image[0]);
        const hash = hashOf(src);
        if (!hash) failures.push(`${item.url}: missing inline image ${src}`);
        else if (hash === heroHash) failures.push(`${item.url}: hero repeated in body ${src}`);
        else if (seen.has(hash)) failures.push(`${item.url}: repeated body image ${src}`);
        if (hash) seen.add(hash);
      }
    }
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Article image validation passed for ${count} published articles: hero presence and exact duplicates. Visual review is required for alternate encodings and relevance.`);
