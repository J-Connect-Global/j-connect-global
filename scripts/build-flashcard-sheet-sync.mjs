#!/usr/bin/env node
// Builds a Google Apps Script that applies the flashcard correction CSVs in
// docs/ to the master "German Vocabulary" spreadsheet (sheet 「収録語」).
//
// Usage: node scripts/build-flashcard-sheet-sync.mjs [csv ...]
// Without arguments every docs/flashcard-corrections-*.csv is used, oldest first.
// Output: docs/flashcard-sheet-sync/apply-flashcard-corrections.gs
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outFile = path.join(root, "docs/flashcard-sheet-sync/apply-flashcard-corrections.gs");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0]);
}

// Character-bigram similarity, used to tell a full example replacement from a typo fix.
function similarity(a, b) {
  const grams = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const A = grams(a), B = grams(b);
  let inter = 0, total = 0;
  for (const [g, n] of A) { inter += Math.min(n, B.get(g) || 0); total += n; }
  for (const n of B.values()) total += n;
  return total ? (2 * inter) / total : 1;
}

const args = process.argv.slice(2);
const csvFiles = args.length
  ? args.map((f) => path.resolve(f))
  : fs.readdirSync(path.join(root, "docs"))
      .filter((f) => /^flashcard-corrections-.*\.csv$/.test(f))
      .sort()
      .map((f) => path.join(root, "docs", f));

const changes = [];
for (const file of csvFiles) {
  const [header, ...rows] = parseCsv(fs.readFileSync(file, "utf8"));
  if (header.join(",") !== "card_id,列,修正前,修正後") throw new Error(`${file}: unexpected header ${header}`);
  for (const [id, col, before, after] of rows) changes.push([id, col, before, after]);
}

// Cards whose example sentence was replaced (not just a small typo fix): their
// example source and licence columns are updated to J-Connect's own example.
const firstBefore = new Map(), lastAfter = new Map();
for (const [id, col, before, after] of changes) {
  if (col !== "example_de") continue;
  if (!firstBefore.has(id)) firstBefore.set(id, before);
  lastAfter.set(id, after);
}
const replacedExampleIds = [...lastAfter.keys()].filter((id) => similarity(firstBefore.get(id), lastAfter.get(id)) < 0.8).sort();

const template = `/**
 * 暗記カード修正の一括反映スクリプト（自動生成：scripts/build-flashcard-sheet-sync.mjs）
 *
 * 対象: スプレッドシート「German Vocabulary」の「収録語」シート
 * 元データ: ${csvFiles.map((f) => path.relative(root, f)).join(", ")}
 * 修正セル数: ${changes.length} / 例文を差し替えたカード: ${replacedExampleIds.length}
 *
 * 使い方
 *   1. previewCorrections を実行 → 「修正反映ログ」シートで件数を確認（シートは変更しません）
 *   2. applyCorrections を実行 → 最初にスプレッドシート全体のバックアップを作ってから反映します
 *
 * 安全策
 *   - セルの現在の値が「修正前」と一致する場合だけ書き換えます。
 *   - 既に「修正後」になっているセルは何もしません（2回実行しても安全）。
 *   - どちらとも一致しないセルは書き換えず、ログに「要確認」として残します。
 */

const SHEET_NAME = '収録語';
const HEADER_ROW = 3;
const LOG_SHEET_NAME = '修正反映ログ';
const COLUMN_HEADERS = {
  level: 'レベル',
  category: '分類',
  display_de: '表',
  japanese: '裏',
  example_de: '例文',
  example_ja: '例文の和訳',
  grammar: '品詞・文法',
  usage_note: '用法・注意（Web表示）',
  scene: '場面',
  example_source: '例文出典',
  license: 'ライセンス',
};
const OWN_EXAMPLE_SOURCE = 'J-Connect 独自作例';

function previewCorrections() { run_(false); }
function applyCorrections() { run_(true); }

function run_(apply) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('シート「' + SHEET_NAME + '」が見つかりません。');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0].map(String);
  const colIndex = {};
  Object.keys(COLUMN_HEADERS).forEach(function (key) {
    const i = headers.indexOf(COLUMN_HEADERS[key]);
    if (i >= 0) colIndex[key] = i;
  });
  const idCol = headers.indexOf('ID');
  if (idCol < 0) throw new Error('見出し行に「ID」列が見つかりません。');

  const range = sheet.getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, lastCol);
  const values = range.getValues();
  const rowById = {};
  values.forEach(function (row, i) { if (row[idCol]) rowById[String(row[idCol]).trim()] = i; });

  const counts = { applied: 0, already: 0, mismatch: 0, missing: 0, sourceUpdated: 0 };
  const log = [];
  const touched = {};
  const changedRows = {};
  function mark(ci, r) { touched[ci] = true; (changedRows[ci] = changedRows[ci] || []).push(r); }

  CHANGES.forEach(function (c) {
    const id = c[0], key = c[1], before = c[2], after = c[3];
    const r = rowById[id];
    const ci = colIndex[key];
    if (r === undefined || ci === undefined) {
      counts.missing++;
      log.push([id, COLUMN_HEADERS[key] || key, 'IDまたは列なし', before, after, '']);
      return;
    }
    const current = String(values[r][ci]);
    if (norm_(current) === norm_(after)) { counts.already++; return; }
    if (norm_(current) === norm_(before)) {
      values[r][ci] = after;
      mark(ci, r);
      counts.applied++;
      log.push([id, COLUMN_HEADERS[key], apply ? '反映' : '反映予定', before, after, '']);
      return;
    }
    counts.mismatch++;
    log.push([id, COLUMN_HEADERS[key], '要確認（シートの値が修正前と異なる）', before, after, current]);
  });

  if (colIndex.example_source !== undefined) {
    REPLACED_EXAMPLE_IDS.forEach(function (id) {
      const r = rowById[id];
      if (r === undefined) return;
      const si = colIndex.example_source;
      if (String(values[r][si]) !== OWN_EXAMPLE_SOURCE) {
        log.push([id, COLUMN_HEADERS.example_source, apply ? '反映' : '反映予定', String(values[r][si]), OWN_EXAMPLE_SOURCE, '']);
        values[r][si] = OWN_EXAMPLE_SOURCE;
        mark(si, r);
        counts.sourceUpdated++;
      }
      const li = colIndex.license;
      if (li !== undefined) {
        const lic = String(values[r][li]);
        const m = lic.match(/^(.*例文:\\s*)(.*)$/);
        if (m && m[2] !== '独自編集') {
          const next = m[1] + '独自編集';
          log.push([id, COLUMN_HEADERS.license, apply ? '反映' : '反映予定', lic, next, '']);
          values[r][li] = next;
          mark(li, r);
        }
      }
    });
  }

  if (apply && (counts.applied || counts.sourceUpdated)) {
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm');
    ss.copy(ss.getName() + '（修正反映前バックアップ ' + stamp + '）');
    Object.keys(touched).forEach(function (ci) {
      ci = Number(ci);
      const colRange = sheet.getRange(HEADER_ROW + 1, ci + 1, values.length, 1);
      const formulas = colRange.getFormulas();
      const hasFormula = formulas.some(function (f) { return f[0]; });
      if (hasFormula) {
        (changedRows[ci] || []).forEach(function (i) {
          if (!formulas[i][0]) colRange.getCell(i + 1, 1).setValue(values[i][ci]);
        });
      } else {
        colRange.setValues(values.map(function (row) { return [row[ci]]; }));
      }
    });
  }

  writeLog_(ss, apply, counts, log);
  const summary = (apply ? '反映しました' : '確認のみ（シートは変更していません）') +
    '\\n反映' + (apply ? '' : '予定') + ': ' + counts.applied + ' セル' +
    '\\n反映済み（変更不要）: ' + counts.already + ' セル' +
    '\\n要確認: ' + counts.mismatch + ' セル' +
    '\\nIDまたは列なし: ' + counts.missing + ' セル' +
    '\\n例文出典の更新: ' + counts.sourceUpdated + ' 行' +
    (apply && (counts.applied || counts.sourceUpdated) ? '\\n\\nバックアップをマイドライブに作成しました。' : '') +
    '\\n詳細は「' + LOG_SHEET_NAME + '」シートを見てください。';
  try { SpreadsheetApp.getUi().alert(summary); } catch (e) { Logger.log(summary); }
}

function norm_(s) { return String(s).replace(/\\r\\n?/g, '\\n').replace(/\\u00a0/g, ' ').trim(); }

function writeLog_(ss, apply, counts, log) {
  let sheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(LOG_SHEET_NAME);
  sheet.clear();
  sheet.getRange(1, 1).setValue((apply ? '反映実行: ' : '確認のみ: ') + new Date());
  sheet.getRange(2, 1, 1, 6).setValues([['ID', '列', '結果', '修正前', '修正後', 'シートの現在の値（要確認のみ）']]);
  if (log.length) sheet.getRange(3, 1, log.length, 6).setValues(log);
  sheet.setFrozenRows(2);
}

const REPLACED_EXAMPLE_IDS = __REPLACED__;

const CHANGES = __CHANGES__;
`;

const gs = template
  .replace("__REPLACED__", JSON.stringify(replacedExampleIds))
  .replace("__CHANGES__", "[\n" + changes.map((c) => "  " + JSON.stringify(c)).join(",\n") + "\n]");

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, gs);
console.log(`Wrote ${path.relative(root, outFile)}: ${changes.length} cells from ${csvFiles.length} CSV file(s), ${replacedExampleIds.length} replaced examples.`);
