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

// Article standard 2026-11 (plan chapter 4): every Living guide written to this
// standard must let the reader go straight to the office after reading it.
// Opt in per article with front matter `article_standard: "2026-11"`.
const ARTICLE_STANDARDS = new Set(["2026-11"]);
const STANDARD_SECTIONS = [
  { key: "conclusion", heading: /^まず結論/u, label: "まず結論" },
  { key: "cases", heading: /^あなたはどのケース/u, label: "あなたはどのケース？" },
  { key: "steps", heading: /^手順/u, label: "手順" },
  { key: "pitfalls", heading: /^落とし穴/u, label: "落とし穴" },
  { key: "german", heading: /^そのまま使えるドイツ語/u, label: "そのまま使えるドイツ語" },
  { key: "cases_real", heading: /^在住者の実例/u, label: "在住者の実例" },
  { key: "sources", heading: /^公式情報/u, label: "公式情報・参考ソース" }
];

// Publication policy (2026-11-13): never expose details that identify the
// editorial member's family, municipality, or the offices and companies involved.
const PRIVACY_PATTERNS = [
  [/Erkrath|Hochdahl|Mettmann/iu, "居住自治体を特定できる地名"],
  [/myKitaVM|Kita-?Navigator\s+Erkrath/iu, "自治体固有の保育登録システム名"],
  [/Envivas/iu, "保険会社名"],
  [/メキシコ|Mexik/iu, "配偶者の国籍につながる国名"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/u, "メールアドレス"],
  [/(?:\+49|\b0\d{2,4})[\s/-]?\d{3,}[\s/-]?\d{2,}/u, "電話番号"],
  [/翻訳[^。\n]{0,40}\d[\d,.]*\s*(?:ユーロ|EUR|€)/u, "翻訳の金額"]
];


for (const file of files) {
  const relative = slash(path.relative(root, file));
  const markdown = fs.readFileSync(file, "utf8");
  const body = stripFrontmatter(markdown);
  const isLearnGerman = relative.startsWith("content/learn-german/");
  const articleStandard = readArticleStandard(markdown);

  validateLead(relative, body);

  if (!isLearnGerman) {
    validateImages(relative, body);
    validateGeneralReaderScope(relative, body, { allowGermanTemplates: Boolean(articleStandard) });
    if (!articleStandard) validateGermanUsage(relative, body);
    validateJapaneseHeadings(relative, body);
  }

  if (articleStandard) {
    validateArticleStandard(relative, body, articleStandard);
    validatePrivacyScreen(relative, markdown);
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

function validateGeneralReaderScope(relative, body, { allowGermanTemplates = false } = {}) {
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
    ...(allowGermanTemplates ? [] : [
      /問い合わせ.{0,12}ドイツ語/u,
      /ドイツ語.{0,12}(?:例|ひな形|テンプレート)/u
    ])
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

function readArticleStandard(markdown) {
  const frontmatter = String(markdown).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || "";
  const value = frontmatter.match(/^article_standard:\s*"?([^"\n]*)"?\s*$/m)?.[1]?.trim() || "";
  return value;
}

function splitH2Sections(body) {
  const sections = [];
  let current = null;
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = { heading: heading[1].trim(), lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return sections;
}

function validateArticleStandard(relative, body, standard) {
  if (!ARTICLE_STANDARDS.has(standard)) {
    fail(relative, `article_standard "${standard}" は未定義です（使える値: ${[...ARTICLE_STANDARDS].join(", ")}）`);
    return;
  }
  const sections = splitH2Sections(body);
  const found = {};
  for (const spec of STANDARD_SECTIONS) {
    const section = sections.find((entry) => spec.heading.test(entry.heading));
    if (!section) {
      fail(relative, `記事標準${standard}: 「## ${spec.label}」の見出しがありません`);
      continue;
    }
    found[spec.key] = section.lines.join("\n");
  }

  if (found.conclusion !== undefined && !/\d/u.test(found.conclusion)) {
    fail(relative, `記事標準${standard}: 結論に期限・費用・日数などの数字がありません`);
  }
  if (found.cases !== undefined && !/^\|.+\|\s*$/mu.test(found.cases)) {
    fail(relative, `記事標準${standard}: ケース分岐は表で示してください`);
  }
  if (found.steps !== undefined && !/^\s*1\.\s+\S/mu.test(found.steps) && !/^###\s+(?:\d|ステップ)/mu.test(found.steps)) {
    fail(relative, `記事標準${standard}: 手順は番号付きリストか「### 1.」形式の小見出しで示してください`);
  }
  if (found.pitfalls !== undefined) {
    const itemCount = (found.pitfalls.match(/^(?:[-*]\s+\S|\d+\.\s+\S|###\s+\S)/gmu) || []).length;
    if (itemCount < 3) fail(relative, `記事標準${standard}: 落とし穴が${itemCount}件です。3件以上必要です`);
  }
  if (found.german !== undefined) {
    const germanSignals = /\b(?:ich|wir|Sie|Ihnen|bitte|Guten Tag|Sehr geehrte|Mit freundlichen Grüßen|Termin|möchte|könnten)\b/u;
    const blocks = found.german.split(/\r?\n/).filter((line) => /^\s*(?:>|\|)/.test(line)).join("\n");
    if (!germanSignals.test(blocks)) {
      fail(relative, `記事標準${standard}: ドイツ語の文例を引用（>）か表で1つ以上入れてください`);
    }
    if (!/[ぁ-んァ-ヶ一-龠]/u.test(found.german)) {
      fail(relative, `記事標準${standard}: ドイツ語の文例には和訳を併記してください`);
    }
  }
  if (found.cases_real !== undefined && !/(?:編集部|読者|在住者)/u.test(found.cases_real)) {
    fail(relative, `記事標準${standard}: 在住者の実例には、誰の実例か（編集部・読者）を書いてください`);
  }
  if (found.sources !== undefined) {
    const sourceItems = found.sources.split(/\r?\n/).filter((line) => /^\s*[-*]\s+\S/.test(line));
    if (!sourceItems.length) fail(relative, `記事標準${standard}: 公式情報のリストがありません`);
    for (const item of sourceItems) {
      if (!/\]\(https?:\/\//u.test(item)) fail(relative, `記事標準${standard}: 出典にリンクがありません: ${item.trim().slice(0, 60)}`);
      // A source must carry its check date, or say plainly that it could not be checked.
      if (!/\d{4}年\d{1,2}月\d{1,2}日(?:に)?確認|未確認/u.test(item)) fail(relative, `記事標準${standard}: 出典に確認日（YYYY年M月D日確認）か「未確認」がありません: ${item.trim().slice(0, 60)}`);
    }
  }
}

function validatePrivacyScreen(relative, markdown) {
  // Names are checked in link targets too; numbers only in visible text, so
  // URLs with long digit runs are not mistaken for phone numbers.
  const visibleText = stripFrontmatter(markdown)
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/https?:\/\/\S+/g, " ");
  for (const [index, [pattern, label]] of PRIVACY_PATTERNS.entries()) {
    const target = index < 4 ? String(markdown) : visibleText;
    if (pattern.test(target)) fail(relative, `公開方針: ${label}が含まれています (${pattern})`);
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
