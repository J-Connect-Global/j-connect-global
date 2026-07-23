import assert from 'node:assert/strict';
import { findMetadataRegressions } from './check-content-metadata-regression.mjs';
import { mergeRegistryEntryFromFrontMatter, parseFrontMatter } from './sync-content-frontmatter.mjs';

function markdown(fields) {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n`;
}

const base = markdown({ last_verified: '2026-07-16', updated_at: '2026-07-16' });
const regressed = markdown({ last_verified: '2026-06-29', updated_at: '2026-06-29' });
const advanced = markdown({ last_verified: '2026-07-17', updated_at: '2026-07-16' });
const paths = ['content/example.md'];
const readers = {
  baseRef: 'origin/main',
  paths,
  readBase: () => base
};

assert.deepEqual(
  findMetadataRegressions({ ...readers, readHead: () => regressed }),
  [
    { path: paths[0], field: 'last_verified', base_value: '2026-07-16', head_value: '2026-06-29' },
    { path: paths[0], field: 'updated_at', base_value: '2026-07-16', head_value: '2026-06-29' }
  ]
);
assert.deepEqual(findMetadataRegressions({ ...readers, readHead: () => advanced }), []);
assert.deepEqual(
  findMetadataRegressions({ ...readers, readHead: () => markdown({ last_verified: '2026-07-16' }) }),
  [{ path: paths[0], field: 'updated_at', base_value: '2026-07-16', head_value: '' }]
);
assert.deepEqual(findMetadataRegressions({
  ...readers,
  readHead: () => regressed,
  allowlist: [
    { path: paths[0], field: 'last_verified', base_value: '2026-07-16', head_value: '2026-06-29', reason: 'Documented correction' },
    { path: paths[0], field: 'updated_at', base_value: '2026-07-16', head_value: '2026-06-29', reason: 'Documented correction' }
  ]
}), []);

const frontMatter = parseFrontMatter(`---
id: "L001"
title: "Human-edited title"
slug: "example"
category: "行政手続き"
summary: "Specific summary"
status: "published"
published: true
published_at: "2026-06-01"
updated_at: "2026-07-16"
last_verified: "2026-07-16"
next_review: "2027-07-16"
canonical_url: "/example/"
tags: ["specific","human"]
related_articles: ["related-one"]
official_sources:
  - title: "Current official source"
    url: "https://example.org/current"
---`);
const merged = mergeRegistryEntryFromFrontMatter({
  id: 'L001', title: 'Old registry title', slug: 'example', category: 'old', summary: 'old',
  status: 'published', published: true, published_at: '2026-06-01', updated_at: '2026-06-01',
  last_verified: '2026-06-01', canonical_url: '/example/', tags: ['old'],
  related_articles: [], official_sources: [{ title: 'Stale registry source', url: 'https://example.org/stale' }],
  home_visible: true,
  review: { status: 'reviewed', last_reviewed_at: '2026-06-01', next_review_due: '2027-06-01' }
}, frontMatter);
assert.equal(merged.title, 'Human-edited title');
assert.equal(merged.home_visible, true);
assert.deepEqual(merged.tags, ['specific', 'human']);
assert.deepEqual(merged.official_sources, [
  { title: 'Current official source', url: 'https://example.org/current' }
]);
assert.equal(merged.review.last_reviewed_at, '2026-07-16');
assert.equal(merged.review.next_review_due, '2027-07-16');

console.log('Content metadata synchronization and regression tests passed.');
