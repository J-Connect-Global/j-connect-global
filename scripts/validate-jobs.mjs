import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
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

function readFallbackJobs() {
  const source = fs.readFileSync(path.join(root, "assets/js/jobs-fallback.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: "assets/js/jobs-fallback.js" });
  return sandbox.window.JCONNECT_FALLBACK_JOBS || [];
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
validateRows(readFallbackJobs(), "assets/js/jobs-fallback.js");

if (problems.length) {
  console.error("Jobs validation failed:");
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exitCode = 1;
} else {
  console.log("Jobs validation passed.");
}
