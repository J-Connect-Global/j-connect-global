import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoots = [
  path.join(root, "content", "events"),
  path.join(root, "content", "living"),
  path.join(root, "content", "learn-german")
];

const files = contentRoots
  .flatMap((directory) => walk(directory))
  .filter((file) => file.endsWith(".md") && path.basename(file) !== "_template.md")
  .sort();

const failures = [];

for (const file of files) {
  const relative = slash(path.relative(root, file));
  const markdown = fs.readFileSync(file, "utf8");
  const body = stripFrontmatter(markdown);
  const isLearnGerman = relative.startsWith("content/learn-german/");

  validateLead(relative, body);

  if (!isLearnGerman) {
    validateImages(relative, body);
    validateGeneralReaderScope(relative, body);
    validateGermanUsage(relative, body);
    validateJapaneseHeadings(relative, body);
  }

  if (/^content\/events\/[^/]+\.md$/.test(relative)) {
    validateEventCulture(relative, body);
  }
}

if (failures.length) {
  console.error(`Editorial content validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Editorial content validation passed for ${files.length} articles.`);

function validateLead(relative, body) {
  const lines = body.split(/\r?\n/);
  const h1Index = lines.findIndex((line) => /^#\s+\S/.test(line));
  if (h1Index < 0) {
    fail(relative, "H1見出しがありません");
    return;
  }

  const leadLines = [];
  let proseStarted = false;
  for (const line of lines.slice(h1Index + 1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isStructuralLine(trimmed)) break;
    proseStarted = true;
    leadLines.push(trimmed);
  }

  const lead = leadLines.join(" ");
  const sentenceCount = (lead.match(/[。！？!?]/g) || []).length;
  if (!proseStarted || lead.length < 80 || sentenceCount < 2) {
    fail(relative, "H1直後に、記事の内容・対象読者・得られることを説明する80字以上かつ2文以上の導入文が必要です");
  }
}

function validateImages(relative, body) {
  const imageCount = (body.match(/^!\[[^\]]*\]\([^\n]+\)$/gm) || []).length;
  if (imageCount < 2) {
    fail(relative, `本文画像が${imageCount}点です。一般記事には少なくとも2点必要です`);
  }
}

function validateGeneralReaderScope(relative, body) {
  const narrowPatterns = [
    /荷主/u,
    /物流担当/u,
    /フォワーダー/u,
    /Incoterms/iu,
    /経営会議/u,
    /\bRACI\b/u,
    /採用担当/u,
    /コンプライアンス担当/u,
    /顧客へのドイツ語/u,
    /問い合わせ.{0,12}ドイツ語/u,
    /ドイツ語.{0,12}(?:例|ひな形|テンプレート)/u
  ];
  for (const pattern of narrowPatterns) {
    if (pattern.test(body)) {
      fail(relative, `一般読者向けではない専門職・ドイツ語実務中心の表現が残っています: ${pattern}`);
    }
  }
}

function validateGermanUsage(relative, body) {
  const fencedBlocks = [...body.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((match) => match[1]);
  const germanSignals = /\b(?:ich|wir|Sie|können|möchte|bitte|vielen Dank|mit freundlichen Grüßen|Termin|Anmeldung|Bestätigung|Kündigung)\b/iu;
  if (fencedBlocks.some((block) => germanSignals.test(block))) {
    fail(relative, "ドイツ語の文例・ひな形は一般記事ではなく「ドイツ語学習」に置いてください");
  }

  const quoteBlocks = body
    .split(/\r?\n/)
    .filter((line) => /^>\s*/.test(line))
    .join("\n");
  if (germanSignals.test(quoteBlocks)) {
    fail(relative, "ドイツ語の引用文例が一般記事に残っています");
  }

  if (/Lohnsteuerhilfeverein/iu.test(body)) {
    fail(relative, "税務相談団体は日本語で説明し、不要なドイツ語名称を本文に出さないでください");
  }
}

function validateJapaneseHeadings(relative, body) {
  const headingLines = body
    .split(/\r?\n/)
    .filter((line) => /^#{2,3}\s+/.test(line));
  const untranslated = /\b(?:Hbf|HVV|Kö|Rheinpark|Nordpark|Aquazoo|Marais|Westminster|South Bank|Rynek|Wawel|Kazimierz|Christianshavn|Schnoor)\b/iu;
  for (const heading of headingLines) {
    if (untranslated.test(heading)) {
      fail(relative, `見出しは日本語を先にしてください: ${heading.replace(/^#{2,3}\s+/, "")}`);
    }
  }
}

function validateEventCulture(relative, body) {
  const headings = body
    .split(/\r?\n/)
    .filter((line) => /^#{2,3}\s+/.test(line))
    .join("\n");
  if (!/(?:歴史|文化|伝統|背景|意味|地域|街|都市|作品|芸術|美術|展示|音楽|文学|祭|物語|生まれ|なぜ|暮らし|読者|翻訳|遺産|社会|つながり)/u.test(headings)) {
    fail(relative, "イベント記事には、歴史・文化・地域での意味のいずれかを扱う見出しが必要です");
  }
}

function isStructuralLine(line) {
  return /^(?:#{2,6}\s|!\[|[-*+]\s|\d+[.)]\s|\||>|```|~~~|<\/?(?:div|figure|table|aside|section)\b)/u.test(line);
}

function stripFrontmatter(markdown) {
  return String(markdown).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function slash(value) {
  return value.split(path.sep).join("/");
}

function fail(relative, message) {
  failures.push(`${relative}: ${message}`);
}
