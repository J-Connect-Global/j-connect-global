import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(rootDir, "assets/data/learn-german/flashcards");
const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const levelCounts = { A1: 36, A2: 35, B1: 53, B2: 55, C1: 33, C2: 5 };
const totalCardCount = Object.values(levelCounts).reduce((sum, count) => sum + count, 0);
const requiredScenes = ["daily", "shopping", "administration", "medical", "housing", "kita-school", "work"];
const requiredCardFields = [
  "card_id", "lemma", "display_de", "unit_type", "part_of_speech", "primary_level", "level_tags",
  "topic_tags", "scene_tags", "japanese", "example_de", "example_ja", "grammar", "collocations",
  "learning_note", "related_terms", "source_note", "source_refs", "quality_tier", "verification_status",
  "updated_at", "verified_at"
];

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8"));
}

const cards = [];
const cardsByLevel = new Map();
for (const level of levels) {
  const payload = readJson(`cards-${level.toLowerCase()}.json`);
  assert.equal(payload.schema_version, 2, `${level} schema version`);
  assert.equal(payload.level, level, `${level} payload level`);
  assert.equal(payload.cards.length, levelCounts[level], `${level} reviewed count`);
  assert.equal(payload.level_card_count, levelCounts[level], `${level} declared reviewed count`);
  cardsByLevel.set(level, payload.cards);

  payload.cards.forEach(card => {
    requiredCardFields.forEach(field => assert(Object.hasOwn(card, field), `${card.card_id} missing ${field}`));
    assert.match(card.card_id, /^(?:a1|a2|b1|b2|c1|c2)-\d{3,4}$/);
    assert.equal(card.primary_level, level, `${card.card_id} primary level`);
    assert.deepEqual(card.level_tags, [level], `${card.card_id} must have one reviewed level`);
    assert(["word", "phrase", "collocation"].includes(card.unit_type), `${card.card_id} unit type`);
    assert(card.scene_tags.length > 0, `${card.card_id} scenes`);
    assert(!/[ぁ-んァ-ン一-龯]/.test(`${card.lemma} ${card.display_de} ${card.example_de} ${card.related_terms.join(" ")}`), `${card.card_id} has Japanese text in German fields`);
    assert(/[ぁ-んァ-ン一-龯]/.test(card.japanese), `${card.card_id} needs Japanese meaning`);
    assert(/[.!?]$/.test(card.example_de), `${card.card_id} German example punctuation`);
    assert(/[ぁ-んァ-ン一-龯]/.test(card.example_ja), `${card.card_id} needs a Japanese example`);
    assert(card.learning_note.trim(), `${card.card_id} learning note`);
    assert.equal(card.quality_tier, "editorial-reviewed", `${card.card_id} public quality`);
    assert.equal(card.verification_status, "j-connect-editorial-reviewed", `${card.card_id} public verification`);
    assert(card.source_refs.includes("j-connect-editorial"), `${card.card_id} editorial source`);

    if (card.part_of_speech === "noun") {
      assert(card.grammar.article, `${card.card_id} noun article`);
      assert(card.grammar.plural, `${card.card_id} noun plural`);
    }
    if (card.part_of_speech === "verb") {
      assert(card.grammar.third_person, `${card.card_id} third person`);
      assert(card.grammar.past_participle, `${card.card_id} participle`);
      assert(card.grammar.auxiliary, `${card.card_id} auxiliary`);
      assert.equal(typeof card.grammar.separable, "boolean", `${card.card_id} separable flag`);
      assert.equal(typeof card.grammar.reflexive, "boolean", `${card.card_id} reflexive flag`);
    }
  });
  cards.push(...payload.cards);
}

assert.equal(cards.length, totalCardCount, "total reviewed card count");
assert.equal(new Set(cards.map(card => card.card_id)).size, totalCardCount, "card IDs must be unique");
assert.equal(new Set(cards.map(card => card.lemma.normalize("NFC"))).size, totalCardCount, "lemmas must be unique");
assert.equal(cards.every(card => card.example_de && card.example_ja), true, "every public card has examples");
assert.equal(cards.some(card => ["おはよーん", "ピンクな"].includes(card.japanese)), false, "known mistranslations must stay out");

function expectCard(search, expectedLevel, expectedJapanese) {
  const card = cards.find(candidate => candidate.lemma === search || candidate.display_de === search);
  assert(card, `missing reviewed card: ${search}`);
  assert.equal(card.primary_level, expectedLevel, `${search} level`);
  assert.equal(card.japanese, expectedJapanese, `${search} Japanese`);
  return card;
}

expectCard("guten Morgen", "A1", "おはようございます");
expectCard("pink", "A1", "ピンク色の");
expectCard("Daumen", "A2", "親指");
expectCard("Musical", "A2", "ミュージカル");
expectCard("Wahrnehmung", "C1", "知覚、認識");
expectCard("mitnichten", "C2", "決して〜ではない、まったく〜ない");

const deckPayload = readJson("decks.json");
assert.equal(deckPayload.schema_version, 2);
assert.match(deckPayload.level_note_ja, /公式の全単語リストではありません/);
assert.match(deckPayload.level_note_ja, /個別に確認/);
assert.match(deckPayload.quality_note_ja, /公開カードはすべて/);
assert.match(deckPayload.quality_note_ja, /未校閲の辞書項目は.*含めません/);
assert.deepEqual(deckPayload.level_counts, levelCounts);
assert.equal(deckPayload.total_card_count, totalCardCount);
assert.equal(deckPayload.decks.length, 14, "one combined, six level and seven scene decks");
assert.equal(deckPayload.sources.some(source => source.source_id === "freedict-deu-jpn"), false, "raw dictionary source must not be published");

const cardsById = new Map(cards.map(card => [card.card_id, card]));
deckPayload.decks.forEach(deck => {
  assert.equal(deck.card_count, deck.card_ids.length, `${deck.deck_id} card count`);
  assert.equal(new Set(deck.card_ids).size, deck.card_ids.length, `${deck.deck_id} must not duplicate IDs`);
  assert(deck.card_ids.every(cardId => cardsById.has(cardId)), `${deck.deck_id} references unknown cards`);
  assert(deck.card_files.every(fileName => fs.existsSync(path.join(dataDir, fileName))), `${deck.deck_id} file reference`);
});

const combinedDeck = deckPayload.decks.find(deck => deck.deck_kind === "all-levels");
assert(combinedDeck, "combined A1-C2 deck");
assert.equal(combinedDeck.deck_id, "all-levels-reviewed");
assert.equal(combinedDeck.card_count, totalCardCount);
assert.deepEqual(combinedDeck.levels, levels);
assert.deepEqual(combinedDeck.card_files, levels.map(level => `cards-${level.toLowerCase()}.json`));

levels.forEach(level => {
  const levelDeck = deckPayload.decks.find(deck => deck.deck_kind === "cefr-level" && deck.target_level === level);
  assert(levelDeck, `${level} level deck`);
  assert.equal(levelDeck.card_count, levelCounts[level], `${level} level count`);
  assert.deepEqual(levelDeck.card_ids, cardsByLevel.get(level).map(card => card.card_id), `${level} inventory`);
  assert.deepEqual(levelDeck.card_files, [`cards-${level.toLowerCase()}.json`], `${level} loads only its own card file`);
});

for (let leftIndex = 0; leftIndex < levels.length; leftIndex += 1) {
  const leftLevel = levels[leftIndex];
  const leftIds = new Set(cardsByLevel.get(leftLevel).map(card => card.card_id));
  const leftLemmas = new Set(cardsByLevel.get(leftLevel).map(card => card.lemma.normalize("NFC")));
  for (const rightLevel of levels.slice(leftIndex + 1)) {
    assert.deepEqual(cardsByLevel.get(rightLevel).filter(card => leftIds.has(card.card_id)), [], `${leftLevel}/${rightLevel} ID overlap`);
    assert.deepEqual(cardsByLevel.get(rightLevel).filter(card => leftLemmas.has(card.lemma.normalize("NFC"))), [], `${leftLevel}/${rightLevel} lemma overlap`);
  }
}

requiredScenes.forEach(scene => {
  const sceneDeck = deckPayload.decks.find(deck => deck.deck_kind === "scene-practice" && deck.scenes.length === 1 && deck.scenes[0] === scene);
  assert(sceneDeck, `scene deck ${scene}`);
  assert(sceneDeck.card_ids.every(cardId => cardsById.get(cardId).scene_tags.includes(scene)), `${scene} deck membership`);
});

const hubHtml = fs.readFileSync(path.join(rootDir, "germany/ja/learn-german/index.html"), "utf8");
assert.equal((hubHtml.match(/class="learn-pillar-ribbon"[\s\S]*?<\/nav>/)?.[0].match(/<a\b/g) || []).length, 4, "hub pillar ribbon must have four links");
assert(hubHtml.includes('id="original-web-tools"'), "hub original tools section");
assert(hubHtml.includes('data-filter-value="C2"'), "hub C2 filter");
assert(hubHtml.includes("公開カードはすべて"), "hub reviewed quality promise");
assert.equal(/10,000|9,800/.test(hubHtml), false, "hub must not advertise unreviewed vocabulary counts");

const flashcardsHtml = fs.readFileSync(path.join(rootDir, "germany/ja/learn-german/flashcards/index.html"), "utf8");
for (const id of [
  "flashcardFlip", "flashcardFlipControl", "flashcardsSpeakExample", "flashcardsResults", "flashcardsResultStats",
  "flashcardsBreakdownSection", "flashcardsDownloadCsv", "flashcardsBackup", "flashcardsRestore", "flashcardsResetDialog",
  "flashcardsSources", "flashcardsLevelFilter", "flashcardsLevelChips", "flashcardsInventory", "flashcardsInventorySearch",
  "flashcardsInventoryStatus", "flashcardsInventorySaved", "flashcardsInventoryPartOfSpeech", "flashcardsInventoryPageSize",
  "flashcardsInventoryLevelFilter", "flashcardsInventoryLevelChips", "flashcardsInventoryBody",
  "flashcardsInventoryStudyFiltered", "flashcardsInventoryCsv"
]) {
  assert(flashcardsHtml.includes(`id="${id}"`), `flashcards page missing ${id}`);
}
const tableHead = flashcardsHtml.match(/<thead>[\s\S]*?<\/thead>/)?.[0] || "";
assert.equal((tableHead.match(/data-inventory-sort=/g) || []).length, 7, "inventory needs seven sortable columns");
assert(tableHead.includes("レベル"), "inventory level column");
assert.equal(tableHead.includes("番号"), false, "inventory number column removed");
assert.equal(tableHead.includes("品質"), false, "inventory quality column removed");
assert(flashcardsHtml.includes("編集レビュー済み"), "reviewed quality copy");
assert.equal(/10,000|9,800/.test(flashcardsHtml), false, "page must not advertise unreviewed vocabulary counts");
assert(!/<script\b[^>]*src=["']https?:\/\//i.test(flashcardsHtml), "flashcards page must not load external scripts");
assert(fs.existsSync(path.join(rootDir, "assets/js/learn-german-flashcards-inventory.js")), "lazy inventory script");
assert(fs.existsSync(path.join(dataDir, "NOTICE.md")), "editorial data notice");
assert.equal(fs.existsSync(path.join(rootDir, "content/learn-german/flashcards/cefr-lexicon-source.json")), false, "unreviewed raw lexicon removed");

const inventoryJs = fs.readFileSync(path.join(rootDir, "assets/js/learn-german-flashcards-inventory.js"), "utf8");
assert.equal(inventoryJs.includes("見出し語:"), false, "duplicate lemma label removed");
assert.equal(inventoryJs.includes("参照カード"), false, "reference quality badge removed");

console.log(`Learn German flashcard contracts passed (${totalCardCount} reviewed A1-C2 cards, six level decks, one combined deck, seven scene decks).`);
