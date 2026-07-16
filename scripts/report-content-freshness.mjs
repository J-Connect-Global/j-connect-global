import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FRESH_PUBLICATION_WINDOW_DAYS = 45;
export const OVERDUE_REVIEW_DAYS = 180;

const datasets = Object.freeze([
  { name: "Living", file: "content/registry/living.json" },
  { name: "Events/News", file: "content/registry/events.json" },
  { name: "Learn German", file: "content/registry/learn-german.json" }
]);

function timestamp(value) {
  const parsed = Date.parse(String(value || "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function isoDate(value) {
  return value === null ? "—" : new Date(value).toISOString().slice(0, 10);
}

function ageDays(now, value) {
  return value === null ? Infinity : Math.floor((now.getTime() - value) / 86_400_000);
}

export async function analyzeContentFreshness({ root = rootDir, now = new Date() } = {}) {
  const results = [];
  for (const dataset of datasets) {
    const items = JSON.parse(await readFile(path.join(root, ...dataset.file.split("/")), "utf8"));
    if (!Array.isArray(items)) throw new Error(`${dataset.file} must contain an array.`);
    const published = items.filter((item) => item?.published === true && item?.status === "published");
    const publicationDates = published.map((item) => timestamp(item.published_at)).filter((value) => value !== null);
    const reviewDates = published.map((item) => timestamp(item.last_verified || item.updated_at || item.published_at)).filter((value) => value !== null);
    const newestPublished = publicationDates.length ? Math.max(...publicationDates) : null;
    const newestReviewed = reviewDates.length ? Math.max(...reviewDates) : null;
    if (newestPublished !== null && newestPublished > now.getTime() + 86_400_000) {
      throw new Error(`${dataset.name} contains a future publication date: ${isoDate(newestPublished)}.`);
    }
    const overdue = published.filter((item) => {
      const reviewed = timestamp(item.last_verified || item.updated_at || item.published_at);
      return ageDays(now, reviewed) > OVERDUE_REVIEW_DAYS;
    }).map((item) => ({ id: String(item.id || item.slug || "unknown"), title: String(item.title || "無題") }));
    results.push({
      name: dataset.name,
      count: published.length,
      newestPublished: isoDate(newestPublished),
      newestReviewed: isoDate(newestReviewed),
      publicationAgeDays: ageDays(now, newestPublished),
      freshPublication: ageDays(now, newestPublished) <= FRESH_PUBLICATION_WINDOW_DAYS,
      overdue
    });
  }
  return { checkedAt: now.toISOString(), freshWindowDays: FRESH_PUBLICATION_WINDOW_DAYS, overdueReviewDays: OVERDUE_REVIEW_DAYS, results };
}

export function freshnessMarkdown(report) {
  const lines = [
    "## Editorial freshness",
    "",
    `Fresh publication window: ${report.freshWindowDays} days. Review overdue threshold: ${report.overdueReviewDays} days.`,
    "",
    "| Section | Newest published | Newest reviewed | Within window | Overdue reviews |",
    "| --- | --- | --- | --- | ---: |"
  ];
  for (const result of report.results) {
    lines.push(`| ${result.name} | ${result.newestPublished} | ${result.newestReviewed} | ${result.freshPublication ? "yes" : "no"} | ${result.overdue.length} |`);
  }
  const overdue = report.results.flatMap((result) => result.overdue.map((item) => `${result.name}: ${item.id} — ${item.title}`));
  lines.push("", overdue.length ? "Overdue review items:" : "No overdue review items.");
  if (overdue.length) lines.push(...overdue.map((item) => `- ${item}`));
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  analyzeContentFreshness().then(async (report) => {
    const markdown = freshnessMarkdown(report);
    process.stdout.write(markdown);
    if (process.argv.includes("--github-summary") && process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
    }
  }).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
