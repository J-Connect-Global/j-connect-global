import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const notice = "この求人は画面・掲載形式の確認用に作成した架空データです。実在する募集ではなく、応募できません。";
const problems = [];

function clean(value) {
  return String(value ?? "").trim();
}

function isActive(job) {
  return clean(job.status).toLowerCase() === "active";
}

function isValidFutureDate(value) {
  const time = Date.parse(clean(value));
  return Number.isFinite(time) && time >= Date.now();
}

function isValidDate(value) {
  return Number.isFinite(Date.parse(clean(value)));
}

function readFallbackJobs() {
  const source = fs.readFileSync(path.join(root, "assets/js/jobs-fallback.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: "assets/js/jobs-fallback.js" });
  return sandbox.window.JCONNECT_FALLBACK_JOBS || [];
}

function validateSample(job, label) {
  if (job.listing_type !== "sample") problems.push(`${label} must use listing_type="sample".`);
  if (job.is_verified !== false) problems.push(`${label} must use is_verified=false.`);
  if (job.public_apply_enabled !== false) problems.push(`${label} must use public_apply_enabled=false.`);
  if (clean(job.sample_label) !== "掲載見本") problems.push(`${label} must use the visible sample_label "掲載見本".`);
  if (!/^サンプル企業.+（架空）$/.test(clean(job.company_name))) problems.push(`${label} must use a clearly fictional company name.`);
  if (!clean(job.summary).includes(notice)) problems.push(`${label} must include the required fictional-listing notice.`);

  for (const field of ["contact_email", "application_email", "apply_email", "apply_url", "application_url", "apply_link", "apply_method", "company_url", "source_url", "source_name", "company_logo_url", "image_url", "contact_name", "contact_person", "contact_person_name"]) {
    if (clean(job[field])) problems.push(`${label} sample field ${field} must be empty.`);
  }

  const serialized = JSON.stringify(job);
  if (/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(serialized)) problems.push(`${label} must not contain an email address.`);
}

function validateSource(items, sourceName) {
  const activeSamples = items.filter((job) => isActive(job) && job.listing_type === "sample");
  if (activeSamples.length > 3) problems.push(`${sourceName} contains more than 3 active sample listings.`);

  items.forEach((job, index) => {
    const label = `${sourceName} item ${index + 1} (${clean(job.id) || "without id"})`;
    if (job.listing_type === "sample") validateSample(job, label);
    if (isActive(job) && job.listing_type === "real") {
      if (job.is_verified !== true) problems.push(`${label} active real listing is missing is_verified=true.`);
      if (!isValidDate(job.employer_authorized_at)) problems.push(`${label} active real listing needs a valid employer_authorized_at.`);
      if (!isValidDate(job.verified_at)) problems.push(`${label} active real listing needs a valid verified_at.`);
      if (!isValidFutureDate(job.expires_at)) problems.push(`${label} active real listing needs a valid, unexpired expires_at.`);
    }
  });
}

const jobsCache = JSON.parse(fs.readFileSync(path.join(root, "assets/data/jobs/jobs.json"), "utf8"));
validateSource(jobsCache.items || [], "assets/data/jobs/jobs.json");
validateSource(readFallbackJobs(), "assets/js/jobs-fallback.js");

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const job of [...(jobsCache.items || []), ...readFallbackJobs()].filter((item) => item.listing_type === "sample")) {
  if (clean(job.detail_url) && sitemap.includes(clean(job.detail_url))) {
    problems.push(`Sample detail URL ${job.detail_url} must not be in sitemap.xml.`);
  }
}

for (const file of ["germany/ja/jobs/index.html", "germany/ja/jobs/detail/index.html", "assets/js/jobs-shared.js"]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  if (source.includes("JobPosting")) problems.push(`${file} must not emit JobPosting structured data for samples.`);
  if (file !== "assets/js/jobs-shared.js" && !source.includes(notice)) {
    problems.push(`${file} must render the required fictional-listing notice.`);
  }
}

if (problems.length) {
  console.error("Jobs validation failed:");
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exitCode = 1;
} else {
  console.log("Jobs validation passed.");
}
