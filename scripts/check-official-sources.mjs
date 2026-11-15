#!/usr/bin/env node
// 公式情報の更新チェック（運営者向け）
//
// 記事の official_sources に載っている公式ページを取得し、前回の取得時から本文が
// 変わったページ・開けなくなったページを Markdown のレポートにまとめる。
// OPENAI_API_KEY があれば、変わったページについて「記事の内容に影響しそうか」を
// AI に判定させてレポートに添える（なくてもチェック自体は動く）。
//
// 使い方: node scripts/check-official-sources.mjs [--state .cache/official-sources.json] [--report report.md]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
};
const statePath = path.resolve(argValue('--state', path.join(root, '.cache/official-sources.json')));
const reportPath = path.resolve(argValue('--report', path.join(root, 'official-sources-report.md')));
const limit = Number(argValue('--limit', '0')) || Infinity;
const CONCURRENCY = 6;
const TIMEOUT_MS = 20000;
const MAX_AI_CHECKS = 40;
const EXCERPT_CHARS = 6000;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) out.push(full);
  }
  return out;
}

// フロントマターから title と official_sources の URL を取り出す（簡易パーサー）
function readArticle(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const front = match[1];
  if (/^published:\s*false/m.test(front)) return null;
  const title = (front.match(/^title:\s*"?(.*?)"?\s*$/m) || [])[1] || path.basename(file, '.md');
  const url = (front.match(/^canonical_url:\s*"?(.*?)"?\s*$/m) || [])[1] || '';
  const block = (front.match(/^official_sources:\s*\n([\s\S]*?)(?=^\S)/m) || [])[1] || '';
  const sources = [...block.matchAll(/url:\s*"?([^"\s]+)"?/g)].map((m) => m[1]).filter((u) => /^https?:\/\//.test(u));
  return { title, url, sources };
}

function normalizePageText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(nav|header|footer|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// 日付や時刻だけの変化で「変わった」と判定しないように取り除いてから比べる
function fingerprint(text) {
  const stable = text
    .replace(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, '')
    .replace(/\b\d{4}-\d{2}-\d{2}(T[\d:.+Z-]+)?\b/g, '')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '');
  return crypto.createHash('sha256').update(stable).digest('hex');
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'J-Connect official source checker (+https://j-connect-global.com/germany/ja/contact/)', Accept: 'text/html,application/xhtml+xml' }
    });
    const type = response.headers.get('content-type') || '';
    if (!response.ok) return { status: response.status, error: `HTTP ${response.status}` };
    if (!/html|text/.test(type)) return { status: response.status, skipped: true };
    const text = normalizePageText(await response.text());
    return { status: response.status, text };
  } catch (error) {
    return { status: 0, error: error.name === 'AbortError' ? 'timeout' : (error.code || error.message || 'error') };
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(items, size, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }));
  return results;
}

async function aiJudge(apiKey, change) {
  const prompt = [
    'ドイツ在住の日本人向け情報サイトの記事が参照している公式ページの本文が変わりました。',
    '変更前と変更後の抜粋を比べ、記事の内容（金額、期限、条件、手続き、必要書類など）の見直しが必要そうか判定してください。',
    '見た目やメニュー、ニュース一覧の入れ替えだけなら relevant は false にしてください。',
    '出力は JSON のみ: {"relevant": true/false, "summary_ja": "何が変わったかを日本語で2文以内"}',
    '',
    `参照している記事: ${change.articles.map((a) => a.title).join(' / ')}`,
    `公式ページ: ${change.url}`,
    '<変更前>', change.before.slice(0, 5000), '</変更前>',
    '<変更後>', change.after.slice(0, 5000), '</変更後>'
  ].join('\n');
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.SOURCE_CHECK_MODEL || 'gpt-6-luna',
        reasoning_effort: 'low',
        max_completion_tokens: 1500,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) return null;
    const json = await response.json();
    return JSON.parse(json.choices?.[0]?.message?.content || 'null');
  } catch {
    return null;
  }
}

async function main() {
  const articles = walk(path.join(root, 'content')).map(readArticle).filter(Boolean);
  const byUrl = new Map();
  for (const article of articles) {
    for (const url of article.sources) {
      if (!byUrl.has(url)) byUrl.set(url, []);
      byUrl.get(url).push({ title: article.title, url: article.url });
    }
  }
  const urls = [...byUrl.keys()].slice(0, limit);
  const previous = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
  const isBaseline = Object.keys(previous).length === 0;
  console.log(`Checking ${urls.length} official source URLs from ${articles.length} articles${isBaseline ? ' (first run: baseline only)' : ''}.`);

  const now = new Date().toISOString();
  const nextState = {};
  const changed = [];
  const broken = [];
  await mapLimit(urls, CONCURRENCY, async (url) => {
    const result = await fetchPage(url);
    const before = previous[url];
    if (result.error) {
      // 一時的な失敗で前回の内容を失わないように、前回の記録を残す
      if (before) nextState[url] = { ...before, lastError: result.error, lastErrorAt: now };
      if (before && before.lastError) broken.push({ url, error: result.error, articles: byUrl.get(url) });
      else if (!before) nextState[url] = { lastError: result.error, lastErrorAt: now };
      return;
    }
    if (result.skipped) return;
    const hash = fingerprint(result.text);
    nextState[url] = { hash, excerpt: result.text.slice(0, EXCERPT_CHARS), checkedAt: now };
    if (before && before.hash && before.hash !== hash) {
      changed.push({ url, articles: byUrl.get(url), before: before.excerpt || '', after: result.text.slice(0, EXCERPT_CHARS) });
    }
  });

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(nextState));

  if (isBaseline) {
    console.log('Baseline stored. No report on the first run.');
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    for (const change of changed.slice(0, MAX_AI_CHECKS)) change.ai = await aiJudge(apiKey, change);
  }

  const relevant = changed.filter((c) => !c.ai || c.ai.relevant);
  const minor = changed.filter((c) => c.ai && !c.ai.relevant);
  if (!relevant.length && !broken.length) {
    console.log(`No relevant changes (${changed.length} cosmetic changes).`);
    return;
  }

  const lines = [
    `公式情報の更新チェック（${now.slice(0, 10)}）`,
    '',
    `${urls.length} 件の公式ページを確認しました。記事の見直しが必要かもしれないページを一覧にします。`,
    apiKey ? '「AIの判定」は変更前後の本文を比べた自動の要約です。最終的な判断は公式ページで確認してください。' : '（OPENAI_API_KEY が設定されていないため、AIによる要約はありません。本文が変わったページをすべて載せています。）',
    ''
  ];
  if (relevant.length) {
    lines.push(`## 内容が変わった公式ページ（${relevant.length}件）`, '');
    for (const c of relevant) {
      lines.push(`- [ ] ${c.url}`);
      lines.push(`  - 関係する記事: ${c.articles.map((a) => `[${a.title}](https://j-connect-global.com${a.url})`).join('、')}`);
      if (c.ai?.summary_ja) lines.push(`  - AIの判定: ${c.ai.summary_ja}`);
    }
    lines.push('');
  }
  if (broken.length) {
    lines.push(`## 2回続けて開けなかった公式ページ（${broken.length}件）`, '');
    for (const b of broken) lines.push(`- [ ] ${b.url}（${b.error}） — ${b.articles.map((a) => a.title).join('、')}`);
    lines.push('');
  }
  if (minor.length) lines.push(`ほかに ${minor.length} 件、見た目や一覧の入れ替えだけと判定された変更がありました。`);
  fs.writeFileSync(reportPath, lines.join('\n') + '\n');
  console.log(`Report written: ${relevant.length} changed, ${broken.length} broken.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
