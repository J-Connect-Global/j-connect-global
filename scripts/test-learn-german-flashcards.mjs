import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'assets/data/learn-german/flashcards');
const sourceDir = path.join(root, 'content/learn-german/flashcards');
const read = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const levels = ['A1','A2','B1','B2','C1','C2'];
const decks = read(dataDir, 'decks.json');
const legacy = read(sourceDir, 'legacy-card-index.json');
const evidence = read(sourceDir, 'level-evidence.json');
const audit = read(dataDir, 'vocabulary-audit.json');
const legacyMap = new Map(legacy.entries.map(row => [row[0], row]));
const counts = {};
const cards = [];
for (const level of [...levels, null]) {
  const payload = read(dataDir, `cards-${level?.toLowerCase() || 'practical'}.json`);
  assert.equal(payload.schema_version, 2);
  assert.equal(payload.level, level);
  assert.equal(payload.level_card_count, payload.cards.length);
  if (level) counts[level] = payload.cards.length;
  for (const card of payload.cards) assert.equal(card.primary_level, level, `${card.card_id}: file placement`);
  cards.push(...payload.cards);
}
const cardMap = new Map(cards.map(card => [card.card_id, card]));
assert.equal(cardMap.size, cards.length, 'unique IDs');
assert.deepEqual(decks.level_counts, counts, 'counts reflect published items, never quotas');
assert.equal(decks.total_card_count, cards.length);
assert.equal(decks.cefr_card_count, cards.filter(card => card.primary_level).length);
assert.equal(legacyMap.size, 4000, 'immutable pre-repair baseline');
assert.deepEqual(Object.keys(evidence.assignments).sort(), [...legacyMap.keys()].sort(), 'every old item audited');
const docs = new Map(evidence.documents.map(doc => [doc.source_id, doc]));
for (const doc of docs.values()) {
  assert.match(doc.sha256, /^[a-f0-9]{64}$/);
  assert.equal(new URL(doc.url).hostname, 'www.goethe.de');
}
const editorialAliases = new Map([
  ['b1-004', 'etwas in Anspruch nehmen'], ['b2-003', 'unter der Voraussetzung, dass'],
  ['b2-004', 'etwas in Betracht ziehen'], ['b2-049', 'einen Vorschlag unterbreiten']
]);
for (const card of cards) {
  assert.match(card.card_id, /^(?:a1|a2|b1|b2|c1|c2)-\d{3,4}$/);
  for (const field of ['lemma','display_de','japanese','example_de','example_ja','learning_note','verification_status']) assert(card[field], `${card.card_id}: ${field}`);
  assert(/[ぁ-んァ-ン一-龯]/.test(card.japanese));
  assert(/[ぁ-んァ-ン一-龯]/.test(card.example_ja));
  assert(!/[ぁ-んァ-ン一-龯]/.test(card.example_de));
  assert.equal(card.verified_at, null, 'no invented expert review date');
  assert.notEqual(card.quality_tier, 'editorial-reviewed');
  const old = legacyMap.get(card.card_id);
  if (old) assert.equal(card.lemma, editorialAliases.get(card.card_id) || old[1], 'old ID cannot be assigned to another word');
  assert(card.level_assignment?.label_ja && card.level_assignment.rationale_ja);
  assert.notEqual(card.level_basis, 'j-connect-frequency-model');
  if (['A1','A2','B1'].includes(card.primary_level)) {
    const decision = evidence.assignments[card.card_id];
    assert.equal(decision.status, 'exam-list-attestation');
    assert.equal(decision.matches[0].level, card.primary_level, 'earliest attested list');
    assert.equal(card.level_basis, 'exam-list-attestation');
    assert(card.level_assignment.evidence.length);
    for (const reference of card.level_assignment.evidence) {
      const doc = docs.get(reference.source_id);
      assert(doc);
      assert(reference.pages.every(page => Number.isInteger(page) && page > 0 && page <= doc.pages));
      assert(reference.url.startsWith(doc.url + '#page='));
      assert(decision.matches.some(match => match.source_id === reference.source_id && match.matched_lemma === reference.matched_lemma));
    }
  } else if (card.primary_level) {
    assert.equal(card.level_basis, 'cefr-descriptor-editorial-target');
    assert.equal(card.unit_type, 'collocation');
    assert(card.practice_prompt_ja && card.task_type, 'advanced work must have a contextual task');
    assert.match(card.level_assignment.rationale_ja, /認定/);
    assert.equal(card.level_assignment.evidence[0].source_id, 'cefr-companion-2020');
    assert(!evidence.assignments[card.card_id]?.level, 'cannot promote an attested beginner item');
    if (card.primary_level === 'C2') assert.equal(card.task_type, 'register-and-connotation');
  } else {
    assert.equal(card.level_basis, 'unclassified-practical');
    assert.deepEqual(card.level_tags, []);
    assert.deepEqual(card.level_assignment.evidence, []);
  }
  if (card.example_source.source_id === 'tatoeba') {
    assert(card.example_source.sentence_id && card.example_source.translation_id);
    assert.equal(card.example_source.license, 'CC BY 2.0 FR');
    assert(card.source_refs.includes('tatoeba'));
  } else assert.equal(card.example_source.source_id, 'j-connect-original');
}
// Independent concrete failures reported in the old upper-level material.
for (const [lemma, level, page] of [
  ['abfahren','A1',9], ['Briefmarke','A1',12], ['Kugelschreiber','A1',19],
  ['Quittung','B1',72], ['vierundzwanzig','A1',7], ['sich beeilen','A2',10]
]) {
  const matches = cards.filter(card => card.lemma === lemma);
  assert.equal(matches.length, 1, `${lemma}: one canonical item`);
  assert.equal(matches[0].primary_level, level, `${lemma}: reference placement`);
  assert(matches[0].level_assignment.evidence[0].pages.includes(page), `${lemma}: physical PDF page`);
}
for (const lemma of ['Henry','WikiLeaks']) assert(!cards.some(card => card.lemma === lemma), `${lemma}: excluded proper name`);
for (const [id, decision] of Object.entries(evidence.assignments)) {
  if (decision.status.startsWith('withheld-') || decision.status === 'duplicate') assert(!cardMap.has(id), `${id}: withheld cannot leak into materials`);
}
assert.equal(audit.rows.length, legacy.entries.length + cards.filter(card => !legacyMap.has(card.card_id)).length);
assert.equal(new Set(audit.rows.map(row => row.card_id)).size, audit.rows.length);
for (const row of audit.rows) {
  const old = legacyMap.get(row.card_id);
  assert.equal(row.previous_level, old?.[2] || '');
  assert.equal(row.current_level, cardMap.get(row.card_id)?.primary_level || '');
}
assert.equal(audit.summary.legacy_withheld, legacy.entries.filter(([id]) => !cardMap.has(id)).length);
assert.deepEqual(audit.summary, decks.audit_summary);
assert.equal(audit.summary.legacy_total, audit.summary.legacy_published + audit.summary.legacy_withheld);
assert.equal(cards.length, audit.summary.legacy_published + audit.summary.new_items);
assert.equal(decks.decks.length, 18, 'existing deck URLs retained');
for (const deck of decks.decks) {
  assert.equal(deck.card_count, deck.card_ids.length);
  assert.equal(new Set(deck.card_ids).size, deck.card_ids.length);
  for (const id of deck.card_ids) {
    const card = cardMap.get(id);
    assert(card, `${deck.deck_id}: known item ${id}`);
    const file = `cards-${card.primary_level?.toLowerCase() || 'practical'}.json`;
    assert(deck.card_files.includes(file), `${id}: loading follows new placement, not old ID prefix`);
    if (deck.deck_kind === 'cefr-level') assert.equal(card.primary_level, deck.target_level);
    if (deck.deck_kind === 'cefr-all') assert(card.primary_level, 'unclassified scene words excluded');
  }
}
for (const level of levels) assert.equal(decks.decks.find(deck => deck.deck_kind === 'cefr-level' && deck.target_level === level).card_count, counts[level]);
const html = fs.readFileSync(path.join(root, 'germany/ja/learn-german/flashcards/index.html'), 'utf8');
for (const id of ['flashcardPractice','flashcardPracticePrompt','flashcardLevelBasis','flashcardBasisSummary','flashcardsSources','flashcardsVocabularyStatus','flashcardsBackup','flashcardsRestore']) assert(html.includes(`id="${id}"`));
for (const claim of ['下位レベルの語彙は含みません','レベル別4,000語','全4,000枚に','3,797枚']) assert(!html.includes(claim), `remove unsupported claim: ${claim}`);
// Regeneration must preserve the complete published corpus and audit, byte for byte.
const generatedFiles = fs.readdirSync(dataDir).filter(name => /^(cards-.*\.json|decks\.json|vocabulary-audit\.(json|csv))$/.test(name));
const before = new Map(generatedFiles.map(name => [name, fs.readFileSync(path.join(dataDir, name))]));
const result = spawnSync(process.execPath, ['scripts/generate-learn-german-flashcards.mjs'], { cwd: root, encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr);
for (const [name, buffer] of before) assert.deepEqual(fs.readFileSync(path.join(dataDir, name)), buffer, `${name}: reproducible generation`);
const extractionTests = spawnSync('python3', ['scripts/test-german-vocabulary-audit.py'], { cwd: root, encoding: 'utf8' });
assert.equal(extractionTests.status, 0, extractionTests.stderr);
console.log(`Vocabulary evidence contracts passed: ${cards.length} published items; ${audit.summary.legacy_withheld} legacy items withheld, all ${legacy.entries.length} accounted for.`);
