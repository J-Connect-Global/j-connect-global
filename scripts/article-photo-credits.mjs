import fs from 'node:fs';
import path from 'node:path';

export function loadArticlePhotoCredits(root) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'content/article-photo-credits.json'), 'utf8'));
  if (catalog.schema_version !== 1 || !Array.isArray(catalog.images)) {
    throw new Error('Invalid article photo credit catalog.');
  }
  const credits = new Map();
  for (const image of catalog.images) {
    for (const field of ['source_name', 'source_url', 'author', 'license', 'license_url', 'modifications']) {
      if (typeof image[field] !== 'string' || !image[field].trim()) {
        throw new Error(`Photo credit is missing ${field}.`);
      }
    }
    for (const field of ['source_url', 'license_url']) {
      if (new URL(image[field]).protocol !== 'https:') {
        throw new Error(`Photo ${field} must use HTTPS.`);
      }
    }
    if (!Array.isArray(image.files) || !image.files.length) throw new Error('Photo credit has no image files.');
    for (const file of image.files) {
      if (!file.startsWith('/assets/') || file !== path.posix.normalize(file) || credits.has(file)) {
        throw new Error(`Invalid or duplicate photo path: ${file}`);
      }
      credits.set(file, image);
    }
  }
  return credits;
}
