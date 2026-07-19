import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const maximumDuplicateRatio = 0.15;

function bodyOf(markdown) {
  return String(markdown).replace(/^---\s*[\s\S]*?\n---\s*/u, "");
}

function normalizeParagraph(value) {
  return value
    .normalize("NFKC")
    .replace(/\[[^\]]+\]\([^)]*\)/gu, "")
    .replace(/[\s　]+/gu, " ")
    .trim();
}

function parseFrontMatter(markdown) {
  const match = String(markdown || '').match(/^---\r?\n([\s\S]*?)\r?\n---/u);
  if (!match) return {};
  const data = {};
  const lines = match[1].split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const entry = lines[index].match(/^([A-Za-z0-9_]+):\s*(.*)$/u);
    if (!entry) continue;
    const key = entry[1];
    const raw = entry[2].trim();
    if (!raw) {
      const values = [];
      while (lines[index + 1] && /^\s*-\s+/.test(lines[index + 1])) {
        index += 1;
        values.push(lines[index].replace(/^\s*-\s+/, '').trim().replace(/^["']|["']$/g, ''));
      }
      data[key] = values;
    } else if (/^\[.*\]$/.test(raw)) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    } else {
      data[key] = raw.replace(/^["']|["']$/g, '');
    }
  }
  return data;
}

function normalizedSummarySentences(summary) {
  return String(summary || '')
    .normalize('NFKC')
    .split(/[。.!?！？]+/u)
    .map((sentence) => sentence.replace(/[\s　]+/gu, ' ').trim())
    .filter((sentence) => sentence.length >= 24);
}

export function qualifyingParagraphs(markdown) {
  return bodyOf(markdown)
    .split(/\r?\n\s*\r?\n/gu)
    .map(normalizeParagraph)
    .filter((paragraph) => paragraph.length >= 80)
    .filter((paragraph) => !/^(?:出典|公式情報|注意|免責|関連リンク|Sources?)[:：]/iu.test(paragraph))
    .filter((paragraph) => !/^(?:[-*]|\d+[.)])/u.test(paragraph));
}

async function guideMarkdown(slug, gitRef = "") {
  const relative = `content/living/${slug}.md`;
  if (gitRef) return execFileSync("git", ["show", `${gitRef}:${relative}`], { cwd: rootDir, encoding: "utf8" });
  return readFile(path.join(rootDir, relative), "utf8");
}

async function tourismGuideSlugs(gitRef = "") {
  const relativeFiles = gitRef
    ? execFileSync("git", ["ls-tree", "-r", "--name-only", gitRef, "content/living"], { cwd: rootDir, encoding: "utf8" })
        .split(/\r?\n/u)
        .filter((relative) => /^content\/living\/[^/]+\.md$/u.test(relative))
    : (await readdir(path.join(rootDir, "content", "living"), { withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => `content/living/${entry.name}`);
  const candidates = relativeFiles
    .map((relative) => path.posix.basename(relative, ".md"))
    .sort((left, right) => left.localeCompare(right));
  const tourismGuides = [];
  for (const slug of candidates) {
    const frontMatter = parseFrontMatter(await guideMarkdown(slug, gitRef));
    if (frontMatter.category === "観光" && frontMatter.published !== "false") tourismGuides.push(slug);
  }
  return tourismGuides;
}

export async function analyzeTravelGuideDuplication({ gitRef = "" } = {}) {
  const guideSlugs = await tourismGuideSlugs(gitRef);
  const entries = await Promise.all(guideSlugs.map(async (slug) => ({ slug, paragraphs: qualifyingParagraphs(await guideMarkdown(slug, gitRef)) })));
  const owners = new Map();
  for (const entry of entries) {
    for (const paragraph of new Set(entry.paragraphs)) {
      if (!owners.has(paragraph)) owners.set(paragraph, []);
      owners.get(paragraph).push(entry.slug);
    }
  }
  return entries.map((entry) => {
    const duplicated = entry.paragraphs.filter((paragraph) => owners.get(paragraph).length > 1);
    return {
      slug: entry.slug,
      qualifying_paragraphs: entry.paragraphs.length,
      duplicated_paragraphs: duplicated.length,
      duplicate_ratio: entry.paragraphs.length ? duplicated.length / entry.paragraphs.length : 0
    };
  });
}

export async function analyzeTravelGuideMetadata({ gitRef = "" } = {}) {
  const guideSlugs = await tourismGuideSlugs(gitRef);
  const entries = await Promise.all(guideSlugs.map(async (slug) => {
    const frontMatter = parseFrontMatter(await guideMarkdown(slug, gitRef));
    return { slug, summary: String(frontMatter.summary || ''), related: Array.isArray(frontMatter.related_articles) ? frontMatter.related_articles : [] };
  }));
  const issues = [];
  const sentenceOwners = new Map();
  const relatedSetOwners = new Map();
  for (const entry of entries) {
    for (const sentence of new Set(normalizedSummarySentences(entry.summary))) {
      if (!sentenceOwners.has(sentence)) sentenceOwners.set(sentence, []);
      sentenceOwners.get(sentence).push(entry.slug);
    }
    const relatedKey = [...entry.related].sort().join('|');
    if (!relatedSetOwners.has(relatedKey)) relatedSetOwners.set(relatedKey, []);
    relatedSetOwners.get(relatedKey).push(entry.slug);
  }
  for (const [sentence, owners] of sentenceOwners) {
    if (owners.length >= 3) issues.push(`summary sentence is repeated across ${owners.length} guides (${owners.join(', ')}): ${sentence}`);
  }
  for (const [relatedSet, owners] of relatedSetOwners) {
    if (relatedSet && owners.length >= 3) issues.push(`identical related_articles set is repeated across ${owners.length} guides (${owners.join(', ')}): ${relatedSet}`);
  }
  return { entries, issues };
}

async function main() {
  const args = process.argv.slice(2);
  const gitRefIndex = args.indexOf("--git-ref");
  const gitRef = gitRefIndex >= 0 ? String(args[gitRefIndex + 1] || "").trim() : "";
  if (gitRefIndex >= 0 && !gitRef) throw new Error("--git-ref requires a git reference.");
  const report = await analyzeTravelGuideDuplication({ gitRef });
  for (const result of report) {
    const percent = (result.duplicate_ratio * 100).toFixed(1);
    console.log(`${result.slug}: ${result.duplicated_paragraphs}/${result.qualifying_paragraphs} duplicated (${percent}%)`);
    if (result.duplicate_ratio > maximumDuplicateRatio) process.exitCode = 1;
  }
  const metadata = await analyzeTravelGuideMetadata({ gitRef });
  for (const issue of metadata.issues) {
    console.error(`Travel metadata duplication: ${issue}`);
    process.exitCode = 1;
  }
  if (process.exitCode) console.error(`Travel guide prose or metadata duplication exceeds the allowed limits.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
