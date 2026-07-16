import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');
const registries = [
  'content/registry/living.json',
  'content/registry/events.json',
  'content/registry/learn-german.json'
];
const requiredFields = ['id', 'title', 'slug', 'category', 'summary', 'status', 'published', 'published_at', 'last_verified', 'canonical_url', 'tags'];
const comparableFields = [
  ...requiredFields,
  'updated_at', 'related_articles', 'content_type', 'city', 'location', 'event_date',
  'official_url', 'situation', 'goal', 'level', 'skill', 'duration',
  'resource_skills', 'resource_format', 'resource_level', 'resource_price_type',
  'related_living_guides', 'image', 'image_url', 'hero_image', 'image_alt'
];

function serialize(key, value) {
  if (typeof value === 'boolean') return `${key}: ${value}`;
  if (Array.isArray(value)) return `${key}: ${JSON.stringify(value)}`;
  return `${key}: ${JSON.stringify(String(value ?? ''))}`;
}

function synchronize(source, entry) {
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`${entry.markdown_path} has no YAML front matter.`);
  const lines = match[1].split(/\r?\n/);
  const existingKeys = new Set(lines.map((line) => line.match(/^([A-Za-z0-9_]+):/)?.[1]).filter(Boolean));
  const desiredFields = new Set([...requiredFields, ...comparableFields.filter((field) => existingKeys.has(field))]);
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const key = lines[index].match(/^([A-Za-z0-9_]+):/)?.[1];
    if (!key || !desiredFields.has(key) || !Object.prototype.hasOwnProperty.call(entry, key)) {
      output.push(lines[index]);
      continue;
    }
    output.push(serialize(key, entry[key]));
    while (lines[index + 1] && /^\s*-\s+/.test(lines[index + 1])) index += 1;
  }

  for (const key of requiredFields) {
    if (!existingKeys.has(key)) output.push(serialize(key, entry[key]));
  }

  if (existingKeys.has('next_review')) {
    const index = output.findIndex((line) => /^next_review:/.test(line));
    if (index >= 0) output[index] = serialize('next_review', entry.review?.next_review_due || '');
  }

  return source.replace(match[0], `---${newline}${output.join(newline)}${newline}---`);
}

const changed = [];
for (const registryPath of registries) {
  const registry = JSON.parse(fs.readFileSync(path.join(root, registryPath), 'utf8'));
  for (const entry of registry.filter((item) => item.published === true)) {
    const relative = String(entry.markdown_path || '').replace(/^\/+/, '');
    const file = path.join(root, relative);
    const source = fs.readFileSync(file, 'utf8');
    const next = synchronize(source, entry);
    if (next === source) continue;
    changed.push(relative);
    if (write) fs.writeFileSync(file, next, 'utf8');
  }
}

if (changed.length && !write) {
  console.error(`Front matter synchronization required for ${changed.length} file(s). Run with --write.`);
  changed.forEach((file) => console.error(`- ${file}`));
  process.exitCode = 1;
} else {
  console.log(`${write ? 'Synchronized' : 'Verified'} registry-backed front matter for ${changed.length} changed file(s).`);
}
