import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataSourcesPath = path.join(rootDir, "assets/js/data-sources.js");

export const EXPECTED_API_VERSION = "2026-07-13.1";
export const SAMPLE_JOB_LIMIT = 3;
export const OPEN_ENDED_JOB_REVIEW_DAYS = 30;

const outputPaths = {
  communityPosts: path.join(rootDir, "assets/data/community/posts.json"),
  communityCategories: path.join(rootDir, "assets/data/community/categories.json"),
  jobs: path.join(rootDir, "assets/data/jobs/jobs.json"),
  jobCategories: path.join(rootDir, "assets/data/jobs/categories.json"),
  eat: path.join(rootDir, "assets/data/eat/items.json"),
  shopping: path.join(rootDir, "assets/data/shopping/items.json"),
  medical: path.join(rootDir, "assets/data/medical/items.json")
};

const FALLBACK_MASTER_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxwP2QkpK0-k4_WPgJ5zaHSC_I0vqytH-n3xbb62NS0XHtQVdSTyXBT2r_lyBuQcuM/exec";
const LEGACY_ENDPOINT_ENV_NAMES = [
  "COMMUNITY_API_URL", "CONTENTS_API_URL", "JOBS_API_URL", "DIRECTORY_API_URL",
  "EAT_API_URL", "SHOPPING_API_URL", "MEDICAL_API_URL"
];
const PRIVATE_FIELD_PATTERN = /(?:email_private|contact_email|contact_name|manage_|token|secret|admin_|internal|moderation|submission_key|approval_|spreadsheet|notes_internal)/i;
const PLACEHOLDER_CATEGORY_VALUES = new Set(["test", "placeholder", "dummy", "n/a", "na", "-"]);

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

function buildUrl(endpoint, params) {
  const url = new URL(endpoint);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  return url.toString();
}

export function assertNoLegacyEndpointOverrides(env = process.env) {
  const configured = LEGACY_ENDPOINT_ENV_NAMES.filter((name) => clean(env[name]));
  if (configured.length) {
    throw new Error(
      `Legacy endpoint override(s) are not supported: ${configured.join(", ")}. ` +
      "All public datasets must use the single canonical Master endpoint."
    );
  }
}

function validateMasterEndpoint(endpoint) {
  const url = new URL(clean(endpoint));
  if (url.protocol !== "https:") throw new Error("The Master endpoint must use HTTPS.");
  return url.toString();
}

export function sanitizedEndpointIdentity(endpoint) {
  const url = new URL(endpoint);
  const deploymentId = url.pathname.match(/\/s\/([^/]+)\/exec\/?$/)?.[1] || "";
  const suffix = deploymentId ? deploymentId.slice(-8) : "non-gas-path";
  return `${url.hostname}/deployment-…${suffix}`;
}

async function getMasterEndpoint() {
  assertNoLegacyEndpointOverrides();
  if (clean(process.env.MASTER_API_URL)) {
    return {
      endpoint: validateMasterEndpoint(process.env.MASTER_API_URL),
      sourceType: "development MASTER_API_URL override"
    };
  }
  const source = await readFile(dataSourcesPath, "utf8");
  const match = source.match(/const\s+masterDataEndpoint\s*=\s*["']([^"']+)["']/);
  return {
    endpoint: validateMasterEndpoint(match?.[1] || FALLBACK_MASTER_ENDPOINT),
    sourceType: match?.[1] ? "repository canonical Master endpoint" : "built-in canonical Master fallback"
  };
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

function safeVersion(value) {
  const version = clean(value);
  if (!version) return "missing";
  return /^[A-Za-z0-9._-]{1,40}$/.test(version) ? version : "invalid";
}

export function assertApiVersion(payload, label, expected = EXPECTED_API_VERSION) {
  const received = safeVersion(payload?.api_version);
  if (received !== expected) {
    throw new Error(`${label} API version mismatch: expected ${expected}, received ${received}. Deploy the current Apps Script as a new version to the existing Web App deployment.`);
  }
  return true;
}

function splitMediaValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(splitMediaValue);
  if (typeof value === "object") return Object.values(value).flatMap(splitMediaValue);
  return String(value).split(/[\n,;]/).map((item) => item.trim()).filter(Boolean);
}

function isSafeHttpUrl(value) {
  const text = clean(value);
  if (!text) return false;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function safeHttpUrl(value) {
  return isSafeHttpUrl(value) ? new URL(clean(value)).toString() : "";
}

function normalizeImageSrc(value) {
  const src = clean(value);
  if (!src) return "";
  try {
    const url = new URL(src);
    if (!isSafeHttpUrl(src)) return "";
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
    row.photos, row.images, row.image_urls,
    firstRaw(row, ["thumbnail_url", "photo_url", "first_image"]),
    row.image_url_1, row.image_url_2, row.image_url_3, row.image1, row.image2, row.image3
  ];
  return [...new Set(values.flatMap(splitMediaValue).map(normalizeImageSrc).filter(Boolean))];
}

function isTrueFlag(value) {
  if (value === true) return true;
  return ["true", "yes", "1"].includes(clean(value).toLowerCase());
}

export function isPublicCommunityPost(row, now = Date.now()) {
  if (clean(row?.status).toLowerCase() !== "active") return false;
  const moderationStatus = clean(row?.moderation_status).toLowerCase();
  if (["hidden", "deleted", "inactive", "pending", "rejected", "draft", "expired", "spam", "closed"].includes(moderationStatus)) return false;
  for (const field of ["deleted", "is_deleted", "archive", "archived", "is_archived", "hidden", "is_hidden"]) {
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
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
}

function isValidDate(value) {
  return Number.isFinite(Date.parse(clean(value)));
}

export function communityPublicationDate(row) {
  return toIsoDate(first(row, ["published_at", "published", "posted_at"]))
    || toIsoDate(first(row, ["created_at", "createdAt", "date", "timestamp"]));
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
  const createdAt = toIsoDate(first(row, ["created_at", "createdAt", "date", "timestamp"]));
  const publishedAt = communityPublicationDate(row) || createdAt;
  return {
    id, post_id: id,
    slug: first(row, ["slug"]) || stableSlug(title, city, region, id),
    title, body, summary: first(row, ["summary", "excerpt"]),
    category1, category2, postType: category1, subcategory: category2,
    country: first(row, ["country"]) || "Germany", region, city,
    price: first(row, ["price", "amount", "fee"]),
    event_date: first(row, ["event_date", "eventDate"]),
    availability_date: first(row, ["availability_date", "availabilityDate"]),
    tags: first(row, ["tags"]),
    image_url: images[0] || "", image_alt: first(row, ["image_alt", "imageAlt"]) || title,
    image_urls: images, image_url_1: images[0] || "", image_url_2: images[1] || "", image_url_3: images[2] || "",
    created_at: createdAt, published_at: publishedAt,
    updated_at: toIsoDate(first(row, ["updated_at", "updatedAt", "last_updated"])),
    expires_at: toIsoDate(first(row, ["expires_at", "expiresAt", "expiration_date"])),
    status: "active"
  };
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

function jobListingType(row) {
  const value = first(row, ["listing_type"]).toLowerCase();
  return value === "sample" || value === "real" ? value : "";
}

function jobExpiryEligible(row, now) {
  const expiresAt = first(row, ["expires_at", "deadline", "application_deadline"]);
  if (expiresAt) {
    const expires = Date.parse(expiresAt);
    return Number.isFinite(expires) && expires >= now;
  }
  const reviewed = Date.parse(first(row, ["last_reviewed_at"]));
  return Number.isFinite(reviewed) && reviewed <= now && now - reviewed <= OPEN_ENDED_JOB_REVIEW_DAYS * 86400000;
}

export function classifyJob(row, now = Date.now()) {
  if (clean(first(row, ["status"])).toLowerCase() !== "active") return { eligible: false, reason: "status_not_active", listingType: jobListingType(row) };
  const explicitType = jobListingType(row);
  const listingType = explicitType || "sample";
  if (listingType === "sample") {
    return { eligible: true, reason: "", listingType, legacyDefault: !explicitType, indexable: false, emitJobPosting: false };
  }
  if (!toBoolean(firstRaw(row, ["is_verified"]))) return { eligible: false, reason: "real_not_verified", listingType, indexable: false, emitJobPosting: false };
  if (!isValidDate(first(row, ["verified_at"]))) return { eligible: false, reason: "real_missing_verified_at", listingType, indexable: false, emitJobPosting: false };
  const authorized = isValidDate(first(row, ["employer_authorized_at"])) || isSafeHttpUrl(first(row, ["source_url"]));
  if (!authorized) return { eligible: false, reason: "real_missing_authorization", listingType, indexable: false, emitJobPosting: false };
  if (!jobExpiryEligible(row, now)) return { eligible: false, reason: "real_expiry_policy_failed", listingType, indexable: false, emitJobPosting: false };
  const indexable = toBoolean(firstRaw(row, ["is_indexable"])) && isValidDate(first(row, ["last_reviewed_at"]));
  return { eligible: true, reason: "", listingType, legacyDefault: false, indexable, emitJobPosting: indexable };
}

export function normalizeJob(row, index, classification = classifyJob(row)) {
  const positionTitle = first(row, ["position_title", "job_title", "title", "role", "position"]);
  const companyName = first(row, ["company_name", "company", "company_ja", "company_name_ja"]);
  const region = first(row, ["region", "location", "area", "city", "work_location"]);
  const summary = first(row, ["short_description", "summary", "description_short"]);
  const details = first(row, ["full_description", "description", "job_details"]);
  const tags = first(row, ["tags", "skills", "skill_tags", "requirements_tags"]);
  const id = first(row, ["job_id", "id"]) || stableSlug(positionTitle, companyName, region) || `job-${index + 1}`;
  const isSample = classification.listingType === "sample";
  const applyUrl = isSample ? "" : safeHttpUrl(first(row, ["apply_url", "application_url", "apply_link"]));
  const applicationEmail = isSample ? "" : publicContactEmail(row, ["application_email", "application_contact_email", "apply_email", "public_email"]);
  return {
    id, job_id: id,
    slug: first(row, ["slug", "job_slug"]) || stableSlug(positionTitle, companyName, region),
    detail_url: first(row, ["detail_url", "detailUrl", "detail_page_url"]),
    status: "active", priority: toNumber(first(row, ["priority"])) || 999,
    listing_type: classification.listingType,
    governance_defaulted: Boolean(classification.legacyDefault),
    is_verified: classification.listingType === "real",
    is_indexable: Boolean(classification.indexable),
    emit_job_posting: Boolean(classification.emitJobPosting),
    sample_label: isSample ? "掲載見本・応募不可" : "",
    company_name: companyName, position_title: positionTitle,
    employment_type: first(row, ["employment_type", "employment", "type"]),
    city: first(row, ["city"]) || region, region,
    location: first(row, ["location", "work_location", "office_location", "city"]) || region,
    work_style: first(row, ["work_style", "workstyle", "work_type", "remote_type", "remote", "working_style"]),
    language: first(row, ["language", "lang", "languages", "required_language", "language_requirement"]),
    category: first(row, ["category", "job_category", "occupation_category"]),
    detail_category: first(row, ["detail_category", "subcategory", "sub_category", "occupation_detail"]),
    tags, skills: first(row, ["skills", "skill_tags"]) || tags,
    salary_min_eur: toNumber(first(row, ["salary_min_eur"])), salary_max_eur: toNumber(first(row, ["salary_max_eur"])),
    salary_label: first(row, ["salary_label", "salary"]), summary, short_description: summary,
    job_details: details, description: details,
    requirements: first(row, ["requirements"]), benefits: first(row, ["benefits"]),
    application_email: applicationEmail, apply_email: applicationEmail,
    apply_url: applyUrl, application_url: applyUrl,
    apply_method: isSample ? "" : first(row, ["apply_method", "application_method", "how_to_apply"]),
    company_url: safeHttpUrl(first(row, ["company_url", "company_website", "company_site", "company_link"])),
    source_url: safeHttpUrl(first(row, ["source_url", "official_url", "url", "website"])),
    source_name: first(row, ["source_name", "source", "publisher"]),
    visa_support: first(row, ["visa_support", "visa"]), image_alt: first(row, ["image_alt", "imageAlt"]) || companyName || positionTitle,
    verified_at: classification.listingType === "real" ? toIsoDate(first(row, ["verified_at"])) : "",
    employer_authorized_at: classification.listingType === "real" ? toIsoDate(first(row, ["employer_authorized_at"])) : "",
    last_reviewed_at: toIsoDate(first(row, ["last_reviewed_at"])),
    published_at: toIsoDate(first(row, ["published_at", "posted_at", "posted_date", "published"])),
    updated_at: toIsoDate(first(row, ["updated_at", "updated", "last_updated"])),
    created_at: toIsoDate(first(row, ["created_at", "created"])),
    expires_at: toIsoDate(first(row, ["expires_at", "deadline", "application_deadline"]))
  };
}

export function isActiveJob(row, now = Date.now()) {
  return classifyJob(row, now).eligible;
}

function placeholderCategory(value) {
  return PLACEHOLDER_CATEGORY_VALUES.has(clean(value).normalize("NFKC").toLowerCase());
}

function directoryId(row, dataset, index) {
  const candidate = first(row, ["id", "item_id", "place_id", "placeId", "placeid", "slug"]);
  if (candidate && !placeholderCategory(candidate)) return candidate;
  return stableSlug(dataset, first(row, ["name", "title", "name_ja", "name_en"]), first(row, ["address", "completeAddress", "completeaddress", "street"]), index + 1)
    || `${dataset}-${index + 1}`;
}

function directoryFields(row, dataset, index) {
  const name = first(row, ["name_ja", "title", "name", "name_en"]);
  const category = first(row, ["category", "category1", "categoryName", "categoryname"]);
  const detailCategory = first(row, ["detail_category", "category2", "subcategory", "category3"]);
  const officialRaw = first(row, ["official_url", "website", "site_url", "homepage"]);
  const mapRaw = first(row, ["map_url", "url", "google_map_url", "maps_url"]);
  const sourceRaw = first(row, ["source_url"]);
  return {
    id: directoryId(row, dataset, index), name, category, detailCategory,
    officialRaw, mapRaw, sourceRaw,
    cityArea: first(row, ["city", "area", "region", "state"]),
    reviewDate: first(row, ["last_reviewed_at", "reviewed_at", "updated_at"])
  };
}

export function validateDirectoryRow(row, dataset, index = 0) {
  const fields = directoryFields(row, dataset, index);
  if (clean(row?.status).toLowerCase() !== "active") return { eligible: false, reason: "status_not_active", id: fields.id };
  if (!fields.name) return { eligible: false, reason: "missing_display_name", id: fields.id };
  if (!fields.category) return { eligible: false, reason: "missing_category", id: fields.id };
  if (placeholderCategory(fields.category) || placeholderCategory(fields.detailCategory)) return { eligible: false, reason: "placeholder_category", id: fields.id };
  for (const value of [fields.officialRaw, fields.mapRaw, fields.sourceRaw]) {
    if (value && !isSafeHttpUrl(value)) return { eligible: false, reason: "invalid_public_url", id: fields.id };
  }
  if (dataset === "medical") {
    if (!fields.cityArea) return { eligible: false, reason: "missing_city_or_area", id: fields.id };
    if (!safeHttpUrl(fields.officialRaw || fields.sourceRaw)) return { eligible: false, reason: "missing_provenance_url", id: fields.id };
    if (!isValidDate(fields.reviewDate)) return { eligible: false, reason: "missing_review_date", id: fields.id };
  }
  return { eligible: true, reason: "", id: fields.id };
}

export function normalizeDirectoryItem(row, dataset, index) {
  const fields = directoryFields(row, dataset, index);
  const latitude = toNumber(first(row, ["latitude", "lat", "location_lat", "location/lat"]));
  const longitude = toNumber(first(row, ["longitude", "lng", "lon", "location_lng", "location/lng"]));
  const hasCoordinates = clean(first(row, ["latitude", "lat", "location_lat", "location/lat"])) !== ""
    && clean(first(row, ["longitude", "lng", "lon", "location_lng", "location/lng"])) !== ""
    && Number.isFinite(latitude) && Number.isFinite(longitude);
  const address = first(row, ["address", "completeAddress", "completeaddress", "street"]);
  const description = first(row, ["short_description", "description_ja", "description"]);
  return {
    id: fields.id, slug: first(row, ["slug"]) || stableSlug(fields.name, fields.cityArea, fields.id), status: "active",
    name: fields.name, title: fields.name, name_ja: first(row, ["name_ja"]), name_en: first(row, ["name_en"]),
    category: fields.category, category1: fields.category, detail_category: fields.detailCategory, category2: fields.detailCategory,
    city: first(row, ["city"]), region: first(row, ["region", "state", "area", "city"]), area: first(row, ["area"]),
    address, street: first(row, ["street", "address"]), postcode: first(row, ["postcode", "postalCode", "postalcode"]),
    country_code: first(row, ["country_code", "countryCode", "countrycode"]),
    short_description: description, description,
    detail_comment: first(row, ["detail_comment", "long_description", "comment"]),
    description_en: first(row, ["description_en"]), tags: first(row, ["tags", "keywords"]),
    price: first(row, ["price", "price_range"]), rating: toNumber(first(row, ["rating", "totalScore", "totalscore", "score"])),
    reviews_count: toNumber(first(row, ["reviews_count", "reviewsCount", "reviewscount", "review_count"])),
    official_url: safeHttpUrl(fields.officialRaw), website: safeHttpUrl(fields.officialRaw), map_url: safeHttpUrl(fields.mapRaw),
    source_url: safeHttpUrl(fields.sourceRaw), phone: first(row, ["phone", "telephone", "tel"]),
    opening_hours: first(row, ["opening_hours", "openingHours", "hours"]),
    language_support: first(row, ["language_support", "language", "languages"]),
    latitude: hasCoordinates ? latitude : null, longitude: hasCoordinates ? longitude : null,
    last_reviewed_at: toIsoDate(fields.reviewDate), updated_at: toIsoDate(first(row, ["updated_at"]))
  };
}

function sortCommunityNewest(items) {
  return items.sort((a, b) => {
    const aTime = Date.parse(a.published_at || a.created_at || "") || 0;
    const bTime = Date.parse(b.published_at || b.created_at || "") || 0;
    if (aTime !== bTime) return bTime - aTime;
    return String(a.id).localeCompare(String(b.id), "ja");
  });
}

function sortJobsNewest(items) {
  return items.sort((a, b) => {
    const getTime = (item) => {
      for (const value of [item.published_at, item.created_at, item.updated_at]) {
        const time = Date.parse(value || "");
        if (Number.isFinite(time)) return time;
      }
      return 0;
    };
    const dateDiff = getTime(b) - getTime(a);
    if (dateDiff) return dateDiff;
    if (a.priority !== b.priority) return (a.priority || 999) - (b.priority || 999);
    return String(a.id).localeCompare(String(b.id), "ja");
  });
}

function sortDirectory(items) {
  return items.sort((a, b) => String(a.name).localeCompare(String(b.name), "ja") || String(a.id).localeCompare(String(b.id), "ja"));
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

export function strictSourceItems(payload, label, { allowEmpty = false } = {}) {
  let items;
  if (Array.isArray(payload)) {
    items = payload;
  } else if (payload && typeof payload === "object" && payload.ok !== false) {
    for (const key of ["data", "rows", "items", "posts", "jobs"]) {
      if (Array.isArray(payload[key])) {
        items = payload[key];
        break;
      }
    }
  } else if (payload?.ok === false) {
    throw new Error(`${label} returned ok:false: ${clean(payload.error) || "unknown error"}`);
  }
  if (!items) throw new Error(`${label} returned an incompatible payload.`);
  if (Object.hasOwn(payload, "count") && Number(payload.count) !== items.length) {
    throw new Error(`${label} count mismatch: declared ${payload.count}, received ${items.length}.`);
  }
  if (!allowEmpty && !items.length) throw new Error(`${label} unexpectedly returned zero source items.`);
  return items;
}

function sourceCounts(payload, rows) {
  const report = payload?.validation_report || payload?.report || {};
  const sourceCount = Number(report.source_count);
  const activeCount = Number(report.active_count);
  return {
    source_count: Number.isFinite(sourceCount) ? sourceCount : rows.length,
    explicitly_active_count: Number.isFinite(activeCount) ? activeCount : rows.filter((row) => clean(row?.status).toLowerCase() === "active").length,
    upstream_excluded_by_reason: report.excluded_by_reason && typeof report.excluded_by_reason === "object" ? report.excluded_by_reason : {}
  };
}

function validationReport(payload, rows, results, generatedCount, extra = {}) {
  const source = sourceCounts(payload, rows);
  const excludedByReason = { ...source.upstream_excluded_by_reason };
  const excludedIds = {};
  const eligible = results.filter((result) => result.eligible);
  for (const result of results.filter((entry) => !entry.eligible)) {
    excludedByReason[result.reason] = (excludedByReason[result.reason] || 0) + 1;
    if (!excludedIds[result.reason]) excludedIds[result.reason] = [];
    if (excludedIds[result.reason].length < 50 && result.id) excludedIds[result.reason].push(result.id);
  }
  const upstreamExcluded = Math.max(0, source.source_count - source.explicitly_active_count);
  const rowExcluded = rows.length - eligible.length;
  return {
    source_count: source.source_count,
    explicitly_active_count: source.explicitly_active_count,
    eligible_count: eligible.length,
    excluded_count: Math.max(upstreamExcluded + rowExcluded, source.source_count - eligible.length),
    excluded_by_reason: excludedByReason,
    excluded_safe_ids: excludedIds,
    generated_count: generatedCount,
    ...extra
  };
}

export function publicPayload(source, endpoint, items, validation = undefined) {
  const payload = { api_version: EXPECTED_API_VERSION, source, endpoint, count: items.length, items };
  if (validation) payload.validation = validation;
  if (payload.count !== payload.items.length) throw new Error(`${source} generated count mismatch.`);
  return payload;
}

export function assertNoPrivateFields(value, pathLabel = "public JSON") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPrivateFields(item, `${pathLabel}[${index}]`));
    return true;
  }
  if (!value || typeof value !== "object") return true;
  for (const [key, nested] of Object.entries(value)) {
    if (PRIVATE_FIELD_PATTERN.test(key)) throw new Error(`${pathLabel} contains forbidden private field: ${key}`);
    assertNoPrivateFields(nested, `${pathLabel}.${key}`);
  }
  return true;
}

export async function writeJsonIfChanged(file, data) {
  assertNoPrivateFields(data);
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

function logReport(name, report, generatedIds) {
  console.log(`${name}: source=${report.source_count} active=${report.explicitly_active_count} eligible=${report.eligible_count} excluded=${report.excluded_count} generated=${report.generated_count}`);
  console.log(`${name} exclusions: ${JSON.stringify(report.excluded_by_reason)}`);
  console.log(`${name} generated safe IDs: ${generatedIds.slice(0, 20).join(", ")}${generatedIds.length > 20 ? ` … +${generatedIds.length - 20}` : ""}`);
}

export async function main() {
  const { endpoint: masterEndpoint, sourceType } = await getMasterEndpoint();
  const urls = {
    community: buildUrl(masterEndpoint, { action: "getPosts", bypassCache: "true", includeClosed: "false" }),
    jobs: buildUrl(masterEndpoint, { sheet: "jobs", lang: "ja", status: "active" }),
    eat: buildUrl(masterEndpoint, { sheet: "eat", lang: "ja", status: "active" }),
    shopping: buildUrl(masterEndpoint, { sheet: "shopping", lang: "ja", status: "active" }),
    medical: buildUrl(masterEndpoint, { sheet: "medical", lang: "ja", status: "active" })
  };
  const names = Object.keys(urls);
  const fetched = await Promise.all(names.map((name) => fetchJson(urls[name])));
  const payloads = Object.fromEntries(names.map((name, index) => [name, fetched[index]]));

  // Validate every response before computing or writing any output. A stale
  // deployment therefore cannot partially replace a known-good snapshot.
  names.forEach((name) => assertApiVersion(payloads[name], `${name} Master GAS`));

  const communityRows = strictSourceItems(payloads.community, "Community Master GAS");
  const jobRows = strictSourceItems(payloads.jobs, "Jobs Master GAS");
  const directoryRows = {
    eat: strictSourceItems(payloads.eat, "Eat Master GAS", { allowEmpty: true }),
    shopping: strictSourceItems(payloads.shopping, "Shopping Master GAS", { allowEmpty: true }),
    medical: strictSourceItems(payloads.medical, "Medical Master GAS", { allowEmpty: true })
  };

  const communityResults = communityRows.map((row, index) => ({
    eligible: isPublicCommunityPost(row), reason: "lifecycle_excluded", id: first(row, ["post_id", "id"]) || `community-${index + 1}`
  }));
  const communityItems = sortCommunityNewest(communityRows.filter((_, index) => communityResults[index].eligible).map(normalizeCommunityPost));
  if (!communityItems.length) throw new Error("Community Master GAS returned zero public-eligible items.");

  const jobResults = jobRows.map((row, index) => ({ ...classifyJob(row), id: first(row, ["job_id", "id"]) || `job-${index + 1}` }));
  const normalizedJobs = jobRows
    .map((row, index) => ({ row, index, classification: jobResults[index] }))
    .filter(({ classification }) => classification.eligible)
    .map(({ row, index, classification }) => normalizeJob(row, index, classification));
  const realJobs = normalizedJobs.filter((job) => job.listing_type === "real");
  const allSampleJobs = sortJobsNewest(normalizedJobs.filter((job) => job.listing_type === "sample"));
  const sampleJobs = allSampleJobs.slice(0, SAMPLE_JOB_LIMIT);
  const cappedSampleJobs = allSampleJobs.slice(SAMPLE_JOB_LIMIT);
  const jobItems = sortJobsNewest([...realJobs, ...sampleJobs]);
  const cappedSamples = cappedSampleJobs.length;

  const directoryItems = {};
  const directoryResults = {};
  for (const dataset of Object.keys(directoryRows)) {
    directoryResults[dataset] = directoryRows[dataset].map((row, index) => validateDirectoryRow(row, dataset, index));
    directoryItems[dataset] = sortDirectory(directoryRows[dataset]
      .filter((_, index) => directoryResults[dataset][index].eligible)
      .map((row, index) => normalizeDirectoryItem(row, dataset, index)));
  }

  validateUnique(communityItems, ["id"], "community posts");
  validateUnique(jobItems, ["id"], "jobs");
  for (const dataset of Object.keys(directoryItems)) validateUnique(directoryItems[dataset], ["id"], dataset);

  const reports = {
    community: validationReport(payloads.community, communityRows, communityResults, communityItems.length),
    jobs: validationReport(payloads.jobs, jobRows, jobResults, jobItems.length, {
      sample_limit: SAMPLE_JOB_LIMIT,
      sample_limit_excluded_count: cappedSamples,
      sample_generated_count: sampleJobs.length,
      real_generated_count: realJobs.length
    })
  };
  if (cappedSamples) {
    reports.jobs.excluded_by_reason.sample_limit = cappedSamples;
    reports.jobs.excluded_safe_ids.sample_limit = cappedSampleJobs.map((job) => job.id);
    reports.jobs.excluded_count += cappedSamples;
    reports.jobs.eligible_count = jobItems.length;
  }
  for (const dataset of Object.keys(directoryItems)) {
    reports[dataset] = validationReport(payloads[dataset], directoryRows[dataset], directoryResults[dataset], directoryItems[dataset].length, {
      map_eligible_count: directoryItems[dataset].filter((item) => item.latitude !== null && item.longitude !== null).length,
      intentionally_empty: directoryItems[dataset].length === 0
    });
  }

  const changed = [];
  const writes = [
    [outputPaths.communityPosts, publicPayload("master-gas:community", "canonicalMasterEndpoint?action=getPosts&bypassCache=true&includeClosed=false", communityItems, reports.community), "community posts"],
    [outputPaths.communityCategories, { api_version: EXPECTED_API_VERSION, source: "master-gas:community", count: communityItems.length, groups: categories(communityItems, ["category1", "category2", "city", "region"]) }, "community categories"],
    [outputPaths.jobs, publicPayload("master-gas:jobs", "canonicalMasterEndpoint?sheet=jobs&lang=ja&status=active", jobItems, reports.jobs), "jobs"],
    [outputPaths.jobCategories, { api_version: EXPECTED_API_VERSION, source: "master-gas:jobs", count: jobItems.length, groups: categories(jobItems, ["region", "city", "category", "detail_category", "employment_type", "work_style", "language"]) }, "job categories"],
    [outputPaths.eat, publicPayload("master-gas:eat", "canonicalMasterEndpoint?sheet=eat&lang=ja&status=active", directoryItems.eat, reports.eat), "eat"],
    [outputPaths.shopping, publicPayload("master-gas:shopping", "canonicalMasterEndpoint?sheet=shopping&lang=ja&status=active", directoryItems.shopping, reports.shopping), "shopping"],
    [outputPaths.medical, publicPayload("master-gas:medical", "canonicalMasterEndpoint?sheet=medical&lang=ja&status=active", directoryItems.medical, reports.medical), "medical"]
  ];
  for (const [file, data, label] of writes) if (await writeJsonIfChanged(file, data)) changed.push(label);

  console.log(`Public data source: ${sourceType}; ${sanitizedEndpointIdentity(masterEndpoint)}; expected API ${EXPECTED_API_VERSION}`);
  logReport("Community", reports.community, communityItems.map((item) => item.id));
  logReport("Jobs", reports.jobs, jobItems.map((item) => item.id));
  for (const dataset of ["eat", "shopping", "medical"]) logReport(dataset[0].toUpperCase() + dataset.slice(1), reports[dataset], directoryItems[dataset].map((item) => item.id));
  console.log(changed.length ? `Updated: ${changed.join(", ")}` : "Public data is already current.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Public data sync failed: ${clean(error?.message) || "unknown error"}`);
    process.exitCode = 1;
  });
}
