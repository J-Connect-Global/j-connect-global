import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(rootDir, "assets/data/learn-german/flashcards");
const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const levelCounts = { A1: 650, A2: 650, B1: 1100, B2: 1600, C1: 3000, C2: 3000 };
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
  assert.equal(payload.cards.length, levelCounts[level], `${level} level-only count`);
  assert.equal(payload.level_card_count, levelCounts[level], `${level} declared level-only count`);
  assert.equal(Object.hasOwn(payload, "cumulative_target"), false, `${level} must not expose a cumulative target`);
  cardsByLevel.set(level, payload.cards);

  const editorial = payload.cards.filter(card => card.quality_tier === "editorial-reviewed");
  assert.equal(editorial.length, ["A1", "A2", "B1", "B2"].includes(level) ? 50 : 0, `${level} editorial count`);
  if (editorial.length) {
    const sceneSet = new Set(editorial.flatMap(card => card.scene_tags));
    requiredScenes.forEach(scene => assert(sceneSet.has(scene), `${level} editorial cards must cover ${scene}`));
  }

  payload.cards.forEach(card => {
    requiredCardFields.forEach(field => assert(Object.hasOwn(card, field), `${card.card_id} missing ${field}`));
    assert.match(card.card_id, /^(?:a1|a2|b1|b2|c1|c2)-\d{3,4}$/);
    assert.equal(card.primary_level, level);
    assert(["word", "phrase", "collocation"].includes(card.unit_type), `${card.card_id} unit type`);
    assert(card.scene_tags.length > 0, `${card.card_id} scenes`);
    assert(!/[ぁ-んァ-ン一-龯]/.test(`${card.lemma} ${card.display_de} ${card.example_de} ${card.related_terms.join(" ")}`), `${card.card_id} has Japanese text in German fields`);
    assert(/[ぁ-んァ-ン一-龯]/.test(card.japanese), `${card.card_id} needs Japanese meaning`);

    if (card.quality_tier === "editorial-reviewed") {
      assert.equal(card.verification_status, "j-connect-editorial-reviewed");
      assert(/[.!?]$/.test(card.example_de), `${card.card_id} German example punctuation`);
      assert(/[ぁ-んァ-ン一-龯]/.test(card.example_ja), `${card.card_id} Japanese example`);
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
    } else {
      assert.equal(card.quality_tier, "reference");
      assert.equal(card.verification_status, "source-aligned-needs-editorial-review");
      assert.equal(card.example_de, "");
      assert.equal(card.example_ja, "");
      assert(card.source_refs.includes("freedict-deu-jpn"), `${card.card_id} FreeDict attribution`);
      assert(card.source_refs.includes("leipzig-corpora"), `${card.card_id} Leipzig attribution`);
      assert(Number.isInteger(card.frequency_rank), `${card.card_id} frequency rank`);
    }
  });
  cards.push(...payload.cards);
}

assert.equal(cards.length, 10000, "total card count");
assert.equal(new Set(cards.map(card => card.card_id)).size, 10000, "card IDs must be unique");
assert.equal(new Set(cards.map(card => card.lemma)).size, 10000, "lemmas must be unique with German case preserved");
assert.equal(cards.filter(card => card.quality_tier === "editorial-reviewed").length, 200, "editorial total");
assert.equal(cards.filter(card => card.quality_tier === "reference").length, 9800, "reference total");

const deckPayload = readJson("decks.json");
assert.equal(deckPayload.schema_version, 2);
assert.match(deckPayload.level_note_ja, /公式の全単語リストはありません/);
assert.match(deckPayload.level_note_ja, /J-Connect独自/);
assert.match(deckPayload.level_note_ja, /下位レベルの語彙は含みません/);
assert.match(deckPayload.quality_note_ja, /9,800/);
assert.deepEqual(deckPayload.level_counts, levelCounts);
assert.equal(deckPayload.total_card_count, 10000);
assert.equal(Object.hasOwn(deckPayload, "cumulative_targets"), false, "deck payload must not expose cumulative targets");
assert.equal(Object.hasOwn(deckPayload, "incremental_counts"), false, "deck payload must use level-only terminology");
assert.equal(deckPayload.decks.length, 17, "six comprehensive, four editorial and seven scene decks");
assert.equal(deckPayload.sources.find(source => source.source_id === "freedict-deu-jpn")?.license, "CC BY-SA 3.0");
const cardsById = new Map(cards.map(card => [card.card_id, card]));
deckPayload.decks.forEach(deck => {
  assert.equal(deck.card_count, deck.card_ids.length, `${deck.deck_id} card count`);
  assert.equal(new Set(deck.card_ids).size, deck.card_ids.length, `${deck.deck_id} must not duplicate IDs`);
  assert(deck.card_ids.every(cardId => cardsById.has(cardId)), `${deck.deck_id} references unknown cards`);
  assert(deck.card_files.every(fileName => fs.existsSync(path.join(dataDir, fileName))), `${deck.deck_id} file reference`);
});

levels.forEach(level => {
  const levelDeck = deckPayload.decks.find(deck => deck.deck_kind === "cefr-level" && deck.target_level === level);
  assert(levelDeck, `${level} level-only deck`);
  assert.equal(levelDeck.card_count, levelCounts[level], `${level} level-only count`);
  assert.deepEqual(levelDeck.card_ids, cardsByLevel.get(level).map(card => card.card_id), `${level} level-only inventory`);
  assert.deepEqual(levelDeck.card_files, [`cards-${level.toLowerCase()}.json`], `${level} must load only its own card file`);
});

for (let leftIndex = 0; leftIndex < levels.length; leftIndex += 1) {
  const leftLevel = levels[leftIndex];
  const leftDeck = deckPayload.decks.find(deck => deck.deck_kind === "cefr-level" && deck.target_level === leftLevel);
  const leftIds = new Set(leftDeck.card_ids);
  const leftLemmas = new Set(cardsByLevel.get(leftLevel).map(card => card.lemma.normalize("NFC")));
  for (const rightLevel of levels.slice(leftIndex + 1)) {
    const rightDeck = deckPayload.decks.find(deck => deck.deck_kind === "cefr-level" && deck.target_level === rightLevel);
    const sharedIds = rightDeck.card_ids.filter(cardId => leftIds.has(cardId));
    const sharedLemmas = cardsByLevel.get(rightLevel).filter(card => leftLemmas.has(card.lemma.normalize("NFC")));
    assert.deepEqual(sharedIds, [], `${leftLevel}/${rightLevel} deck card overlap must be zero`);
    assert.deepEqual(sharedLemmas, [], `${leftLevel}/${rightLevel} lemma overlap must be zero`);
  }
}

for (const level of ["A1", "A2", "B1", "B2"]) {
  const editorial = deckPayload.decks.find(deck => deck.deck_kind === "editorial-practice" && deck.target_level === level);
  assert(editorial, `${level} editorial deck`);
  assert.equal(editorial.card_count, 50);
  assert(editorial.card_ids.every(id => cardsById.get(id).quality_tier === "editorial-reviewed"));
}
requiredScenes.forEach(scene => assert(deckPayload.decks.some(deck => deck.scenes.length === 1 && deck.scenes[0] === scene), `scene deck ${scene}`));

const hubHtml = fs.readFileSync(path.join(rootDir, "germany/ja/learn-german/index.html"), "utf8");
assert.equal((hubHtml.match(/class="learn-pillar-ribbon"[\s\S]*?<\/nav>/)?.[0].match(/<a\b/g) || []).length, 4, "hub pillar ribbon must have four links");
assert(hubHtml.includes('id="original-web-tools"'), "hub original tools section");
assert(hubHtml.includes('data-filter-value="C2"'), "hub C2 filter");
assert(hubHtml.includes("合計10,000語"), "hub level-only vocabulary total copy");

const flashcardsHtml = fs.readFileSync(path.join(rootDir, "germany/ja/learn-german/flashcards/index.html"), "utf8");
for (const id of ["flashcardFlip", "flashcardsResults", "flashcardsDownloadCsv", "flashcardsBackup", "flashcardsRestore", "flashcardsResetDialog", "flashcardsSources"]) {
  assert(flashcardsHtml.includes(`id="${id}"`), `flashcards page missing ${id}`);
}
assert(flashcardsHtml.includes("A1・A2・B1・B2・C1・C2・レベル別10,000語"), "A1-C2 level-only title");
assert(flashcardsHtml.includes("下位レベルの語彙を含めず"), "level-only explanation");
assert(flashcardsHtml.includes("残り9,800枚"), "quality distinction");
assert(!/<script\b[^>]*src=["']https?:\/\//i.test(flashcardsHtml), "flashcards page must not load external scripts");
assert(fs.existsSync(path.join(dataDir, "NOTICE.md")), "vocabulary license notice");

console.log("Learn German flashcard contracts passed (10,000 unique A1-C2 cards, six non-overlapping level decks, 17 decks total).");
