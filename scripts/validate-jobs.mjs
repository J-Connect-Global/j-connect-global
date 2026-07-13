import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];

function clean(value) {
  return String(value ?? "").trim();
}

function isValidDate(value) {
  return Number.isFinite(Date.parse(clean(value)));
}

function isSafeUrl(value) {
  const text = clean(value);
  if (!text) return true;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidSalary(value) {
  const text = clean(value);
  if (!text) return true;
  const number = Number(text.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) && number >= 0;
}

function isActiveJob(job) {
  if (clean(job.status).toLowerCase() !== "active") return false;
  const expiresAt = clean(job.expires_at);
  if (!expiresAt) return true;
  const expires = Date.parse(expiresAt);
  return Number.isFinite(expires) && expires >= Date.now();
}

function validateRows(items, sourceName, publicCache = false) {
  const ids = new Set();
  items.forEach((job, index) => {
    const label = `${sourceName} item ${index + 1} (${clean(job.id) || "without id"})`;
    const id = clean(job.id);
    if (id) {
      if (ids.has(id)) problems.push(`${label} has a duplicate non-empty id.`);
      ids.add(id);
    }

    if (!clean(job.company_name) && !clean(job.position_title)) {
      problems.push(`${label} needs a company name or position title.`);
    }
    for (const field of ["expires_at", "updated_at", "published_at", "last_modified_at", "created_at"]) {
      if (clean(job[field]) && !isValidDate(job[field])) problems.push(`${label} has invalid ${field}.`);
    }
    for (const field of ["source_url", "apply_url", "application_url", "apply_link", "company_url"]) {
      if (!isSafeUrl(job[field])) problems.push(`${label} has invalid ${field}.`);
    }
    for (const field of ["salary_min_eur", "salary_max_eur"]) {
      if (!isValidSalary(job[field])) problems.push(`${label} has invalid ${field}.`);
    }
    if (publicCache && !isActiveJob(job)) {
      problems.push(`${label} appears in public JSON but is not active with a blank or unexpired valid expiry.`);
    }
  });
}

const jobsCache = JSON.parse(fs.readFileSync(path.join(root, "assets/data/jobs/jobs.json"), "utf8"));
validateRows(jobsCache.items || [], "assets/data/jobs/jobs.json", true);

const home = fs.readFileSync(path.join(root, "germany/ja/index.html"), "utf8");
const listing = fs.readFileSync(path.join(root, "germany/ja/jobs/index.html"), "utf8");
const detail = fs.readFileSync(path.join(root, "germany/ja/jobs/detail/index.html"), "utf8");
const shared = fs.readFileSync(path.join(root, "assets/js/jobs-shared.js"), "utf8");
for (const [label, source] of [["Home", home], ["Jobs list", listing], ["Jobs detail", detail]]) {
  if (!source.includes("/assets/data/jobs/jobs.json")) problems.push(`${label} does not use generated public Jobs JSON.`);
  if (/GAS_FALLBACK_TIMEOUT_MS|trying GAS fallback|JOBS_API_URL/.test(source)) problems.push(`${label} still contains a Jobs GAS display fallback.`);
}
for (const marker of [
  "求人IDが指定されていません",
  "指定された求人IDに一致する求人は見つかりませんでした。",
  "この求人は募集終了、非公開、削除済み、または掲載期限終了のため表示できません。",
]) {
  if (!detail.includes(marker)) problems.push(`Jobs detail lacks state marker: ${marker}`);
}
if (!detail.includes('noindex, follow')) problems.push("Jobs detail lacks noindex protection.");
if (shared.includes("...row")) problems.push("Jobs shared normalizer retains arbitrary source fields instead of a public allowlist.");
const publicEmailFields = ["contact_email", "application_email", "apply_email", "public_email"];
for (const field of publicEmailFields) {
  if (new RegExp(`\\b${field}\\b`).test(shared)) {
    problems.push(`Jobs shared normalizer must not read or emit removed public email field ${field}.`);
  }
  for (const [index, job] of (jobsCache.items || []).entries()) {
    if (Object.hasOwn(job, field)) {
      problems.push(`assets/data/jobs/jobs.json item ${index + 1} exposes removed public email field ${field}.`);
    }
  }
}

if (problems.length) {
  console.error("Jobs validation failed:");
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exitCode = 1;
} else {
  console.log("Jobs validation passed.");
}
