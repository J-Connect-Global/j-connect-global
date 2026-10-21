import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// 暗記カードの公開データが、正本スプレッドシートのスナップショット（vocabulary-sheet.json）と
// 1件単位で一致すること、Web 表示列（A〜I列）以外を含まないことを確認する。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'assets/data/learn-german/flashcards');
const sourceDir = path.join(root, 'content/learn-german/flashcards');
const read = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const sheet = read(sourceDir, 'vocabulary-sheet.json');
const scenes = read(sourceDir, 'scene-decks.json');
const decks = read(dataDir, 'decks.json');

assert.deepEqual(sheet.columns, ['card_id', 'level', 'category', 'display_de', 'japanese', 'example_de', 'example_ja', 'grammar', 'usage_note']);
assert.equal(sheet.rows.length, sheet.total);
const sheetById = new Map(sheet.rows.map(row => [row[0], Object.fromEntries(sheet.columns.map((key, index) => [key, row[index]]))]));
assert.equal(sheetById.size, sheet.rows.length, 'unique sheet IDs');

const counts = {};
const cards = [];
for (const level of levels) {
  const payload = read(dataDir, `cards-${level.toLowerCase()}.json`);
  assert.equal(payload.schema_version, 3);
  assert.equal(payload.level, level);
  assert.equal(payload.level_card_count, payload.cards.length);
  for (const card of payload.cards) assert.equal(card.primary_level, level, `${card.card_id}: file placement`);
  counts[level] = payload.cards.length;
  cards.push(...payload.cards);
}
for (const obsolete of ['cards-practical.json', 'vocabulary-audit.csv', 'vocabulary-audit.json']) {
  assert(!fs.existsSync(path.join(dataDir, obsolete)), `${obsolete} must not be published`);
}

// 件数：レベル別にシートと1件単位で一致
assert.deepEqual(counts, sheet.level_counts, 'level counts match the sheet');
assert.deepEqual(decks.level_counts, sheet.level_counts);
assert.equal(cards.length, sheet.total);
assert.equal(decks.total_card_count, sheet.total);

// 内容：Web 表示列だけを、シートのとおりに出す
const unitTypes = { 単語: 'word', 熟語: 'phrase', その他: 'other' };
const allowedKeys = new Set(['card_id', 'primary_level', 'unit_type', 'category_ja', 'part_of_speech', 'display_de', 'japanese', 'example_de', 'example_ja', 'grammar_ja', 'usage_note_ja', 'scene_tags']);
const sourceWording = /FreeDict|JMdict|WikiMatrix|Wiktionary|Tatoeba|Goethe|CC BY|和訳:|Google Sheets/;
const cardMap = new Map(cards.map(card => [card.card_id, card]));
assert.equal(cardMap.size, cards.length, 'unique card IDs');
for (const card of cards) {
  const row = sheetById.get(card.card_id);
  assert(row, `${card.card_id}: exists in the sheet`);
  for (const key of Object.keys(card)) assert(allowedKeys.has(key), `${card.card_id}: unexpected field ${key}`);
  assert.equal(card.primary_level, row.level);
  assert.equal(card.category_ja, row.category);
  assert.equal(card.unit_type, unitTypes[row.category]);
  assert.equal(card.display_de, row.display_de);
  assert.equal(card.japanese, row.japanese);
  assert.equal(card.example_de, row.example_de);
  assert.equal(card.example_ja, row.example_ja);
  assert.equal(card.grammar_ja, row.grammar);
  assert.equal(card.usage_note_ja || '', row.usage_note);
  for (const field of ['display_de', 'japanese', 'example_de', 'example_ja', 'grammar_ja', 'part_of_speech']) assert(card[field], `${card.card_id}: ${field}`);
  assert(/[ぁ-んァ-ン一-龯]/.test(card.japanese), `${card.card_id}: Japanese meaning`);
  assert(/[ぁ-んァ-ン一-龯]/.test(card.example_ja), `${card.card_id}: Japanese example`);
  for (const field of ['japanese', 'grammar_ja', 'usage_note_ja']) {
    if (card[field]) assert(!sourceWording.test(card[field]), `${card.card_id}: ${field} must not show source or translation notes`);
  }
  if (card.scene_tags) {
    assert.deepEqual(card.scene_tags, scenes.scene_tags[card.card_id]);
    for (const scene of card.scene_tags) assert(scenes.scene_labels[scene], `${card.card_id}: known scene ${scene}`);
  }
}

// 学習進捗：これまで公開していたIDは、残っているか、除外記録で統合済みのどちらか
const excluded = new Map(sheet.excluded_ids);
for (const id of scenes.previously_published_ids) {
  if (cardMap.has(id)) continue;
  assert(excluded.has(id), `${id}: previously published card disappeared without an exclusion record`);
  const mergedInto = excluded.get(id);
  if (mergedInto) assert(cardMap.has(mergedInto), `${id}: merged target ${mergedInto} exists`);
}
for (const [id] of excluded) assert(!cardMap.has(id), `${id}: excluded item must not be published`);

// 教材：既存の教材URLを維持し、件数と目安時間を再計算する
const expectedDeckIds = [
  'all-levels-4000', 'a1-life-basics', 'a2-daily-independence', 'b1-explain-and-confirm', 'b2-negotiate-and-document',
  'c1-broad-repertoire', 'c2-nuance-repertoire', 'a1-practical-50', 'a2-practical-50', 'b1-practical-50', 'b2-practical-50',
  'scene-daily', 'scene-shopping', 'scene-administration', 'scene-medical', 'scene-housing', 'scene-kita-school', 'scene-work'
];
assert.deepEqual(decks.decks.map(deck => deck.deck_id), expectedDeckIds, 'existing deck URLs retained');
const deckById = new Map(decks.decks.map(deck => [deck.deck_id, deck]));
for (const deck of decks.decks) {
  const ids = deck.card_ids || deck.card_ids_from_decks.flatMap(deckId => deckById.get(deckId).card_ids);
  assert.equal(deck.card_count, ids.length, `${deck.deck_id}: card_count`);
  assert.equal(new Set(ids).size, ids.length, `${deck.deck_id}: unique IDs`);
  assert.equal(deck.estimated_minutes, Math.ceil(ids.length * 0.5), `${deck.deck_id}: 0.5 minutes per card`);
  assert(!/Goethe|CEFR未判定|資料掲載/.test(deck.title_ja + deck.description_ja), `${deck.deck_id}: description reflects J-Connect editing`);
  for (const id of ids) {
    const card = cardMap.get(id);
    assert(card, `${deck.deck_id}: known item ${id}`);
    assert(deck.card_files.includes(`cards-${card.primary_level.toLowerCase()}.json`), `${id}: loading follows level placement`);
    if (deck.deck_kind === 'cefr-level') assert.equal(card.primary_level, deck.target_level);
  }
}
for (const level of levels) assert.equal(decks.decks.find(deck => deck.deck_kind === 'cefr-level' && deck.target_level === level).card_count, sheet.level_counts[level]);
assert.equal(deckById.get('all-levels-4000').card_count, sheet.total);

// ページ：古い説明を残さず、帰属表示をまとめて載せる
const html = fs.readFileSync(path.join(root, 'germany/ja/learn-german/flashcards/index.html'), 'utf8');
for (const id of ['flashcardBasisSummary', 'flashcardPartOfSpeech', 'flashcardGrammar', 'flashcardUsageNote', 'flashcardsSources', 'flashcardsVocabularyStatus', 'flashcardsBackup', 'flashcardsRestore']) assert(html.includes(`id="${id}"`), `page keeps #${id}`);
for (const claim of ['vocabulary-audit', '分類根拠', 'Goetheの掲載資料', 'CEFR未判定', '下位レベルの語彙は含みません', 'レベル別4,000語']) assert(!html.includes(claim), `remove outdated claim: ${claim}`);
const credits = html.slice(html.indexOf('id="flashcardsSources"'));
for (const source of decks.sources) {
  assert(credits.includes(source.url), `credits link ${source.source_id}`);
  assert(credits.includes(source.license), `credits license ${source.source_id}`);
}
const hub = fs.readFileSync(path.join(root, 'germany/ja/learn-german/index.html'), 'utf8');
assert(!hub.includes('vocabulary-audit'), 'hub no longer links the retired audit CSV');

// 生成の再現性
const generatedFiles = fs.readdirSync(dataDir).filter(name => /^(cards-.*\.json|decks\.json)$/.test(name));
const before = new Map(generatedFiles.map(name => [name, fs.readFileSync(path.join(dataDir, name))]));
const result = spawnSync(process.execPath, ['scripts/generate-learn-german-flashcards.mjs'], { cwd: root, encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr);
for (const [name, buffer] of before) assert.deepEqual(fs.readFileSync(path.join(dataDir, name)), buffer, `${name}: reproducible generation`);

console.log(`Flashcard data matches the vocabulary sheet: ${cards.length} cards (${levels.map(level => `${level} ${counts[level]}`).join(', ')}); ${decks.decks.length} decks.`);
