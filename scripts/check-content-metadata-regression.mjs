import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontMatter, registryPaths } from './sync-content-frontmatter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowlistPath = path.join(root, 'content', 'metadata-regression-allowlist.json');
const protectedFields = ['last_verified', 'updated_at'];

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : '';
}

function gitShow(ref, relative) {
  return execFileSync('git', ['show', `${ref}:${relative}`], { cwd: root, encoding: 'utf8' });
}

function loadMarkdownPaths() {
  return registryPaths.flatMap((registryPath) => {
    const registry = JSON.parse(fs.readFileSync(path.join(root, registryPath), 'utf8'));
    return registry
      .filter((entry) => entry.published === true)
      .map((entry) => String(entry.markdown_path || '').replace(/^\/+/, ''))
      .filter(Boolean);
  });
}

function loadAllowlist() {
  const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  if (allowlist?.schema_version !== 1 || !Array.isArray(allowlist.entries)) {
    throw new Error('content/metadata-regression-allowlist.json must use schema_version 1 and an entries array.');
  }
  for (const [index, entry] of allowlist.entries.entries()) {
    if (!entry || !protectedFields.includes(entry.field) || !entry.path || !entry.base_value
        || !Object.prototype.hasOwnProperty.call(entry, 'head_value') || !String(entry.reason || '').trim()) {
      throw new Error(`metadata regression allowlist entry ${index + 1} is incomplete.`);
    }
  }
  return allowlist.entries;
}

function isAllowed(allowlist, regression) {
  return allowlist.some((entry) => entry.path === regression.path
    && entry.field === regression.field
    && entry.base_value === regression.base_value
    && entry.head_value === regression.head_value
    && String(entry.reason || '').trim());
}

export function findMetadataRegressions({ baseRef, paths, readHead, readBase, allowlist = [] }) {
  const regressions = [];
  for (const relative of paths) {
    let base;
    try {
      base = parseFrontMatter(readBase(baseRef, relative));
    } catch {
      continue;
    }
    const head = parseFrontMatter(readHead(relative));
    for (const field of protectedFields) {
      const baseValue = String(base[field] || '').trim();
      const headValue = String(head[field] || '').trim();
      if (!baseValue || (headValue && headValue >= baseValue)) continue;
      const regression = { path: relative, field, base_value: baseValue, head_value: headValue };
      if (!isAllowed(allowlist, regression)) regressions.push(regression);
    }
  }
  return regressions;
}

async function main() {
  const baseRef = argumentValue('--base-ref');
  if (!baseRef) throw new Error('--base-ref requires a fetched git reference.');
  execFileSync('git', ['rev-parse', '--verify', baseRef], { cwd: root, stdio: 'ignore' });
  const allowlist = loadAllowlist();
  const regressions = findMetadataRegressions({
    baseRef,
    paths: loadMarkdownPaths(),
    readHead: (relative) => fs.readFileSync(path.join(root, relative), 'utf8'),
    readBase: gitShow,
    allowlist
  });

  if (regressions.length) {
    console.error(`Content metadata regression check failed with ${regressions.length} unapproved regression(s):`);
    regressions.forEach((entry) => console.error(`- ${entry.path} ${entry.field}: ${entry.base_value} -> ${entry.head_value}`));
    process.exitCode = 1;
    return;
  }
  console.log(`Content metadata regression check passed against ${baseRef}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
