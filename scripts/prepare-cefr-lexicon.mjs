import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutput = path.join(rootDir, "content/learn-german/flashcards/cefr-lexicon-source.json");
const MAX_SOURCE_ENTRIES = 10_100;

function parseArgs(argv) {
  const options = { leipzigWords: [], output: defaultOutput };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];
    if (value === "--deu-jpn" && next) options.deuJpn = path.resolve(next);
    else if (value === "--leipzig-words" && next) options.leipzigWords.push(path.resolve(next));
    else if (value === "--output" && next) options.output = path.resolve(next);
    else if (value === "--help") options.help = true;
    else throw new Error(`Unknown or incomplete argument: ${value}`);
    if (["--deu-jpn", "--leipzig-words", "--output"].includes(value)) index += 1;
  }
  return options;
}

function printHelp() {
  console.log(`Prepare the redistributable J-Connect CEFR lexicon source.

Usage:
  node scripts/prepare-cefr-lexicon.mjs \\
    --deu-jpn /path/to/deu-jpn.tei \\
    --leipzig-words /path/to/corpus-words.txt [repeatable]

Inputs:
  FreeDict deu-jpn 2025.11.23 (CC BY-SA 3.0)
  Leipzig Corpora Collection word-frequency files (CC BY)

The checked-in output is an attributed, mechanically transformed source file.
No Goethe word-list text is copied by this script.`);
}

function decodeXml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

function firstTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return decodeXml(match?.[1]);
}

function allTags(block, tagName) {
  return [...block.matchAll(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "gi"))]
    .map(match => decodeXml(match[1]))
    .filter(Boolean);
}

function entryBlocks(xml) {
  return xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) || [];
}

function translationQuotes(block, languagePattern) {
  return [...block.matchAll(/<cit\s+([^>]*)>[\s\S]*?<quote(?:\s[^>]*)?>([\s\S]*?)<\/quote>[\s\S]*?<\/cit>/gi)]
    .filter(match => /type="trans"/i.test(match[1]) && languagePattern.test(match[1]))
    .map(match => decodeXml(match[2]))
    .filter(Boolean);
}

function normalizedLemma(value) {
  return String(value || "").normalize("NFC").replace(/\s+/g, " ").trim();
}

function lemmaKey(value) {
  return normalizedLemma(value).toLocaleLowerCase("de-DE");
}

function suitableGermanLemma(value) {
  const lemma = normalizedLemma(value);
  if (!lemma || lemma.length > 64 || /^\d/.test(lemma)) return false;
  const words = lemma.split(" ");
  if (words.length > 4) return false;
  return words.every(word => /^(?:sich|etwas|jemand(?:em|en)?|[A-Za-zÄÖÜäöüßẞ][A-Za-zÄÖÜäöüßẞ'’.-]*)$/.test(word));
}

function suitableJapaneseGloss(value) {
  const gloss = normalizedLemma(value);
  return gloss.length > 0 && gloss.length <= 80 && /[ぁ-んァ-ン一-龯々]/.test(gloss);
}

function mapDirectPartOfSpeech(value) {
  const normalized = value.toLocaleLowerCase("en");
  return ({
    n: "noun",
    v: "verb",
    adj: "adjective",
    adv: "adverb",
    adverb: "adverb",
    abbreviation: "abbreviation",
    conjunction: "conjunction",
    interjection: "interjection",
    numeral: "numeral",
    indefinitepronoun: "pronoun",
    demonstrativepronoun: "pronoun",
    preposition: "preposition",
    particle: "particle"
  })[normalized] || (normalized ? "phrase" : "phrase");
}

function articleForGender(gender) {
  return ({ masc: "der", fem: "die", neut: "das", m: "der", f: "die", n: "das" })[gender] || "";
}

function directDictionaryCandidates(fileName) {
  const xml = fs.readFileSync(fileName, "utf8");
  const rejectedParts = new Set(["suffix", "prefix", "letter", "pn"]);
  const candidates = [];
  for (const block of entryBlocks(xml)) {
    const lemma = normalizedLemma(firstTag(block, "orth"));
    const sourcePos = firstTag(block, "pos");
    if (rejectedParts.has(sourcePos.toLocaleLowerCase("en")) || !suitableGermanLemma(lemma)) continue;
    const japanese = [...new Set(translationQuotes(block, /xml:lang="ja"|xml:lang="jpn"/i).filter(suitableJapaneseGloss))];
    if (!japanese.length) continue;
    const partOfSpeech = mapDirectPartOfSpeech(sourcePos);
    const article = partOfSpeech === "noun" ? articleForGender(firstTag(block, "gen")) : "";
    const definitions = allTags(block, "def");
    const definitionText = definitions.join(" ");
    const properName = sourcePos.toLocaleLowerCase("en") === "pn" || /(?:Eigenname|Familienname|Nachname|Vorname|Inselstaat|Teil Großbritanniens|\b(?:Stadt|Hauptstadt|Land|Staat|Insel|Fluss|Gebirge|Kontinent|Sternbild|Planet)\b)/i.test(definitionText);
    const domainMatch = definitionText.match(/^(Anatomie|Astronomie|Biologie|Botanik|Chemie|Geografie|Geologie|Informatik|Linguistik|Mathematik|Medizin|Militärwesen|Musik|Physik|Politik|Psychologie|Recht|Religion|Technik|Wirtschaft):/i);
    candidates.push({
      lemma,
      japanese,
      part_of_speech: partOfSpeech,
      article: properName ? "" : article,
      proper_name: properName,
      specialist_domain: domainMatch?.[1] || "",
      source_dictionary: "freedict-deu-jpn",
      source_priority: 2
    });
  }
  return candidates;
}

function readLeipzigFrequency(fileName) {
  const text = fs.readFileSync(fileName, "utf8");
  const values = new Map();
  let total = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const columns = line.split("\t");
    if (columns.length < 3) continue;
    const word = normalizedLemma(columns[1]);
    const frequency = Number(columns[2]);
    if (!word || !Number.isFinite(frequency) || frequency <= 0) continue;
    const key = lemmaKey(word);
    values.set(key, (values.get(key) || 0) + frequency);
    total += frequency;
  }
  return { values, total };
}

function addFrequency(candidates, frequencySources) {
  for (const candidate of candidates) {
    const key = lemmaKey(candidate.lemma);
    candidate.frequency_score = 0;
    candidate.corpus_coverage = 0;
    for (const source of frequencySources) {
      const frequency = source.values.get(key) || 0;
      if (!frequency) continue;
      candidate.frequency_score += frequency / source.total;
      candidate.corpus_coverage += 1;
    }
  }
}

function mergeCandidates(candidates) {
  const merged = new Map();
  for (const candidate of candidates) {
    const key = `${normalizedLemma(candidate.lemma)}\u0000${candidate.part_of_speech}\u0000${candidate.proper_name ? "proper" : "common"}`;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, { ...candidate, japanese: [...candidate.japanese] });
      continue;
    }
    current.japanese = [...new Set([...current.japanese, ...candidate.japanese])];
    current.proper_name = current.proper_name || candidate.proper_name;
    current.specialist_domain = current.specialist_domain || candidate.specialist_domain;
    if (candidate.source_priority > current.source_priority) {
      current.part_of_speech = candidate.part_of_speech;
      current.article = candidate.article || current.article;
      current.source_dictionary = candidate.source_dictionary;
      current.source_priority = candidate.source_priority;
    } else if (current.part_of_speech === "noun" && !current.article && candidate.article) {
      current.article = candidate.article;
    }
  }
  return [...merged.values()];
}

function compareCandidates(left, right) {
  return (
    right.source_priority - left.source_priority
    || right.corpus_coverage - left.corpus_coverage
    || right.frequency_score - left.frequency_score
    || left.lemma.localeCompare(right.lemma, "de")
  );
}

function compactEntry(candidate, index) {
  const japanese = candidate.japanese.filter(suitableJapaneseGloss).slice(0, 3);
  return {
    rank: index + 1,
    lemma: candidate.lemma,
    display_de: candidate.article ? `${candidate.article} ${candidate.lemma}` : candidate.lemma,
    japanese: japanese.join("、"),
    part_of_speech: candidate.part_of_speech,
    grammar: candidate.article ? { article: candidate.article } : {},
    proper_name: Boolean(candidate.proper_name),
    specialist_domain: candidate.specialist_domain || "",
    corpus_coverage: candidate.corpus_coverage,
    frequency_score: Number(candidate.frequency_score.toPrecision(8)),
    source_dictionary: candidate.source_dictionary,
    source_refs: [candidate.source_dictionary, "leipzig-corpora"]
  };
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}
if (!options.deuJpn || !options.leipzigWords.length) {
  printHelp();
  throw new Error("--deu-jpn and at least one --leipzig-words input are required.");
}

for (const fileName of [options.deuJpn, ...options.leipzigWords]) {
  if (!fs.existsSync(fileName)) throw new Error(`Input not found: ${fileName}`);
}

const direct = directDictionaryCandidates(options.deuJpn);
const candidates = mergeCandidates(direct);
const frequencySources = options.leipzigWords.map(readLeipzigFrequency);
addFrequency(candidates, frequencySources);

const selected = candidates
  .filter(candidate => candidate.japanese.length && suitableGermanLemma(candidate.lemma))
  .sort(compareCandidates)
  .slice(0, MAX_SOURCE_ENTRIES)
  .map(compactEntry);

if (selected.length < 9_900) {
  throw new Error(`Only ${selected.length} suitable source entries were produced; at least 9,900 are required.`);
}

const payload = {
  schema_version: 1,
  generated_at: "2026-08-08",
  methodology: "FreeDict German-Japanese headwords ranked by normalized frequency across three Leipzig Corpora Collection samples. CEFR bands are assigned later by the J-Connect generator; they are not official per-word labels.",
  licenses: [
    {
      source_id: "freedict-deu-jpn",
      title: "Deutsch-Japanisch FreeDict+WikDict dictionary 2025.11.23",
      license: "CC BY-SA 3.0",
      url: "https://download.freedict.org/dictionaries/deu-jpn/2025.11.23/"
    },
    {
      source_id: "leipzig-corpora",
      title: "Leipzig Corpora Collection",
      license: "CC BY",
      url: "https://wortschatz.uni-leipzig.de/en/download/German"
    }
  ],
  source_files: options.leipzigWords.map(fileName => path.basename(fileName)),
  entries: selected
};

fs.mkdirSync(path.dirname(options.output), { recursive: true });
fs.writeFileSync(options.output, `${JSON.stringify(payload)}\n`, "utf8");
console.log(`Prepared ${selected.length} attributed lexicon candidates at ${path.relative(rootDir, options.output)}.`);
console.log(`Candidate mix before ranking: ${direct.length} German-Japanese headwords.`);
