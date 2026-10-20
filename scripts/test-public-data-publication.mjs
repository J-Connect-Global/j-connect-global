import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderPublicListSnapshots } from './render-public-list-snapshots.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'jconnect-publication-'));
const htmlPaths = ['germany/ja/index.html', 'germany/ja/community/index.html', 'germany/ja/jobs/index.html'];
const git = (...args) => execFileSync('git', args, { cwd: fixture, encoding: 'utf8' });
const now = new Date('2026-10-20T09:00:00Z');
try {
  for (const directory of ['community', 'jobs', 'eat', 'shopping', 'medical']) {
    fs.cpSync(path.join(source, 'assets/data', directory), path.join(fixture, 'assets/data', directory), { recursive: true });
  }
  for (const file of htmlPaths) {
    fs.mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true });
    fs.copyFileSync(path.join(source, file), path.join(fixture, file));
  }
  renderPublicListSnapshots({ root: fixture, now });
  git('init', '-q');
  git('config', 'user.name', 'Publication regression test');
  git('config', 'user.email', 'publication-test@example.com');
  git('add', '.');
  git('commit', '-qm', 'Baseline public snapshots');

  const dataFile = path.join(fixture, 'assets/data/community/posts.json');
  const payload = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const id = 'post_publication-regression';
  payload.items.unshift({ ...payload.items[0], id, post_id: id, title: 'Publication regression fixture',
    detail_url: `/germany/ja/community/posts/${id}/`, created_at: now.toISOString(),
    published_at: now.toISOString(), updated_at: now.toISOString(), expires_at: '', status: 'active' });
  payload.count = payload.items.length;
  fs.writeFileSync(dataFile, JSON.stringify(payload, null, 2) + '\n');
  renderPublicListSnapshots({ root: fixture, now });
  for (const file of htmlPaths.slice(0, 2)) assert.ok(fs.readFileSync(path.join(fixture, file), 'utf8').includes(id), `${file} must show the newly approved post`);

  const workflow = fs.readFileSync(path.join(source, '.github/workflows/sync-public-data.yml'), 'utf8');
  const patterns = workflow.match(/^\s+file_pattern:\s*(.+)$/m)?.[1].trim().split(/\s+/);
  assert.ok(patterns?.length, 'Publication workflow must declare its committed files');
  git('add', '--', ...patterns);
  assert.equal(git('diff', '--name-only').trim(), '', 'Sync must commit generated HTML together with public JSON');
  const staged = git('diff', '--cached', '--name-only');
  assert.ok(staged.includes('assets/data/community/posts.json'));
  assert.ok(staged.includes('germany/ja/community/index.html'));
  assert.ok(staged.includes('germany/ja/index.html'));
  const generated = renderPublicListSnapshots({ root: fixture, now, write: false });
  for (const [key, file] of [['home', htmlPaths[0]], ['community', htmlPaths[1]], ['jobs', htmlPaths[2]]]) {
    assert.equal(generated.html[key], fs.readFileSync(path.join(fixture, file), 'utf8'));
  }
  console.log('Public-data publication regression passed: approved JSON and deterministic list HTML are committed together.');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
