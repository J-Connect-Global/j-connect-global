import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(rootDir, "content", "quality-baselines", "public-data-quality.json");

const datasets = [
  {
    key: "community",
    path: "assets/data/community/posts.json",
    fields: {
      description: { anyOf: ["body", "summary"] },
      last_reviewed: { anyOf: ["updated_at", "published_at", "created_at"] }
    }
  },
  {
    key: "jobs",
    path: "assets/data/jobs/jobs.json",
    fields: {
      description: { anyOf: ["description", "job_details", "summary"] },
      application: { anyOf: ["apply_url", "application_url", "apply_method"] },
      last_reviewed: { anyOf: ["updated_at", "published_at", "created_at"] }
    }
  },
  ...["eat", "shopping", "medical"].map((key) => ({
    key,
    path: `assets/data/${key}/items.json`,
    fields: {
      description: { anyOf: ["description", "description_ja", "summary"] },
      rating: { anyOf: ["rating"] },
      official_url: { anyOf: ["official_url", "website", "source_url"] },
      coordinates: { allOf: ["latitude", "longitude"] },
      phone: { anyOf: ["phone", "telephone"] },
      opening_hours: { anyOf: ["opening_hours", "openingHours"] },
      last_reviewed: { anyOf: ["last_reviewed_at", "updated_at", "reviewed_at"] }
    }
  }))
];

function hasValue(value) {
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  return String(value ?? "").trim() !== "";
}

function hasFieldGroupValue(item, group) {
  if (group && Array.isArray(group.anyOf)) return group.anyOf.some((field) => hasValue(item?.[field]));
  if (group && Array.isArray(group.allOf)) return group.allOf.every((field) => hasValue(item?.[field]));
  throw new Error("Each public-data quality field must declare anyOf or allOf semantics.");
}

function itemId(item, index) {
  return String(item?.id || item?.post_id || item?.job_id || `row-${index + 1}`);
}

async function readDataset(root, definition) {
  const fullPath = path.join(root, definition.path);
  const payload = JSON.parse(await readFile(fullPath, "utf8"));
  if (!Array.isArray(payload.items)) throw new Error(`${definition.path} must include a public items array.`);
  return payload;
}

function missingFields(items, fields) {
  return Object.fromEntries(Object.entries(fields).map(([field, fieldGroup]) => {
    const ids = items
      .map((item, index) => ({ item, id: itemId(item, index) }))
      .filter(({ item }) => !hasFieldGroupValue(item, fieldGroup))
      .map(({ id }) => id)
      .sort();
    return [field, { count: ids.length, ids }];
  }));
}

export async function buildPublicDataQualityReport({ root = rootDir } = {}) {
  const report = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    datasets: []
  };

  for (const definition of datasets) {
    const payload = await readDataset(root, definition);
    const validation = payload.validation || {};
    report.datasets.push({
      dataset: definition.key,
      public_count: payload.items.length,
      source_count: Number(validation.source_count || 0),
      explicitly_active_count: Number(validation.explicitly_active_count || 0),
      eligible_count: Number(validation.eligible_count || 0),
      generated_count: Number(validation.generated_count ?? payload.items.length),
      excluded_by_reason: validation.excluded_by_reason || {},
      manual_correction_safe_ids: validation.manual_correction_safe_ids || {},
      missing_fields: missingFields(payload.items, definition.fields)
    });
  }
  return report;
}

export function baselineFromReport(report) {
  return {
    schema_version: 1,
    generated_from: "public committed snapshots",
    allowed_missing: Object.fromEntries(report.datasets.map((dataset) => [
      dataset.dataset,
      Object.fromEntries(Object.entries(dataset.missing_fields).map(([field, result]) => [field, result.ids]))
    ]))
  };
}

export function validateQualityBaseline(report, baseline) {
  const errors = [];
  if (baseline?.schema_version !== 1 || !baseline.allowed_missing || typeof baseline.allowed_missing !== "object") {
    return ["Public data quality baseline is missing or incompatible."];
  }
  for (const dataset of report.datasets) {
    const allowedForDataset = baseline.allowed_missing[dataset.dataset] || {};
    for (const [field, result] of Object.entries(dataset.missing_fields)) {
      const allowed = new Set(allowedForDataset[field] || []);
      const newDeficits = result.ids.filter((id) => !allowed.has(id));
      if (newDeficits.length) errors.push(`${dataset.dataset}.${field} has new required-data deficits: ${newDeficits.join(", ")}.`);
    }
  }
  return errors;
}

export function qualityMarkdown(report, errors = []) {
  const lines = [
    "## Public data quality",
    "",
    "| Dataset | Public | Source | Active | Eligible | Generated | Exclusions |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- |"
  ];
  for (const dataset of report.datasets) {
    const exclusions = Object.entries(dataset.excluded_by_reason).filter(([, count]) => Number(count) > 0).map(([reason, count]) => `${reason}: ${count}`).join(", ") || "—";
    lines.push(`| ${dataset.dataset} | ${dataset.public_count} | ${dataset.source_count} | ${dataset.explicitly_active_count} | ${dataset.eligible_count} | ${dataset.generated_count} | ${exclusions} |`);
  }
  lines.push("", "### Known missing public fields", "", "| Dataset | Field | Missing |", "| --- | --- | ---: |");
  for (const dataset of report.datasets) {
    for (const [field, result] of Object.entries(dataset.missing_fields)) {
      lines.push(`| ${dataset.dataset} | ${field} | ${result.count} |`);
    }
  }
  const corrections = report.datasets.flatMap((dataset) => Object.entries(dataset.manual_correction_safe_ids)
    .filter(([, ids]) => Array.isArray(ids) && ids.length)
    .map(([reason, ids]) => ({ dataset: dataset.dataset, reason, ids })));
  if (corrections.length) {
    lines.push("", "### Spreadsheet records requiring manual correction", "");
    for (const correction of corrections) {
      lines.push(`- ${correction.dataset}.${correction.reason}: ${correction.ids.length} — ${correction.ids.join(", ")}`);
    }
  }
  if (errors.length) lines.push("", ...errors.map((error) => `- [FAIL] ${error}`));
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const report = await buildPublicDataQualityReport();
  if (args.has("--write-baseline")) {
    await writeFile(baselinePath, `${JSON.stringify(baselineFromReport(report), null, 2)}\n`, "utf8");
  }
  let errors = [];
  if (args.has("--check-baseline")) {
    const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
    errors = validateQualityBaseline(report, baseline);
  }
  const markdown = qualityMarkdown(report, errors);
  if (args.has("--github-summary") && process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
  }
  process.stdout.write(args.has("--json") ? `${JSON.stringify(report, null, 2)}\n` : markdown);
  if (errors.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
