import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataSourcesPath = path.join(rootDir, "assets/js/data-sources.js");

// Public data cache flow: spreadsheet/GAS responses are normalized into
// committed JSON. Public browser UIs only read these sanitized static files.
const outputPaths = {
  communityPosts: path.join(rootDir, "assets/data/community/posts.json"),
  communityCategories: path.join(rootDir, "assets/data/community/categories.json"),
  jobs: path.join(rootDir, "assets/data/jobs/jobs.json"),
  jobCategories: path.join(rootDir, "assets/data/jobs/categories.json")
};

const FALLBACK_MASTER_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxwP2QkpK0-k4_WPgJ5zaHSC_I0vqytH-n3xbb62NS0XHtQVdSTyXBT2r_lyBuQcuM/exec";

const timeoutMs = Number(process.env.PUBLIC_DATA_TIMEOUT_MS || 30000);
const generatedAt = new Date().toISOString();

function clean(value) {
  return String(value ?? "").trim();
}

function first(row, keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && clean(row[key]) !== "") return clean(row[key]);
  }
  return "";
}

function firstRaw(row, keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && clean(row[key]) !== "") return row[key];
  }
  return "";
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const number = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function toBoolean(value) {
  if (value === true || value === false) return value;
  return ["true", "1", "yes", "y"].includes(clean(value).toLowerCase());
}

function stableSlug(...parts) {
  const slug = parts
    .map((part) => clean(part).normalize("NFKC").toLowerCase())
    .filter(Boolean)
    .join("-")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "";
}

export function normalizePayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (payload.ok === false) throw new Error(payload.error || "Data source returned ok:false");
  for (const key of ["data", "rows", "items", "posts"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

function buildUrl(endpoint, params) {
  const url = new URL(endpoint);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  return url.toString();
}

async function getMasterEndpoint() {
  if (process.env.MASTER_API_URL) return process.env.MASTER_API_URL;
  const source = await readFile(dataSourcesPath, "utf8");
  const match = source.match(/const\s+masterDataEndpoint\s*=\s*["']([^"']+)["']/);
  return match?.[1] || FALLBACK_MASTER_ENDPOINT;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function splitMediaValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(splitMediaValue);
  if (typeof value === "object") return Object.values(value).flatMap(splitMediaValue);
  return String(value).split(/[\n,;]/).map((item) => item.trim()).filter(Boolean);
}

function normalizeImageSrc(value) {
  const src = clean(value);
  if (!src) return "";
  try {
    const url = new URL(src);
    if (url.hostname.includes("drive.google.com")) {
      const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
      const id = fileMatch?.[1] || url.searchParams.get("id");
      if (id) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`;
    }
    return url.toString();
  } catch {
    return src.startsWith("/") ? src : "";
  }
}

function imageUrls(row) {
  const values = [
    firstRaw(row, ["image", "imageUrl", "image_url", "photo", "photoUrl", "thumbnail"]),
    row.photos,
    row.images,
    row.image_urls,
    firstRaw(row, ["thumbnail_url", "photo_url", "first_image"]),
    row.image_url_1,
    row.image_url_2,
    row.image_url_3,
    row.image1,
    row.image2,
    row.image3
  ];
  return [...new Set(values.flatMap(splitMediaValue).map(normalizeImageSrc).filter(Boolean))];
}

function isTrueFlag(value) {
  if (value === true) return true;
  return ["true", "yes", "1"].includes(clean(value).toLowerCase());
}

export function isPublicCommunityPost(row, now = Date.now()) {
  const status = clean(first(row, ["status", "publish_status", "publication_status", "moderation_status"])).toLowerCase();
  if (status !== "active") return false;

  for (const field of ["deleted", "is_deleted", "archived", "hidden", "is_hidden"]) {
    if (isTrueFlag(row?.[field])) return false;
  }
  if (first(row, ["deleted_at", "hidden_at"])) return false;

  const expiresAt = first(row, ["expires_at", "expiresAt", "expiration_date"]);
  if (!expiresAt) return true;
  const expires = Date.parse(expiresAt);
  return !Number.isFinite(expires) || expires >= now;
}

function toIsoDate(value) {
  const text = clean(value);
  if (!text) return "";
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : text;
}

function isValidDate(value) {
  return Number.isFinite(Date.parse(clean(value)));
}

export function normalizeCommunityPost(row, index) {
  const title = first(row, ["title", "name", "subject"]);
  const body = first(row, ["body", "description", "message", "content"]);
  const category1 = first(row, ["category1", "category", "post_type", "postType", "type", "purpose"]);
  const category2 = first(row, ["category2", "subcategory", "topic"]);
  const city = first(row, ["city", "town", "location"]);
  const region = first(row, ["region", "state", "area"]);
  const id = first(row, ["post_id", "postId", "id", "_id"]) || stableSlug(title, city, region) || `community-${index + 1}`;
  const images = imageUrls(row);
  const createdAt = toIsoDate(first(row, ["created_at", "createdAt", "date", "timestamp", "published_at"]));
  const updatedAt = toIsoDate(first(row, ["updated_at", "updatedAt", "last_updated"]));

  return {
    id,
    post_id: id,
    slug: first(row, ["slug"]) || stableSlug(title, city, region, id),
    title,
    body,
    summary: first(row, ["summary", "excerpt"]),
    category1,
    category2,
    postType: category1,
    subcategory: category2,
    country: first(row, ["country"]) || "Germany",
    region,
    city,
    price: first(row, ["price", "amount", "fee"]),
    event_date: first(row, ["event_date", "eventDate"]),
    availability_date: first(row, ["availability_date", "availabilityDate"]),
    tags: first(row, ["tags"]),
    image_url: images[0] || "",
    image_alt: first(row, ["image_alt", "imageAlt"]) || title,
    image_urls: images,
    image_url_1: images[0] || "",
    image_url_2: images[1] || "",
    image_url_3: images[2] || "",
    created_at: createdAt,
    updated_at: updatedAt,
    published_at: toIsoDate(first(row, ["published_at", "published", "posted_at"])) || createdAt,
    expires_at: toIsoDate(first(row, ["expires_at", "expiresAt", "expiration_date"])),
    status: "active"
  };
}

function isSafeUrl(value) {
  const text = clean(value);
  if (!text) return false;
  if (/^mailto:/i.test(text)) return isPublicContactEmail(text.replace(/^mailto:/i, "").split("?")[0]);
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isPublicContactEmail(value) {
  const email = clean(value);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  return !email.toLowerCase().endsWith("@j-connect-global.com");
}

function publicContactEmail(row, keys) {
  const email = first(row, keys);
  return isPublicContactEmail(email) ? email : "";
}

export function normalizeJob(row, index) {
  const positionTitle = first(row, ["position_title", "job_title", "title", "role", "position"]);
  const companyName = first(row, ["company_name", "company", "company_ja", "company_name_ja"]);
  const region = first(row, ["region", "location", "area", "city", "work_location"]);
  const summary = first(row, ["short_description", "summary", "description_short"]);
  const details = first(row, ["full_description", "description", "job_details"]);
  const tags = first(row, ["tags", "skills", "skill_tags", "requirements_tags"]);
  const id = first(row, ["job_id", "id"]) || stableSlug(positionTitle, companyName, region) || `job-${index + 1}`;
  const applyUrl = first(row, ["apply_url", "application_url", "apply_link"]);
  const sourceUrl = first(row, ["source_url", "official_url", "url", "website"]);
  // contact_email/contact_name are private review fields. A public application
  // address must use an explicitly public header in the source sheet.
  const applicationEmail = publicContactEmail(row, ["application_email", "application_contact_email", "apply_email", "public_email"]);

  return {
    id,
    slug: first(row, ["slug", "job_slug"]) || stableSlug(positionTitle, companyName, region),
    detail_url: first(row, ["detail_url", "detailUrl", "detail_page_url"]),
    status: clean(first(row, ["status", "publish_status", "publication_status"])) || "active",
    priority: toNumber(first(row, ["priority"])) || 999,
    company_name: companyName,
    position_title: positionTitle,
    employment_type: first(row, ["employment_type", "employment", "type"]),
    city: first(row, ["city"]) || region,
    region,
    location: first(row, ["location", "work_location", "office_location", "city"]) || region,
    work_style: first(row, ["work_style", "workstyle", "work_type", "remote_type", "remote", "working_style"]),
    language: first(row, ["language", "lang", "languages", "required_language", "language_requirement"]),
    category: first(row, ["category", "job_category", "occupation_category"]),
    detail_category: first(row, ["detail_category", "subcategory", "sub_category", "occupation_detail"]),
    tags,
    skills: first(row, ["skills", "skill_tags"]) || tags,
    salary_min_eur: toNumber(first(row, ["salary_min_eur"])),
    salary_max_eur: toNumber(first(row, ["salary_max_eur"])),
    salary_label: first(row, ["salary_label", "salary"]),
    summary,
    short_description: summary,
    job_details: details,
    description: details,
    requirements: first(row, ["requirements"]),
    benefits: first(row, ["benefits"]),
    application_email: applicationEmail,
    apply_email: applicationEmail,
    apply_url: isSafeUrl(applyUrl) ? applyUrl : "",
    application_url: isSafeUrl(applyUrl) ? applyUrl : "",
    apply_method: first(row, ["apply_method", "application_method", "how_to_apply"]),
    company_url: isSafeUrl(first(row, ["company_url", "company_website", "company_site", "company_link"])) ? first(row, ["company_url", "company_website", "company_site", "company_link"]) : "",
    source_url: isSafeUrl(sourceUrl) ? sourceUrl : "",
    source_name: first(row, ["source_name", "source", "publisher"]),
    visa_support: first(row, ["visa_support", "visa"]),
    image_alt: first(row, ["image_alt", "imageAlt"]) || companyName || positionTitle,
    last_modified_at: toIsoDate(first(row, ["last_modified_at", "lastModifiedAt", "last_modified"])),
    published_at: toIsoDate(first(row, ["published_at", "posted_at", "posted_date", "published"])),
    updated_at: toIsoDate(first(row, ["updated_at", "updated", "last_updated"])),
    created_at: toIsoDate(first(row, ["created_at", "created"])),
    expires_at: toIsoDate(first(row, ["expires_at", "deadline", "application_deadline"]))
  };
}

export function isActiveJob(row, now = Date.now()) {
  if (clean(first(row, ["status"])).toLowerCase() !== "active") return false;
  const expiresAt = first(row, ["expires_at", "deadline", "application_deadline"]);
  if (!expiresAt) return true;
  const expires = Date.parse(expiresAt);
  return Number.isFinite(expires) && expires >= now;
}

function sortNewest(items) {
  return items.sort((a, b) => {
    const aTime = Date.parse(a.published_at || a.updated_at || a.created_at || "") || 0;
    const bTime = Date.parse(b.published_at || b.updated_at || b.created_at || "") || 0;
    if (aTime !== bTime) return bTime - aTime;
    return String(a.id).localeCompare(String(b.id), "ja");
  });
}

function sortJobsNewest(items) {
  return items.sort((a, b) => {
    const getTime = (item) => {
      for (const value of [item.last_modified_at, item.updated_at, item.published_at, item.posted_at, item.created_at]) {
        const time = Date.parse(value || "");
        if (Number.isFinite(time)) return time;
      }
      return 0;
    };
    const aTime = getTime(a);
    const bTime = getTime(b);
    if (aTime !== bTime) return bTime - aTime;
    if (a.priority !== b.priority) return (a.priority || 999) - (b.priority || 999);
    return String(a.id).localeCompare(String(b.id), "ja");
  });
}

function validateUnique(items, fields, label) {
  for (const field of fields) {
    const seen = new Set();
    for (const item of items) {
      const value = clean(item[field]);
      if (!value) continue;
      if (seen.has(value)) throw new Error(`${label} has duplicate ${field}: ${value}`);
      seen.add(value);
    }
  }
}

function categories(items, fields) {
  return fields.map((field) => ({
    field,
    values: [...new Set(items.map((item) => clean(item[field])).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"))
  }));
}

function comparableJson(data) {
  const comparable = { ...data };
  delete comparable.generated_at;
  return JSON.stringify(comparable);
}

export async function writeJsonIfChanged(file, data) {
  try {
    const existing = JSON.parse(await readFile(file, "utf8"));
    if (comparableJson(existing) === comparableJson(data)) return false;
  } catch {
    // A missing or invalid generated file is replaced below.
  }

  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify({ ...data, generated_at: generatedAt }, null, 2)}\n`, "utf8");
  return true;
}

export async function main() {
  const masterEndpoint = await getMasterEndpoint();
  const directoryEndpoint = process.env.CONTENTS_API_URL || masterEndpoint;
  const communityEndpoint = process.env.COMMUNITY_API_URL || masterEndpoint;
  const jobsEndpoint = process.env.JOBS_API_URL || buildUrl(directoryEndpoint, { sheet: "jobs", lang: "ja", status: "active" });
  const communityUrl = buildUrl(communityEndpoint, {
    action: "getPosts",
    bypassCache: "true",
    includeClosed: "false"
  });

  const [communityPayload, jobsPayload] = await Promise.all([
    fetchJson(communityUrl),
    fetchJson(jobsEndpoint)
  ]);

  const communityItems = sortNewest(
    normalizePayload(communityPayload)
      .filter((row) => isPublicCommunityPost(row))
      .map(normalizeCommunityPost)
      .filter((item) => item.title || item.body)
  );

  const jobItems = sortJobsNewest(
    normalizePayload(jobsPayload)
      .filter(isActiveJob)
      .map(normalizeJob)
      .filter((item) => [item.company_name, item.position_title, item.region, item.city, item.summary, item.job_details].some(Boolean))
  );

  validateUnique(communityItems, ["id"], "community posts");
  validateUnique(jobItems, ["id"], "jobs");

  const changed = [];
  if (await writeJsonIfChanged(outputPaths.communityPosts, {
    source: "community-gas",
    endpoint: "communityDataEndpoint?action=getPosts&bypassCache=true&includeClosed=false",
    count: communityItems.length,
    items: communityItems
  })) changed.push("community posts");

  if (await writeJsonIfChanged(outputPaths.communityCategories, {
    source: "community-gas",
    count: communityItems.length,
    groups: categories(communityItems, ["category1", "category2", "city", "region"])
  })) changed.push("community categories");

  if (await writeJsonIfChanged(outputPaths.jobs, {
    source: "contents-gas:jobs",
    endpoint: "directoryDataEndpoint?sheet=jobs&lang=ja&status=active",
    count: jobItems.length,
    items: jobItems
  })) changed.push("jobs");

  if (await writeJsonIfChanged(outputPaths.jobCategories, {
    source: "contents-gas:jobs",
    count: jobItems.length,
    groups: categories(jobItems, ["region", "city", "category", "detail_category", "employment_type", "work_style", "language"])
  })) changed.push("job categories");

  console.log(`Synced community count: ${communityItems.length}`);
  console.log(`Synced jobs count: ${jobItems.length}`);
  console.log(`Generated at: ${generatedAt}`);
  console.log(`Changed public files: ${changed.join(", ") || "none"}`);
  console.log(`First 3 community post IDs: ${communityItems.slice(0, 3).map((item) => item.id).join(", ") || "(none)"}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Public data sync failed:", error);
    process.exitCode = 1;
  });
}
