import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 暗記カードのデータは Google スプレッドシート「German Vocabulary」が正本。
// content/learn-german/flashcards/vocabulary-sheet.json はそのスナップショットで、
// Web に表示する A〜I 列（ID・レベル・分類・表・裏・例文・例文の和訳・品詞・文法・用法・注意）と
// 「場面」列（「、」区切りの場面名）だけを含む。場面名とキーの対応と場面別教材の収録順は scene-decks.json にある。

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(rootDir, "content/learn-german/flashcards");
const outputDir = path.join(rootDir, "assets/data/learn-german/flashcards");
const read = name => JSON.parse(fs.readFileSync(path.join(contentDir, name), "utf8"));

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const MINUTES_PER_CARD = 0.5;
const unitTypes = { 単語: "word", 熟語: "phrase", その他: "other" };
const partOfSpeechByLabel = new Map([
  ["名詞", "noun"], ["名詞（形容詞型変化）", "noun"], ["動詞", "verb"], ["形容詞", "adjective"], ["形容詞・副詞", "adjective"],
  ["副詞", "adverb"], ["表現", "phrase"], ["数詞", "numeral"], ["前置詞", "preposition"], ["代名詞", "pronoun"],
  ["間投詞", "interjection"], ["接続詞", "conjunction"], ["不変化詞", "particle"], ["略語", "abbreviation"]
]);

function partOfSpeechFor(grammar, unitType) {
  const label = grammar.split(" / ")[0].trim();
  return partOfSpeechByLabel.get(label) || (unitType === "phrase" ? "phrase" : "other");
}

const sheet = read("vocabulary-sheet.json");
const scenes = read("scene-decks.json");
const columns = sheet.columns;
const expectedColumns = ["card_id", "level", "category", "display_de", "japanese", "example_de", "example_ja", "grammar", "usage_note", "scene"];
if (JSON.stringify(columns) !== JSON.stringify(expectedColumns)) throw new Error(`Unexpected sheet columns: ${columns.join(", ")}`);

const sceneKeyByLabel = new Map(Object.entries(scenes.scene_labels).filter(([scene]) => scene !== "general").map(([scene, label]) => [label, scene]));

function sceneTagsFor(cardId, value) {
  return value.split("、").map(label => label.trim()).filter(Boolean).map(label => {
    const scene = sceneKeyByLabel.get(label);
    if (!scene) throw new Error(`${cardId}: unknown scene ${label}`);
    return scene;
  });
}
const cards = sheet.rows.map(row => {
  const entry = Object.fromEntries(columns.map((key, index) => [key, row[index]]));
  const unitType = unitTypes[entry.category];
  if (!unitType) throw new Error(`${entry.card_id}: unknown category ${entry.category}`);
  if (!levels.includes(entry.level)) throw new Error(`${entry.card_id}: unknown level ${entry.level}`);
  const card = {
    card_id: entry.card_id,
    primary_level: entry.level,
    unit_type: unitType,
    category_ja: entry.category,
    part_of_speech: partOfSpeechFor(entry.grammar, unitType),
    display_de: entry.display_de,
    japanese: entry.japanese,
    example_de: entry.example_de,
    example_ja: entry.example_ja,
    grammar_ja: entry.grammar
  };
  if (entry.usage_note) card.usage_note_ja = entry.usage_note;
  const tags = sceneTagsFor(entry.card_id, entry.scene || "");
  if (tags.length) card.scene_tags = tags;
  return card;
});

const byId = new Map(cards.map(card => [card.card_id, card]));
if (byId.size !== cards.length) throw new Error("Duplicate card IDs in the sheet snapshot.");
const cardsByLevel = Object.fromEntries(levels.map(level => [level, cards.filter(card => card.primary_level === level)]));
const levelCounts = Object.fromEntries(levels.map(level => [level, cardsByLevel[level].length]));
if (JSON.stringify(levelCounts) !== JSON.stringify(sheet.level_counts) || cards.length !== sheet.total) {
  throw new Error("Level counts differ from the sheet snapshot.");
}

const fileFor = card => `cards-${card.primary_level.toLowerCase()}.json`;
const count = value => value.toLocaleString("ja-JP");
const levelNote = "レベルは、J-Connectが独自に編集・配置した学習用の目安です。公式の試験範囲や必修語数を示すものではありません。";

function deck(deckId, title, description, ids, { scenes: deckScenes = ["general"], target = null, kind = "scene-practice", featured = false } = {}) {
  const deckCards = ids.map(id => byId.get(id));
  if (deckCards.some(card => !card)) throw new Error(`Missing card in ${deckId}`);
  const range = kind === "cefr-all" ? "A1–C2" : "場面別";
  return {
    deck_id: deckId,
    title_ja: title,
    description_ja: description,
    primary_level: target || range,
    target_level: target || range,
    levels: levels.filter(level => deckCards.some(card => card.primary_level === level)),
    scenes: deckScenes,
    scene_labels: deckScenes.map(scene => scenes.scene_labels[scene]),
    deck_kind: kind,
    card_count: ids.length,
    estimated_minutes: Math.ceil(ids.length * MINUTES_PER_CARD),
    card_files: [...new Set(deckCards.map(fileFor))],
    card_ids: ids,
    has_unclassified: false,
    featured
  };
}

const levelTitles = {
  A1: ["a1-life-basics", "身近な語彙"],
  A2: ["a2-daily-independence", "日常の語彙"],
  B1: ["b1-explain-and-confirm", "社会生活の語彙"],
  B2: ["b2-negotiate-and-document", "幅広い話題の語彙"],
  C1: ["c1-broad-repertoire", "専門・抽象的な語彙"],
  C2: ["c2-nuance-repertoire", "高度な語彙"]
};
const levelDecks = levels.map(level => {
  const [deckId, title] = levelTitles[level];
  return deck(deckId, `${level} ${title}・${count(levelCounts[level])}項目`, levelNote, cardsByLevel[level].map(card => card.card_id), { target: level, kind: "cefr-level", featured: true });
});
const sceneDescriptions = {
  practice: "生活場面でよく使う語彙・表現をまとめた練習です。",
  scene: "生活場面ごとに選んだ語彙・表現集です。"
};
const sceneDecks = scenes.scene_decks.map(entry => deck(
  entry.deck_id,
  entry.title_ja,
  entry.deck_id.startsWith("scene-") ? sceneDescriptions.scene : sceneDescriptions.practice,
  entry.card_ids.filter(id => byId.has(id)),
  { scenes: entry.scenes }
));
const allLevels = deck(
  "all-levels-4000",
  `A1〜C2 全レベル・${count(cards.length)}項目`,
  "すべてのレベルの語彙をまとめて検索・学習できます。",
  levels.flatMap(level => cardsByLevel[level].map(card => card.card_id)),
  { kind: "cefr-all", featured: true }
);
// 全レベル教材のカードIDはレベル別教材の連結と同じなので、decks.json を軽くするため参照だけを持つ。
delete allLevels.card_ids;
allLevels.card_ids_from_decks = levelDecks.map(entry => entry.deck_id);
const decks = [allLevels, ...levelDecks, ...sceneDecks];

const sources = [
  { source_id: "freedict-deu-jpn", title: "FreeDict German–Japanese dictionary 2025.11.23", license: "CC BY-SA 3.0", url: "https://download.freedict.org/dictionaries/deu-jpn/2025.11.23/" },
  { source_id: "freedict-jpn-deu", title: "FreeDict Japanese–German dictionary 0.2.0", license: "CC BY-SA 3.0", url: "https://download.freedict.org/dictionaries/jpn-deu/0.2.0/" },
  { source_id: "jmdict", title: "JMdict（Electronic Dictionary Research and Development Group）", license: "CC BY-SA 4.0", url: "https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project" },
  { source_id: "wiktionary", title: "Wiktionary（English Wiktionary, German entries）", license: "CC BY-SA 4.0", url: "https://en.wiktionary.org/" },
  { source_id: "wikimatrix", title: "WikiMatrix（Wikipedia contributors; Schwenk et al. 2019, via OPUS）", license: "CC BY-SA 4.0", url: "https://opus.nlpl.eu/WikiMatrix.php" },
  { source_id: "tatoeba", title: "Tatoeba（German–Japanese sentences and their contributors）", license: "CC BY 2.0 FR", url: "https://tatoeba.org/" }
];

const updatedAt = sheet.source.exported_on;
const decksPayload = {
  schema_version: 3,
  updated_at: updatedAt,
  level_note_ja: levelNote,
  storage_note_ja: "学習記録はカードIDごとにこの端末へ保存されます。カードを更新しても、同じIDの記録はそのまま引き継がれます。",
  level_counts: levelCounts,
  total_card_count: cards.length,
  scene_labels: scenes.scene_labels,
  card_sources: Object.fromEntries(levels.map(level => [level, `cards-${level.toLowerCase()}.json`])),
  credits_url: "#flashcardsSources",
  sources,
  decks
};

fs.mkdirSync(outputDir, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(outputDir, name), `${JSON.stringify(value)}\n`);
for (const level of levels) {
  write(`cards-${level.toLowerCase()}.json`, { schema_version: 3, level, level_card_count: levelCounts[level], updated_at: updatedAt, cards: cardsByLevel[level] });
}
write("decks.json", decksPayload);
for (const obsolete of ["cards-practical.json", "vocabulary-audit.csv", "vocabulary-audit.json"]) {
  fs.rmSync(path.join(outputDir, obsolete), { force: true });
}
console.log(JSON.stringify({ published: cards.length, level_counts: levelCounts, decks: decks.length, scene_cards: cards.filter(card => card.scene_tags).length }));
