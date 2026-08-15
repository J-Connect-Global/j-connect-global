import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).map((value, index, values) => {
  if (!value.startsWith("--")) return [];
  return [value.slice(2), values[index + 1]];
}).filter((entry) => entry.length));
const germanArchive = args.deu;
const japaneseArchive = args.jpn;
const linksArchive = args.links;
const outputPath = path.join(rootDir, "content/learn-german/flashcards/tatoeba-examples.json");
const dataDir = path.join(rootDir, "assets/data/learn-german/flashcards");

if (![germanArchive, japaneseArchive, linksArchive].every((value) => value && fs.existsSync(value))) {
  throw new Error("Usage: node scripts/prepare-tatoeba-flashcard-examples.mjs --deu <deu.tsv.bz2> --jpn <jpn.tsv.bz2> --links <links.tar.bz2>");
}

function commandLines(command, commandArgs) {
  const child = spawn(command, commandArgs, { stdio: ["ignore", "pipe", "inherit"] });
  const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  return { child, lines };
}

async function loadSentences(archive) {
  const sentences = new Map();
  const { child, lines } = commandLines("bzcat", [archive]);
  for await (const line of lines) {
    const firstTab = line.indexOf("\t");
    const secondTab = line.indexOf("\t", firstTab + 1);
    if (firstTab < 1 || secondTab < 0) continue;
    sentences.set(line.slice(0, firstTab), line.slice(secondTab + 1).trim());
  }
  const code = await new Promise((resolve) => child.once("close", resolve));
  if (code !== 0) throw new Error(`bzcat failed for ${archive}`);
  return sentences;
}

const cards = ["a1", "a2", "b1", "b2", "c1", "c2"].flatMap((level) => {
  const payload = JSON.parse(fs.readFileSync(path.join(dataDir, `cards-${level}.json`), "utf8"));
  return payload.cards.filter((card) => card.quality_tier === "reference");
});

function normalizedToken(value) {
  return String(value || "").normalize("NFKC").toLocaleLowerCase("de-DE");
}

function tokenVariants(card) {
  const lemma = normalizedToken(card.lemma);
  if (!lemma || lemma.includes(" ") || lemma.length < 2) return [lemma];
  const values = new Set([lemma]);
  if (card.part_of_speech === "verb" && lemma.endsWith("en") && lemma.length > 5) {
    const stem = lemma.slice(0, -2);
    [`${stem}e`, `${stem}st`, `${stem}t`, `${stem}en`].forEach((value) => values.add(value));
  }
  if (card.part_of_speech === "adjective" && lemma.length > 4) {
    ["e", "en", "em", "er", "es"].forEach((suffix) => values.add(`${lemma}${suffix}`));
  }
  return [...values];
}

const tokensToLemmas = new Map();
const phrases = [];
cards.forEach((card) => {
  const lemma = String(card.lemma);
  const normalized = normalizedToken(lemma);
  if (normalized.includes(" ")) {
    phrases.push({ lemma, normalized });
    return;
  }
  tokenVariants(card).forEach((token) => {
    if (!tokensToLemmas.has(token)) tokensToLemmas.set(token, new Set());
    tokensToLemmas.get(token).add(lemma);
  });
});

const german = await loadSentences(germanArchive);
const japanese = await loadSentences(japaneseArchive);
const candidates = new Map();
const rejectedPattern = /\b(?:Tom|Maria|Mary|Boston)\b/i;

function candidateScore(germanText, exact) {
  const namePenalty = rejectedPattern.test(germanText) ? 250 : 0;
  return germanText.length + namePenalty + (exact ? 0 : 35);
}

function consider(lemma, germanId, japaneseId, germanText, japaneseText, exact) {
  if (germanText.length < 8 || germanText.length > 150 || japaneseText.length < 3 || japaneseText.length > 120) return;
  if (!/[.!?…]$/.test(germanText) || !/[ぁ-んァ-ン一-龯]/.test(japaneseText)) return;
  const score = candidateScore(germanText, exact);
  const previous = candidates.get(lemma);
  if (previous && previous.score <= score) return;
  candidates.set(lemma, {
    lemma,
    example_de: germanText,
    example_ja: japaneseText,
    tatoeba_sentence_id: Number(germanId),
    tatoeba_translation_id: Number(japaneseId),
    score
  });
}

function inspectPair(germanId, japaneseId) {
  const germanText = german.get(germanId);
  const japaneseText = japanese.get(japaneseId);
  if (!germanText || !japaneseText) return;
  const normalizedSentence = normalizedToken(germanText);
  const words = normalizedSentence.match(/[\p{L}\p{M}ßäöü-]+/gu) || [];
  new Set(words).forEach((word) => {
    const lemmas = tokensToLemmas.get(word);
    if (!lemmas) return;
    lemmas.forEach((lemma) => consider(lemma, germanId, japaneseId, germanText, japaneseText, word === normalizedToken(lemma)));
  });
  phrases.forEach(({ lemma, normalized }) => {
    if (normalizedSentence.includes(normalized)) consider(lemma, germanId, japaneseId, germanText, japaneseText, true);
  });
}

const { child: linksChild, lines: linkLines } = commandLines("tar", ["-xOjf", linksArchive, "links.csv"]);
for await (const line of linkLines) {
  const [left, right] = line.split("\t");
  if (!left || !right) continue;
  if (german.has(left) && japanese.has(right)) inspectPair(left, right);
  else if (german.has(right) && japanese.has(left)) inspectPair(right, left);
}
const linksCode = await new Promise((resolve) => linksChild.once("close", resolve));
if (linksCode !== 0) throw new Error("Could not read Tatoeba links export.");

const entries = [...candidates.values()]
  .map(({ score, ...entry }) => entry)
  .sort((left, right) => left.lemma.localeCompare(right.lemma, "de"));
fs.writeFileSync(outputPath, `${JSON.stringify({
  schema_version: 1,
  retrieved_at: "2026-08-15",
  license: "CC BY 2.0 FR",
  source_url: "https://tatoeba.org/en/downloads",
  selection_note: "Shortest suitable German sentence with a linked Japanese translation; automatically matched and not individually editorially reviewed.",
  entries
}, null, 2)}\n`, "utf8");
console.log(`Prepared ${entries.length} Tatoeba examples for ${cards.length} reference cards.`);
