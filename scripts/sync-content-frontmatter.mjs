import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');
export const registryPaths = [
  'content/registry/living.json',
  'content/registry/events.json',
  'content/registry/learn-german.json'
];
export const frontMatterRequiredFields = [
  'id', 'title', 'slug', 'category', 'summary', 'status', 'published',
  'published_at', 'last_verified', 'canonical_url', 'tags'
];
export const frontMatterComparableFields = [
  ...frontMatterRequiredFields,
  'updated_at', 'related_articles', 'content_type', 'city', 'location', 'event_date',
  'official_url', 'official_sources', 'situation', 'goal', 'level', 'skill', 'duration',
  'resource_skills', 'resource_format', 'resource_level', 'resource_price_type',
  'related_living_guides', 'image', 'image_url', 'hero_image', 'image_alt'
];

function unquote(value) {
  return String(value || '').replace(/^["']|["']$/g, '');
}

function parseScalar(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === '[]') return [];
  if (/^\[.*\]$/.test(value)) {
    try { return JSON.parse(value); } catch { return unquote(value); }
  }
  return unquote(value);
}

export function parseFrontMatter(markdown) {
  const match = String(markdown || '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  const lines = match[1].split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const entry = lines[index].match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!entry) continue;
    const key = entry[1];
    const rawValue = entry[2].trim();
    if (!rawValue) {
      const objectValues = [];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const firstField = lines[cursor].match(/^\s{2}-\s+([A-Za-z0-9_]+):\s*(.*)$/);
        if (!firstField) break;
        const objectValue = { [firstField[1]]: parseScalar(firstField[2].trim()) };
        cursor += 1;
        while (cursor < lines.length) {
          const nextField = lines[cursor].match(/^\s{4}([A-Za-z0-9_]+):\s*(.*)$/);
          if (!nextField) break;
          objectValue[nextField[1]] = parseScalar(nextField[2].trim());
          cursor += 1;
        }
        objectValues.push(objectValue);
      }
      if (objectValues.length) {
        data[key] = objectValues;
        index = cursor - 1;
        continue;
      }

      const values = [];
      while (lines[index + 1] && /^\s*-\s+/.test(lines[index + 1])) {
        index += 1;
        values.push(unquote(lines[index].replace(/^\s*-\s+/, '').trim()));
      }
      data[key] = values;
    } else {
      data[key] = parseScalar(rawValue);
    }
  }
  return data;
}

export function normalizedMetadataValue(value) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return JSON.stringify(value);
  if (typeof value === 'boolean') return String(value);
  return String(value ?? '').trim();
}

export function mergeRegistryEntryFromFrontMatter(entry, frontMatter) {
  const next = { ...entry };
  for (const field of frontMatterComparableFields) {
    if (Object.prototype.hasOwnProperty.call(frontMatter, field)) next[field] = frontMatter[field];
  }
  if (entry.review && typeof entry.review === 'object' && !Array.isArray(entry.review)) {
    next.review = { ...entry.review };
    if (frontMatter.last_verified) next.review.last_reviewed_at = frontMatter.last_verified;
    if (Object.prototype.hasOwnProperty.call(frontMatter, 'next_review')) {
      next.review.next_review_due = frontMatter.next_review;
    }
  }
  return next;
}

function assertRequiredFrontMatter(frontMatter, relative) {
  const missing = frontMatterRequiredFields.filter((field) => !Object.prototype.hasOwnProperty.call(frontMatter, field));
  if (missing.length) throw new Error(`${relative} is missing required front matter: ${missing.join(', ')}`);
}

function comparableJson(value) {
  return JSON.stringify(value);
}

function serializeRegistry(registry, registryPath) {
  let serialized = JSON.stringify(registry, null, 2);
  if (registryPath.endsWith('learn-german.json')) {
    serialized = serialized.replace(/\[\n((?:\s+(?:"(?:\\.|[^"\\])*"|true|false|null|-?\d+(?:\.\d+)?),?\n)+)\s*\]/g, (block, body) => {
      const values = body.split('\n').map((line) => line.trim().replace(/,$/, '')).filter(Boolean);
      return `[${values.join(', ')}]`;
    });
  }
  return `${serialized}\n`;
}

export function synchronizeRegistry(registry, readMarkdown) {
  return registry.map((entry) => {
    if (entry.published !== true) return entry;
    const relative = String(entry.markdown_path || '').replace(/^\/+/, '');
    const frontMatter = parseFrontMatter(readMarkdown(relative));
    assertRequiredFrontMatter(frontMatter, relative);
    return mergeRegistryEntryFromFrontMatter(entry, frontMatter);
  });
}

async function main() {
  const changed = [];
  for (const registryPath of registryPaths) {
    const fullPath = path.join(root, registryPath);
    const currentText = fs.readFileSync(fullPath, 'utf8');
    const registry = JSON.parse(currentText);
    const next = synchronizeRegistry(registry, (relative) => fs.readFileSync(path.join(root, relative), 'utf8'));
    const metadataChanged = comparableJson(next) !== comparableJson(registry);
    const serialized = serializeRegistry(next, registryPath);
    if (metadataChanged) changed.push(registryPath);
    if (write && currentText !== serialized) fs.writeFileSync(fullPath, serialized, 'utf8');
  }

  if (changed.length && !write) {
    console.error(`Registry synchronization required for ${changed.length} file(s). Run with --write.`);
    changed.forEach((file) => console.error(`- ${file}`));
    process.exitCode = 1;
  } else {
    console.log(`${write ? 'Synchronized' : 'Verified'} Markdown-authored metadata for ${changed.length} changed registry file(s).`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
