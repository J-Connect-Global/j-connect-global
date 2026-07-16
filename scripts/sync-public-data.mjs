import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeDirectoryCategoryPair, normalizeDirectoryRating } from "./directory-category-map.mjs";
import { publicDetailUrl } from "./public-detail-routes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataSourcesPath = path.join(rootDir, "assets/js/data-sources.js");

export const EXPECTED_API_VERSION = "2026-07-13.1";

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
const PRIVATE_FIELD_PATTERN = /(?:email|contact_name|reviewer|manage_|token|secret|password|authorization|credential|signature|api[_-]?key|admin_|internal|moderation|submission_key|approval_|spreadsheet|notes_internal)/i;
const PRIVATE_URL_PATH_PATTERN = /\/(?:manage|admin|internal)(?:[/?#]|$)/i;
const PRIVATE_IDENTIFIER_PATTERN = /(?:^|[._'&-])(?:manage|admin|internal|token|secret|password|email|spreadsheet|moderation)(?:[._'&-]|$)/i;
const SAFE_PUBLIC_ID_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}._'&-]{0,159}$/u;
const SAFE_PUBLIC_SLUG_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}._'&-]{0,239}$/u;
const EMAIL_ADDRESS_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PRIVATE_URL_PARAMETER_NAMES = new Set([
  "token", "secret", "password", "authorization", "auth", "api_key", "apikey",
  "access_token", "refresh_token", "manage_token", "authorization_code", "auth_code",
  "oauth_code", "credential", "credentials", "signature", "sig", "key",
  "email", "contact_email", "reviewer_email"
]);
const PLACEHOLDER_CATEGORY_VALUES = new Set(["test", "placeholder", "dummy", "n/a", "na", "-"]);
const directoryItemDiagnostics = new WeakMap();

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
    throw new Error(`${label} API version mismatch: expected ${expected}, received ${received}. Apps Script source must be deployed as a new version using the existing Web App deployment URL.`);
  }
  return true;
}

function splitMediaValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(splitMediaValue);
  if (typeof value === "object") return Object.values(value).flatMap(splitMediaValue);
  return String(value).split(/[\n,;]/).map((item) => item.trim()).filter(Boolean);
}

function normalizeUrlParameterName(value) {
  return clean(value)
    .normalize("NFKC")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isPrivateUrlParameterName(value) {
  let decoded = "";
  try {
    decoded = decodeUrlComponent(value);
  } catch {
    return true;
  }
  const name = normalizeUrlParameterName(decoded);
  return PRIVATE_URL_PARAMETER_NAMES.has(name)
    || /(?:^|_)(?:token|secret|password|credential|signature)(?:_|$)/.test(name);
}

function decodeUrlComponent(value) {
  let decoded = clean(value);
  for (let index = 0; index < 3; index += 1) {
    const next = decodeURIComponent(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded.normalize("NFKC");
}

function hasPrivateUrlPath(url) {
  try {
    return PRIVATE_URL_PATH_PATTERN.test(decodeUrlComponent(url.pathname).replace(/\\/g, "/"));
  } catch {
    return true;
  }
}

function hasPrivateParameterAssignments(value) {
  let decoded;
  try {
    decoded = decodeUrlComponent(value);
  } catch {
    return true;
  }
  const keys = [];
  const keyPattern = /(?:^|[?&#;/])([^=?&#;/]+)=/g;
  for (const match of decoded.matchAll(keyPattern)) keys.push(match[1]);
  return keys.some(isPrivateUrlParameterName);
}

function hasPrivateUrlParameters(url) {
  if ([...url.searchParams.keys()].some(isPrivateUrlParameterName)) return true;
  return hasPrivateParameterAssignments(url.hash.replace(/^#/, ""));
}

function isPrivateNetworkHost(hostname) {
  const host = clean(hostname).toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (isIP(host) === 4) {
    const [a, b] = host.split(".").map(Number);
    return a === 0 || a === 10 || a === 127
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19))
      || a >= 224;
  }
  if (isIP(host) === 6) {
    if (host === "::" || host === "::1") return true;
    if (/^(?:fc|fd|ff)/i.test(host) || /^fe[89a-f]/i.test(host)) return true;
    const mapped = host.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
    if (mapped) return isPrivateNetworkHost(mapped);
    const mappedHex = host.match(/::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (mappedHex) {
      const high = Number.parseInt(mappedHex[1], 16);
      const low = Number.parseInt(mappedHex[2], 16);
      return isPrivateNetworkHost(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
    return false;
  }
  return false;
}

function hasUnsafeUrlAuthority(value) {
  for (const match of value.matchAll(/(?:https?:)?\/\/([^/?#&]+)/gi)) {
    try {
      const nested = new URL(match[0], "https://j-connect.invalid");
      if (nested.username || nested.password || isPrivateNetworkHost(nested.hostname)) return true;
    } catch {
      return true;
    }
  }
  return false;
}

function isSafeParsedUrl(url) {
  let decodedHref = "";
  try {
    decodedHref = decodeUrlComponent(url.href);
  } catch {
    return false;
  }
  const normalizedDecodedHref = decodedHref.replace(/\\/g, "/");
  return !url.username && !url.password && !EMAIL_ADDRESS_PATTERN.test(normalizedDecodedHref)
    && !isPrivateNetworkHost(url.hostname)
    && !hasUnsafeUrlAuthority(normalizedDecodedHref)
    && !PRIVATE_URL_PATH_PATTERN.test(normalizedDecodedHref)
    && !hasPrivateParameterAssignments(normalizedDecodedHref)
    && !hasPrivateUrlPath(url) && !hasPrivateUrlParameters(url);
}

function isSafeHttpUrl(value) {
  const text = clean(value);
  if (!text) return false;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return isSafeParsedUrl(url);
  } catch {
    return false;
  }
}

function safeHttpUrl(value) {
  return isSafeHttpUrl(value) ? new URL(clean(value)).toString() : "";
}

function safeRelativeUrl(value) {
  const text = clean(value);
  if (!text.startsWith("/") || text.startsWith("//")) return "";
  try {
    const url = new URL(text, "https://j-connect.invalid");
    return url.origin === "https://j-connect.invalid" && isSafeParsedUrl(url)
      ? `${url.pathname}${url.search}${url.hash}`
      : "";
  } catch {
    return "";
  }
}

function safePublicUrl(value, { allowRelative = false } = {}) {
  return safeHttpUrl(value) || (allowRelative ? safeRelativeUrl(value) : "");
}

function safePublicApplicationMethod(value) {
  const text = clean(value);
  if (EMAIL_ADDRESS_PATTERN.test(text) || hasPrivateParameterAssignments(text)) return "";
  let decoded = "";
  try {
    decoded = decodeUrlComponent(text).replace(/\\/g, "/");
  } catch {
    return "";
  }
  if (EMAIL_ADDRESS_PATTERN.test(decoded) || hasUnsafeUrlAuthority(decoded) || PRIVATE_URL_PATH_PATTERN.test(decoded)) return "";
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    if (!isSafeHttpUrl(match[0])) return "";
  }
  return text;
}

function safePublicId(value, fallback, guaranteedFallback = "") {
  for (const raw of [value, fallback, guaranteedFallback]) {
    const candidate = clean(raw).normalize("NFKC");
    if (SAFE_PUBLIC_ID_PATTERN.test(candidate) && !PRIVATE_IDENTIFIER_PATTERN.test(candidate)) return candidate;
  }
  throw new Error("Unable to derive a safe public identifier.");
}

function safePublicSlug(value, fallback, guaranteedFallback = "") {
  for (const raw of [value, fallback, guaranteedFallback]) {
    const candidate = clean(raw).normalize("NFKC");
    if (SAFE_PUBLIC_SLUG_PATTERN.test(candidate) && !PRIVATE_IDENTIFIER_PATTERN.test(candidate)) return candidate;
  }
  throw new Error("Unable to derive a safe public slug.");
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
    return safeRelativeUrl(src);
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
  const fallbackId = stableSlug(title, city, region) || `community-${index + 1}`;
  const id = safePublicId(first(row, ["post_id", "postId", "id", "_id"]), fallbackId, `community-row-${index + 1}`);
  const images = imageUrls(row);
  const createdAt = toIsoDate(first(row, ["created_at", "createdAt", "date", "timestamp"]));
  const publishedAt = communityPublicationDate(row) || createdAt;
  return {
    id, post_id: id,
    slug: safePublicSlug(first(row, ["slug"]), stableSlug(title, city, region, id), id),
    detail_url: publicDetailUrl("community", id),
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

const EXPLICIT_SAMPLE_JOB_VALUES = new Set(["sample", "test", "demo", "fixture", "sandbox"]);
const EXPLICIT_SAMPLE_JOB_FLAGS = ["is_sample", "sample", "is_test", "test", "is_demo", "demo"];
const EXPLICIT_SAMPLE_JOB_TYPES = ["record_type", "data_type", "listing_type", "environment"];
const LEGACY_SAMPLE_JOB_COMPANIES = new Set([
  "A社 (求人サンプル)",
  "B社 (求人サンプル)",
  "C社 (求人サンプル)",
  "D社 (求人サンプル)"
]);

function isTruthyMarker(value) {
  return ["1", "true", "yes", "y"].includes(clean(value).toLowerCase());
}

/**
 * Keep public-data filtering deliberately narrow. The explicit fields are the
 * forward-compatible contract; the exact A–D fixture signatures only retire
 * the four legacy spreadsheet examples and never classify a real company from
 * a generic word such as "sample" in its name or description.
 */
export function isSampleOrTestJobRecord(row) {
  if (EXPLICIT_SAMPLE_JOB_FLAGS.some((field) => isTruthyMarker(row?.[field]))) return true;
  if (EXPLICIT_SAMPLE_JOB_TYPES.some((field) => EXPLICIT_SAMPLE_JOB_VALUES.has(clean(row?.[field]).toLowerCase()))) return true;

  const id = clean(first(row, ["job_id", "id"])).normalize("NFKC").toLowerCase();
  const company = clean(first(row, ["company_name", "company", "company_ja", "company_name_ja"])).normalize("NFKC");
  return /^[a-d]$/.test(id) && LEGACY_SAMPLE_JOB_COMPANIES.has(company);
}

export function classifyJob(row) {
  if (clean(first(row, ["status"])).toLowerCase() !== "active") {
    return { eligible: false, reason: "status_not_active" };
  }
  if (isSampleOrTestJobRecord(row)) return { eligible: false, reason: "sample_or_test_record" };
  return { eligible: true, reason: "" };
}

export function normalizeJob(row, index, classification = classifyJob(row)) {
  const positionTitle = first(row, ["position_title", "job_title", "title", "role", "position"]);
  const companyName = first(row, ["company_name", "company", "company_ja", "company_name_ja"]);
  const region = first(row, ["region", "location", "area", "city", "work_location"]);
  const summary = first(row, ["short_description", "summary", "description_short"]);
  const details = first(row, ["full_description", "description", "job_details"]);
  const tags = first(row, ["tags", "skills", "skill_tags", "requirements_tags"]);
  const fallbackId = stableSlug(positionTitle, companyName, region) || `job-${index + 1}`;
  const id = safePublicId(first(row, ["job_id", "id"]), fallbackId, `job-row-${index + 1}`);
  const applyUrl = safeHttpUrl(first(row, ["apply_url", "application_url", "apply_link"]));
  const logoUrl = normalizeImageSrc(first(row, ["company_logo_url", "logo_url", "image_url", "image"]));
  return {
    id, job_id: id,
    slug: safePublicSlug(first(row, ["slug", "job_slug"]), stableSlug(positionTitle, companyName, region, id), id),
    detail_url: publicDetailUrl("jobs", id),
    status: "active", priority: toNumber(first(row, ["priority"])) || 999,
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
    salary_currency: first(row, ["salary_currency", "currency"]),
    salary_unit: first(row, ["salary_unit", "salary_period", "pay_period"]),
    salary_label: first(row, ["salary_label", "salary"]), summary, short_description: summary,
    job_details: details, description: details,
    requirements: first(row, ["requirements"]), benefits: first(row, ["benefits"]),
    apply_url: applyUrl, application_url: applyUrl,
    apply_method: safePublicApplicationMethod(first(row, ["apply_method", "application_method", "how_to_apply"])),
    company_url: safeHttpUrl(first(row, ["company_url", "company_website", "company_site", "company_link"])),
    source_url: safeHttpUrl(first(row, ["source_url", "official_url", "url", "website"])),
    source_name: first(row, ["source_name", "source", "publisher"]),
    visa_support: first(row, ["visa_support", "visa"]),
    company_logo_url: logoUrl, logo_url: logoUrl, image_url: logoUrl,
    image_alt: first(row, ["image_alt", "imageAlt"]) || companyName || positionTitle,
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
  const fallbackId = stableSlug(dataset, first(row, ["name", "title", "name_ja", "name_en"]), first(row, ["address", "completeAddress", "completeaddress", "street"]), index + 1)
    || `${dataset}-${index + 1}`;
  return safePublicId(candidate && !placeholderCategory(candidate) ? candidate : "", fallbackId, `${dataset}-row-${index + 1}`);
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
  const categoryPair = normalizeDirectoryCategoryPair(dataset, fields.category, fields.detailCategory);
  const latitude = toNumber(first(row, ["latitude", "lat", "location_lat", "location/lat"]));
  const longitude = toNumber(first(row, ["longitude", "lng", "lon", "location_lng", "location/lng"]));
  const hasCoordinates = clean(first(row, ["latitude", "lat", "location_lat", "location/lat"])) !== ""
    && clean(first(row, ["longitude", "lng", "lon", "location_lng", "location/lng"])) !== ""
    && Number.isFinite(latitude) && Number.isFinite(longitude);
  const address = first(row, ["address", "completeAddress", "completeaddress", "street"]);
  const description = first(row, ["short_description", "description_ja", "description"]);
  const item = {
    id: fields.id, slug: safePublicSlug(first(row, ["slug"]), stableSlug(fields.name, fields.cityArea, fields.id), fields.id), status: "active",
    name: fields.name, title: fields.name, name_ja: first(row, ["name_ja"]), name_en: first(row, ["name_en"]),
    category: categoryPair.category1, category1: categoryPair.category1, detail_category: categoryPair.category2, category2: categoryPair.category2,
    city: first(row, ["city"]), region: first(row, ["region", "state", "area", "city"]), area: first(row, ["area"]),
    address, street: first(row, ["street", "address"]), postcode: first(row, ["postcode", "postalCode", "postalcode"]),
    country_code: first(row, ["country_code", "countryCode", "countrycode"]),
    short_description: description, description,
    detail_comment: first(row, ["detail_comment", "long_description", "comment"]),
    description_en: first(row, ["description_en"]), tags: first(row, ["tags", "keywords"]),
    price: first(row, ["price", "price_range"]), rating: normalizeDirectoryRating(first(row, ["rating", "totalScore", "totalscore", "score"])),
    reviews_count: toNumber(first(row, ["reviews_count", "reviewsCount", "reviewscount", "review_count"])),
    official_url: safeHttpUrl(fields.officialRaw), website: safeHttpUrl(fields.officialRaw), map_url: safeHttpUrl(fields.mapRaw),
    source_url: safeHttpUrl(fields.sourceRaw), phone: first(row, ["phone", "telephone", "tel"]),
    opening_hours: first(row, ["opening_hours", "openingHours", "hours"]),
    language_support: first(row, ["language_support", "language", "languages"]),
    latitude: hasCoordinates ? latitude : null, longitude: hasCoordinates ? longitude : null,
    last_reviewed_at: toIsoDate(fields.reviewDate), updated_at: toIsoDate(first(row, ["updated_at"]))
  };
  directoryItemDiagnostics.set(item, { requiresManualCategoryCorrection: categoryPair.requiresManualCorrection });
  return item;
}

function normalizedDirectoryAddress(item) {
  return [item.address, item.postcode, item.city || item.region || item.area]
    .map((value) => clean(value).normalize("NFKC").toLowerCase().replace(/\s+/g, " "))
    .filter(Boolean)
    .join(" | ");
}

export function assessDirectoryDataQuality(items) {
  const categoryCorrectionIds = [];
  const unknownRatingIds = [];
  const coordinates = new Map();

  for (const item of items) {
    if (directoryItemDiagnostics.get(item)?.requiresManualCategoryCorrection) categoryCorrectionIds.push(item.id);
    if (item.rating === null) unknownRatingIds.push(item.id);
    if (item.latitude === null || item.longitude === null) continue;
    const coordinate = `${item.latitude},${item.longitude}`;
    if (!coordinates.has(coordinate)) coordinates.set(coordinate, []);
    coordinates.get(coordinate).push(item);
  }

  const suspiciousCoordinateIds = new Set();
  for (const entries of coordinates.values()) {
    if (new Set(entries.map(normalizedDirectoryAddress).filter(Boolean)).size < 2) continue;
    entries.forEach((item) => suspiciousCoordinateIds.add(item.id));
  }

  const sanitizedItems = items.map((item) => suspiciousCoordinateIds.has(item.id)
    ? { ...item, latitude: null, longitude: null }
    : item);
  return {
    items: sanitizedItems,
    diagnostics: {
      unknown_rating_count: unknownRatingIds.length,
      manual_correction_safe_ids: {
        category_pair: capSafeIds(categoryCorrectionIds),
        suspicious_duplicate_coordinates: capSafeIds([...suspiciousCoordinateIds])
      }
    }
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

export function capSafeIds(ids, limit = 50) {
  return ids.slice(0, Math.max(0, limit));
}

export function publicPayload(source, endpoint, items, validation = undefined) {
  const payload = { api_version: EXPECTED_API_VERSION, source, endpoint, count: items.length, items };
  if (validation) payload.validation = validation;
  if (payload.count !== payload.items.length) throw new Error(`${source} generated count mismatch.`);
  return payload;
}

function isUrlFieldPath(pathLabel) {
  return /(?:url|href|link|endpoint|image|logo|website|homepage)/i.test(pathLabel);
}

function isIdentifierPath(pathLabel) {
  const normalizedPath = pathLabel.replace(/\[\d+\]/g, "");
  return /(?:^|\.)(?:id|post_id|job_id|item_id|place_id|placeid)$/i.test(normalizedPath)
    || /(?:^|\.)(?:excluded_safe_ids|manual_correction_safe_ids)(?:\.|$)/.test(normalizedPath);
}

function isSlugPath(pathLabel) {
  return /(?:^|\.)slug$/i.test(pathLabel.replace(/\[\d+\]/g, ""));
}

export function assertNoPrivateFields(value, pathLabel = "public JSON") {
  if (typeof value === "string") {
    const text = value.trim();
    if (isIdentifierPath(pathLabel)
      && (!SAFE_PUBLIC_ID_PATTERN.test(text.normalize("NFKC")) || PRIVATE_IDENTIFIER_PATTERN.test(text))) {
      throw new Error(`${pathLabel} contains an unsafe public identifier`);
    }
    if (isSlugPath(pathLabel)
      && (!SAFE_PUBLIC_SLUG_PATTERN.test(text.normalize("NFKC")) || PRIVATE_IDENTIFIER_PATTERN.test(text))) {
      throw new Error(`${pathLabel} contains an unsafe public slug`);
    }
    if (/(?:apply_method|application_method|how_to_apply)$/i.test(pathLabel)
      && safePublicApplicationMethod(text) !== text) {
      throw new Error(`${pathLabel} contains private application data`);
    }
    if (isUrlFieldPath(pathLabel)) {
      if (/^(?:https?:\/\/|\/)/i.test(text)) {
        const safe = text.startsWith("/") ? safeRelativeUrl(text) : safeHttpUrl(text);
        if (!safe) throw new Error(`${pathLabel} contains a private or unsafe URL`);
      } else if (/^[a-z][a-z0-9+.-]*:/i.test(text)) {
        throw new Error(`${pathLabel} contains a non-public URL scheme`);
      } else if (EMAIL_ADDRESS_PATTERN.test(text) || hasPrivateParameterAssignments(text)) {
        throw new Error(`${pathLabel} contains private URL data`);
      }
    }
    return true;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPrivateFields(item, `${pathLabel}[${index}]`));
    return true;
  }
  if (!value || typeof value !== "object") return true;
  if (/(?:^|\.)excluded_by_reason$/.test(pathLabel)) {
    for (const [reason, count] of Object.entries(value)) {
      if (!/^[a-z][a-z0-9_]{0,79}$/.test(reason) || !Number.isInteger(count) || count < 0) {
        throw new Error(`${pathLabel}.${reason} must be a non-negative integer with a safe reason label`);
      }
    }
    return true;
  }
  if (/(?:^|\.)(?:excluded_safe_ids|manual_correction_safe_ids)$/.test(pathLabel)) {
    for (const [reason, ids] of Object.entries(value)) {
      if (!/^[a-z][a-z0-9_]{0,79}$/.test(reason) || !Array.isArray(ids) || ids.length > 50) {
        throw new Error(`${pathLabel}.${reason} must be an array capped at 50 IDs with a safe reason label`);
      }
      ids.forEach((id, index) => {
        if (typeof id !== "string" || !id.trim()) {
          throw new Error(`${pathLabel}.${reason}[${index}] must be a non-empty safe string ID`);
        }
        assertNoPrivateFields(id, `${pathLabel}.${reason}[${index}]`);
      });
    }
    return true;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (PRIVATE_FIELD_PATTERN.test(normalizeUrlParameterName(key))) {
      throw new Error(`${pathLabel} contains forbidden private field: ${key}`);
    }
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
  const directory = path.dirname(file);
  await mkdir(directory, { recursive: true });
  const tempFile = path.join(directory, `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`);
  const serialized = `${JSON.stringify({ ...data, generated_at: generatedAt }, null, 2)}\n`;
  try {
    await writeFile(tempFile, serialized, { encoding: "utf8", flag: "wx" });
    await rename(tempFile, file);
  } catch (error) {
    try {
      await rm(tempFile, { force: true });
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], `Failed to replace ${file} and clean up its temporary file.`);
    }
    throw error;
  }
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
    eligible: isPublicCommunityPost(row),
    reason: "lifecycle_excluded",
    id: safePublicId(first(row, ["post_id", "id"]), `community-row-${index + 1}`)
  }));
  const communityItems = sortCommunityNewest(communityRows.filter((_, index) => communityResults[index].eligible).map(normalizeCommunityPost));
  if (!communityItems.length) throw new Error("Community Master GAS returned zero public-eligible items.");

  const jobResults = jobRows.map((row, index) => ({
    ...classifyJob(row),
    id: safePublicId(first(row, ["job_id", "id"]), `job-row-${index + 1}`)
  }));
  const normalizedJobs = jobRows
    .map((row, index) => ({ row, index, classification: jobResults[index] }))
    .filter(({ classification }) => classification.eligible)
    .map(({ row, index, classification }) => normalizeJob(row, index, classification));
  const jobItems = sortJobsNewest(normalizedJobs);

  const directoryItems = {};
  const directoryResults = {};
  const directoryQuality = {};
  for (const dataset of Object.keys(directoryRows)) {
    directoryResults[dataset] = directoryRows[dataset].map((row, index) => validateDirectoryRow(row, dataset, index));
    const normalizedItems = directoryRows[dataset]
      .filter((_, index) => directoryResults[dataset][index].eligible)
      .map((row, index) => normalizeDirectoryItem(row, dataset, index));
    const assessed = assessDirectoryDataQuality(normalizedItems);
    directoryItems[dataset] = sortDirectory(assessed.items);
    directoryQuality[dataset] = assessed.diagnostics;
  }

  validateUnique(communityItems, ["id"], "community posts");
  validateUnique(jobItems, ["id"], "jobs");
  for (const dataset of Object.keys(directoryItems)) validateUnique(directoryItems[dataset], ["id"], dataset);

  const reports = {
    community: validationReport(payloads.community, communityRows, communityResults, communityItems.length),
    jobs: validationReport(payloads.jobs, jobRows, jobResults, jobItems.length)
  };
  for (const dataset of Object.keys(directoryItems)) {
    reports[dataset] = validationReport(payloads[dataset], directoryRows[dataset], directoryResults[dataset], directoryItems[dataset].length, {
      ...directoryQuality[dataset],
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
  // Validate every prepared artifact before the first replacement. Each changed
  // file is then replaced atomically, but the seven files are not one transaction:
  // a later filesystem failure can leave earlier per-file replacements in place.
  for (const [, data, label] of writes) assertNoPrivateFields(data, label);
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
