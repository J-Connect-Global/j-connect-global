import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const guideSlugs = [
  "bremen-weekend-trip", "brussels-weekend-trip", "copenhagen-weekend-trip", "hamburg-weekend-trip", "krakow-weekend-trip",
  "london-weekend-trip", "munich-weekend-trip", "paris-weekend-trip", "prague-weekend-trip", "warsaw-weekend-trip"
];
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

export async function analyzeTravelGuideDuplication({ gitRef = "" } = {}) {
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
  if (process.exitCode) console.error(`Travel guides exceed the ${maximumDuplicateRatio * 100}% exact-paragraph duplication limit.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
