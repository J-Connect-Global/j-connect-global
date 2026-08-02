import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(rootDir, "assets/data/learn-german/flashcards");
const levels = ["A1", "A2", "B1", "B2"];
const requiredScenes = ["daily", "shopping", "administration", "medical", "housing", "kita-school", "work"];
const requiredCardFields = [
  "card_id", "lemma", "display_de", "unit_type", "part_of_speech", "primary_level", "level_tags",
  "topic_tags", "scene_tags", "japanese", "example_de", "example_ja", "grammar", "collocations",
  "learning_note", "source_note", "verification_status", "updated_at", "verified_at"
];

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8"));
}

const cards = [];
for (const level of levels) {
  const payload = readJson(`cards-${level.toLowerCase()}.json`);
  assert.equal(payload.schema_version, 1, `${level} schema version`);
  assert.equal(payload.level, level, `${level} payload level`);
  assert.equal(payload.cards.length, 50, `${level} must contain exactly 50 cards`);
  const sceneSet = new Set(payload.cards.flatMap(card => card.scene_tags));
  requiredScenes.forEach(scene => assert(sceneSet.has(scene), `${level} must cover scene ${scene}`));

  payload.cards.forEach(card => {
    requiredCardFields.forEach(field => assert(Object.hasOwn(card, field), `${card.card_id} missing ${field}`));
    assert.match(card.card_id, /^[ab][12]-\d{3}$/);
    assert.equal(card.primary_level, level);
    assert(["word", "phrase", "collocation"].includes(card.unit_type), `${card.card_id} unit type`);
    assert(card.scene_tags.length > 0, `${card.card_id} scenes`);
    assert(card.scene_tags.every(scene => requiredScenes.includes(scene)), `${card.card_id} scene value`);
    assert(!/[ぁ-んァ-ン一-龯]/.test(`${card.lemma} ${card.display_de} ${card.example_de} ${card.related_terms.join(" ")}`), `${card.card_id} has Japanese text in German fields`);
    assert(/[ぁ-んァ-ン一-龯]/.test(`${card.japanese} ${card.example_ja}`), `${card.card_id} needs Japanese copy`);
    assert(/[.!?]$/.test(card.example_de), `${card.card_id} German example punctuation`);
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

assert.equal(cards.length, 200, "total card count");
assert.equal(new Set(cards.map(card => card.card_id)).size, 200, "card IDs must be unique");

const deckPayload = readJson("decks.json");
assert.equal(deckPayload.schema_version, 1);
assert.match(deckPayload.level_note_ja, /CEFR/);
assert.match(deckPayload.level_note_ja, /J-Connect独自/);
assert(deckPayload.decks.length >= 11, "level and scene decks are required");
const cardsById = new Map(cards.map(card => [card.card_id, card]));
deckPayload.decks.forEach(deck => {
  assert.equal(deck.card_count, deck.card_ids.length, `${deck.deck_id} card count`);
  assert.equal(new Set(deck.card_ids).size, deck.card_ids.length, `${deck.deck_id} must not duplicate IDs`);
  assert(deck.card_ids.every(cardId => cardsById.has(cardId)), `${deck.deck_id} references unknown cards`);
  assert(deck.card_files.every(fileName => fs.existsSync(path.join(dataDir, fileName))), `${deck.deck_id} file reference`);
});
levels.forEach(level => {
  const deck = deckPayload.decks.find(candidate => candidate.levels.length === 1 && candidate.levels[0] === level && candidate.card_count === 50);
  assert(deck, `${level} core deck with 50 cards`);
});
requiredScenes.forEach(scene => assert(deckPayload.decks.some(deck => deck.scenes.length === 1 && deck.scenes[0] === scene), `scene deck ${scene}`));

const hubHtml = fs.readFileSync(path.join(rootDir, "germany/ja/learn-german/index.html"), "utf8");
assert.equal((hubHtml.match(/class="learn-pillar-ribbon"[\s\S]*?<\/nav>/)?.[0].match(/<a\b/g) || []).length, 4, "hub pillar ribbon must have four links");
assert(hubHtml.includes('id="original-web-tools"'), "hub original tools section");
assert(hubHtml.includes('href="#original-web-tools"'), "hub original tools navigation");

const flashcardsHtml = fs.readFileSync(path.join(rootDir, "germany/ja/learn-german/flashcards/index.html"), "utf8");
for (const id of ["flashcardFlip", "flashcardsResults", "flashcardsDownloadCsv", "flashcardsBackup", "flashcardsRestore", "flashcardsResetDialog"]) {
  assert(flashcardsHtml.includes(`id="${id}"`), `flashcards page missing ${id}`);
}
assert(!/<script\b[^>]*src=["']https?:\/\//i.test(flashcardsHtml), "flashcards page must not load external scripts");

console.log("Learn German flashcard data and static contracts passed (200 cards, 11 decks).");
