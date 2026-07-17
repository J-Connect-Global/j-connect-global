import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_API_VERSION,
  assessDirectoryDataQuality,
  assertApiVersion,
  assertNoPrivateFields,
  assertNoLegacyEndpointOverrides,
  capSafeIds,
  classifyJob,
  communityPublicationDate,
  isPublicCommunityPost,
  normalizeCommunityPost,
  normalizeDirectoryItem,
  normalizeJob,
  publicPayload,
  strictSourceItems,
  validateDirectoryRow,
  writeJsonIfChanged
} from "./sync-public-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const now = Date.parse("2026-07-13T12:00:00Z");

const cappedSafeIds = capSafeIds(Array.from({ length: 55 }, (_, index) => `excluded-${index + 1}`));
assert.equal(cappedSafeIds.length, 50, "excluded safe IDs are not capped at 50");
assert.equal(cappedSafeIds.at(-1), "excluded-50");

const gasContractSource = read("apps-script/community-board-api.gs");
const browserDataSources = read("assets/js/data-sources.js");
const gasVersion = gasContractSource.match(/const\s+PUBLIC_DATA_API_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
assert.equal(EXPECTED_API_VERSION, "2026-07-13.1");
assert.equal(gasVersion, EXPECTED_API_VERSION, "Apps Script and sync public API versions diverged");
assert.equal(/'application_email'|'apply_email'|'public_email'/.test(gasContractSource), false, "GAS public Jobs allowlist exposes email fields");
assert.equal(/Spreadsheet ID|Drive folder ID/.test(browserDataSources), false, "public data-sources.js exposes internal source identifiers");

const retainedContentCases = [
  { title: "test", body: "test" },
  { title: "Test", body: "Test" },
  { title: "テスト", body: "テスト" },
  { title: "テスト投稿", body: "テスト投稿です" },
  { title: "demo", body: "demo" },
  { title: "デモ", body: "デモ" },
  { title: "sample", body: "sample" },
  { title: "サンプル", body: "サンプル" },
  { title: "dummy", body: "dummy" },
  { title: "ダミー", body: "ダミー" },
  { title: "placeholder", body: "placeholder" },
  { title: "a", body: "b" },
  { title: "aaaaaa", body: "aaaaaa" },
  { title: "地域の投稿", body: "本文", city: "test city" },
  { title: "地域の投稿", body: "本文", region: "test region" },
  { title: "タグの投稿", body: "本文", tags: "test, sample" },
  { title: "システム確認", body: "システムの動作を確認" }
];

const activeRows = retainedContentCases.map((row, index) => ({
  post_id: `content-case-${index + 1}`,
  status: "active",
  ...row
}));

const expectedSixIds = [
  "post_b316572b-01e1-4b77-b41a-c87e68d65f0b",
  "post_cd6cadde-3221-4de3-8f8d-935d66331457",
  "post_79f6dfd5-86c4-4c68-bf50-f8a7a1993bfe",
  "post_361ec368-085b-42da-86e4-2c6d3dd2c28a",
  "post_23baeb1d-3d92-4438-9350-e04029bd3add",
  "post_807cffe7-b1af-41c0-89ee-c54b57ce44c5"
];
const sixActiveRows = expectedSixIds.map((postId, index) => ({
  post_id: postId,
  status: "active",
  title: index === 0 ? "test 1" : `active-${index + 1}`,
  body: index === 0 ? "test 1" : `body-${index + 1}`
}));
const sixGenerated = sixActiveRows
  .filter((row) => isPublicCommunityPost(row, now))
  .map(normalizeCommunityPost);
assert.equal(sixGenerated.length, 6, "six active source rows did not generate six public rows");
assert.deepEqual(new Set(sixGenerated.map((item) => item.post_id)), new Set(expectedSixIds));
assert.equal(sixGenerated.find((item) => item.post_id === expectedSixIds[0]).title, "test 1");
assert.equal(publicPayload("test", "test", sixGenerated).count, sixGenerated.length);

assert.equal(assertApiVersion({ api_version: EXPECTED_API_VERSION }, "fixture"), true);
assert.throws(
  () => assertApiVersion({}, "fixture"),
  new RegExp(`expected ${EXPECTED_API_VERSION}, received missing.*Apps Script source must be deployed as a new version using the existing Web App deployment URL`)
);
assert.throws(() => assertApiVersion({ api_version: "legacy" }, "fixture"), /received legacy/);

for (const row of activeRows) {
  assert.equal(isPublicCommunityPost(row, now), true, `active content was suppressed: ${row.post_id}`);
}

for (const status of ["pending", "rejected", "hidden", "deleted", "inactive", "draft", "spam", "closed"]) {
  assert.equal(isPublicCommunityPost({ status, title: "通常の投稿", body: "本文" }, now), false, `${status} post became public`);
}
for (const flag of ["deleted", "is_deleted", "archive", "archived", "is_archived", "hidden", "is_hidden"]) {
  assert.equal(isPublicCommunityPost({ status: "active", [flag]: true }, now), false, `${flag}=true post became public`);
}
assert.equal(isPublicCommunityPost({ status: "", title: "test", body: "test" }, now), false);
assert.equal(isPublicCommunityPost({ status: "", moderation_status: "active", title: "test", body: "test" }, now), false);
assert.equal(isPublicCommunityPost({ status: "active", moderation_status: "pending", title: "test", body: "test" }, now), false);
assert.equal(isPublicCommunityPost({ status: "active", deleted_at: "2026-07-12T00:00:00Z" }, now), false);
assert.equal(isPublicCommunityPost({ status: "active", hidden_at: "2026-07-12T00:00:00Z" }, now), false);
assert.equal(isPublicCommunityPost({ status: "active", expires_at: "2026-07-12T00:00:00Z" }, now), false);
assert.equal(isPublicCommunityPost({ status: "active", expires_at: "2026-07-14T00:00:00Z" }, now), true);
assert.equal(isPublicCommunityPost({ status: "active", expires_at: "not-a-date" }, now), true);
assert.equal(isPublicCommunityPost({ status: "active", title: "", body: "" }, now), true, "empty content incorrectly changed lifecycle eligibility");

assert.equal(strictSourceItems({ ok: true, count: 6, items: sixActiveRows }, "test").length, 6);
assert.throws(() => strictSourceItems({ ok: true }, "test"), /incompatible payload/);
assert.throws(() => strictSourceItems({ ok: true, count: 1, items: [] }, "test"), /count mismatch/);
assert.throws(() => strictSourceItems({ ok: true, count: 0, items: [] }, "test"), /zero source items/);
for (const name of ["COMMUNITY_API_URL", "CONTENTS_API_URL", "JOBS_API_URL", "DIRECTORY_API_URL", "EAT_API_URL", "SHOPPING_API_URL", "MEDICAL_API_URL"]) {
  assert.throws(() => assertNoLegacyEndpointOverrides({ [name]: "https://legacy.example/exec" }), new RegExp(name));
}

const activeJobRows = ["a", "b", "c", "d"].map((id, index) => ({
  id,
  status: "active",
  priority: index + 1,
  position_title: `Job ${id}`,
  application_email: `apply-${id}@example.com`,
  apply_url: `https://example.com/apply/${id}`
}));
const publicJobs = activeJobRows.map((row, index) => normalizeJob(row, index, classifyJob(row, now)));
assert.equal(publicJobs.length, 4, "active Jobs were capped or suppressed");
for (const job of publicJobs) {
  for (const removedField of ["listing_type", "governance_defaulted", "is_verified", "is_indexable", "emit_job_posting", "sample_label"]) {
    assert.equal(Object.hasOwn(job, removedField), false, `obsolete Job field remains: ${removedField}`);
  }
  assert.equal(Object.hasOwn(job, "application_email"), false);
  assert.equal(Object.hasOwn(job, "apply_email"), false);
  assert.match(job.apply_url, /^https:\/\/example\.com\/apply\//);
}
const jobWithLogo = normalizeJob({
  id: "logo",
  status: "active",
  position_title: "Logo fixture",
  company_logo_url: "https://cdn.example.com/logo.webp"
}, 0, classifyJob({ status: "active" }, now));
assert.equal(jobWithLogo.company_logo_url, "https://cdn.example.com/logo.webp");
assert.equal(jobWithLogo.image_url, jobWithLogo.company_logo_url);
const jobWithUnsafeLogo = normalizeJob({
  id: "unsafe-logo",
  status: "active",
  position_title: "Unsafe logo fixture",
  logo_url: "javascript:alert(1)"
}, 0, classifyJob({ status: "active" }, now));
assert.equal(jobWithUnsafeLogo.logo_url, "");
const hardenedRealJob = normalizeJob({
  id: "private@example.com",
  status: "active",
  position_title: "Safe real example",
  slug: "private@example.com",
  detail_url: "mailto:private@example.com",
  apply_method: "Email private@example.com",
  apply_url: "https://example.com/apply#accessToken=private"
}, 0, classifyJob({ status: "active" }, now));
assert.equal(hardenedRealJob.id, "safe-real-example", "unsafe source ID was not replaced with a safe deterministic ID");
assert.equal(hardenedRealJob.slug, "safe-real-example-safe-real-example", "unsafe source slug was not replaced with a safe deterministic slug");
assert.equal(hardenedRealJob.detail_url, "/germany/ja/jobs/safe-real-example/");
assert.equal(hardenedRealJob.apply_method, "");
assert.equal(hardenedRealJob.apply_url, "");
for (const encodedPrivateMethod of [
  "Apply https%3A%2F%2Fuser%3Apassword%40example.com%2Fpublic",
  "Apply https%3A%2F%2F10.0.0.1%2Fpublic",
  "Apply %2F%2F127.0.0.1%2Fpublic"
]) {
  const encodedMethodJob = normalizeJob({
    id: "safe-encoded-method",
    status: "active",
    position_title: "Safe encoded method",
    apply_method: encodedPrivateMethod
  }, 0, classifyJob({ status: "active" }, now));
  assert.equal(encodedMethodJob.apply_method, "", "encoded private application method was published");
  assert.throws(() => assertNoPrivateFields({ apply_method: encodedPrivateMethod }), /private application/);
}
const safeRelativeDetailJob = normalizeJob({
  id: "safe-detail",
  status: "active",
  position_title: "Safe detail",
  detail_url: "/germany/ja/jobs/safe-detail/"
}, 0, classifyJob({ status: "active" }, now));
assert.equal(safeRelativeDetailJob.detail_url, "/germany/ja/jobs/safe-detail/");
const internalTitlePost = normalizeCommunityPost({ status: "active", title: "Internal transfer" }, 0);
assert.equal(internalTitlePost.id, "community-row-1", "private-marker title prevented the guaranteed Community row ID fallback");
assert.equal(internalTitlePost.slug, "community-row-1", "private-marker title leaked into the Community slug");
assert.equal(internalTitlePost.detail_url, "/germany/ja/community/posts/community-row-1/");
const internalTitleJob = normalizeJob(
  { status: "active", position_title: "Internal sales" },
  0,
  classifyJob({ status: "active" }, now)
);
assert.equal(internalTitleJob.id, "job-row-1", "private-marker title prevented the guaranteed Jobs row ID fallback");
assert.equal(internalTitleJob.slug, "job-row-1", "private-marker title leaked into the Jobs slug");
assert.equal(classifyJob({ id: "a", status: "active" }, now).eligible, true, "active ID a must be public");
assert.equal(
  classifyJob({ id: "sample-title", status: "active", position_title: "Sample support role", company_name: "Test Works GmbH" }, now).eligible,
  true,
  "active content containing sample/test must not change publication"
);
for (const status of ["inactive", "hidden", "deleted", "draft"]) {
  assert.deepEqual(classifyJob({ status }, now), { eligible: false, reason: "status_not_active" }, `${status} Job became public`);
}
assert.deepEqual(
  classifyJob({ status: "active", expires_at: "2026-07-12T00:00:00Z" }, now),
  { eligible: false, reason: "expired" },
  "expired Job became public"
);
assert.equal(classifyJob({ status: "active", expires_at: "2026-07-14T00:00:00Z" }, now).eligible, true, "future-expiring Job was excluded");

const validDirectoryBase = {
  status: "active",
  name: "Public place",
  category1: "🌸和食",
  category2: "🍜ラーメン",
  city: "Berlin",
  website: "https://example.com",
  updated_at: "2026-07-01"
};
assert.deepEqual(validateDirectoryRow({ ...validDirectoryBase, category2: "test" }, "eat").reason, "placeholder_category");
assert.deepEqual(validateDirectoryRow({ ...validDirectoryBase, url: "not-http" }, "eat").reason, "invalid_public_url");
assert.deepEqual(validateDirectoryRow({ ...validDirectoryBase, website: "https://example.com/%2561dmin/review" }, "eat").reason, "invalid_public_url");
assert.deepEqual(validateDirectoryRow({ ...validDirectoryBase, name: "" }, "shopping").reason, "missing_display_name");
assert.deepEqual(validateDirectoryRow({ ...validDirectoryBase, status: "" }, "medical").reason, "status_not_active");
assert.deepEqual(validateDirectoryRow({ ...validDirectoryBase, website: "", source_url: "" }, "medical").reason, "missing_provenance_url");
assert.deepEqual(validateDirectoryRow({ ...validDirectoryBase, updated_at: "" }, "medical").reason, "missing_review_date");
assert.equal(validateDirectoryRow(validDirectoryBase, "medical").eligible, true);
const normalizedDirectory = normalizeDirectoryItem({ ...validDirectoryBase, notes_internal: "private", map_url: "javascript:alert(1)" }, "eat", 0);
assert.equal(normalizedDirectory.map_url, "");
assert.equal(Object.hasOwn(normalizedDirectory, "notes_internal"), false);
assert.equal(normalizeDirectoryItem({ ...validDirectoryBase, rating: 0 }, "eat", 0).rating, null);
assert.equal(normalizeDirectoryItem({ ...validDirectoryBase, rating: "4.6" }, "eat", 0).rating, 4.6);
const categoryCorrection = normalizeDirectoryItem({
  ...validDirectoryBase,
  id: "bad-category-pair",
  category1: "🌸和食",
  category2: "食品"
}, "eat", 0);
assert.equal(categoryCorrection.category1, "🌸和食");
assert.equal(categoryCorrection.category2, "", "invalid child category was silently reassigned");
const duplicateBranches = [
  normalizeDirectoryItem({ ...validDirectoryBase, id: "same-name-a", name: "Same branch name", address: "Street 1" }, "eat", 0),
  normalizeDirectoryItem({ ...validDirectoryBase, id: "same-name-b", name: "Same branch name", address: "Street 2" }, "eat", 1)
];
const duplicateBranchQuality = assessDirectoryDataQuality(duplicateBranches);
assert.equal(duplicateBranchQuality.items.length, 2, "same-name branches were deduplicated");
assert.notEqual(duplicateBranchQuality.items[0].id, duplicateBranchQuality.items[1].id);
const suspiciousCoordinates = [
  normalizeDirectoryItem({ ...validDirectoryBase, id: "coord-a", address: "Street 1", latitude: 51.2, longitude: 6.7 }, "eat", 0),
  normalizeDirectoryItem({ ...validDirectoryBase, id: "coord-b", address: "Street 2", latitude: 51.2, longitude: 6.7 }, "eat", 1)
];
const suspiciousCoordinateQuality = assessDirectoryDataQuality(suspiciousCoordinates);
assert.equal(suspiciousCoordinateQuality.items.every((item) => item.latitude === null && item.longitude === null), true);
assert.deepEqual(
  suspiciousCoordinateQuality.diagnostics.manual_correction_safe_ids.suspicious_duplicate_coordinates,
  ["coord-a", "coord-b"]
);
assert.deepEqual(
  assessDirectoryDataQuality([categoryCorrection]).diagnostics.manual_correction_safe_ids.category_pair,
  ["bad-category-pair"]
);
const privateMarkerDirectory = normalizeDirectoryItem({
  ...validDirectoryBase,
  id: "",
  name: "Admin",
  title: "Admin"
}, "eat", 0);
assert.equal(privateMarkerDirectory.id, "eat-row-1", "private-marker name prevented the guaranteed Directory row ID fallback");
assert.equal(privateMarkerDirectory.slug, "eat-row-1", "private-marker name leaked into the Directory slug");
const unsafeImagePost = normalizeCommunityPost({
  post_id: "safe-image-post",
  status: "active",
  title: "Unsafe image",
  image_url_1: "/%61dmin/private.webp"
}, 0);
assert.equal(unsafeImagePost.image_url, "");

const dateFixture = {
  created_at: "2026-07-01T09:00:00Z",
  published_at: "2026-07-02T09:00:00Z",
  updated_at: "2026-07-10T09:00:00Z"
};
assert.equal(communityPublicationDate(dateFixture), "2026-07-02T09:00:00.000Z");
assert.equal(normalizeCommunityPost(dateFixture, 0).published_at, "2026-07-02T09:00:00.000Z");

const privateSource = {
  ...activeRows[0],
  contact_email_private: "private@example.com",
  contact_email: "review@example.com",
  contact_name: "Private Reviewer",
  manage_token: "secret",
  manage_token_hash: "hash",
  manage_url: "https://example.invalid/manage",
  admin_notes: "private",
  approval_notified_status: "waiting_publish",
  submission_key: "private-key"
};
const publicPost = normalizeCommunityPost(privateSource, 0);
assert.equal(publicPost.post_id, privateSource.post_id);
for (const key of [
  "contact_email_private", "contact_email", "contact_name", "manage_token", "manage_token_hash",
  "manage_url", "admin_notes", "approval_notified_status", "submission_key"
]) {
  assert.equal(Object.hasOwn(publicPost, key), false, `private field was emitted: ${key}`);
}
assert.equal(assertNoPrivateFields(publicPost), true);
for (const key of [
  "contact_email", "reviewer_email", "manage_url", "spreadsheet_id", "moderation_status",
  "apiKey", "authorization_code", "credential", "signature", "password",
  "contactName", "manageUrl", "adminNotes", "approvalStatus", "submissionKey", "notesInternal"
]) {
  assert.throws(() => assertNoPrivateFields({ [key]: "private" }), new RegExp(key));
}
assert.equal(assertNoPrivateFields({
  validation: {
    excluded_by_reason: { real_missing_authorization: 1 },
    excluded_safe_ids: { real_missing_authorization: ["job-safe"] },
    manual_correction_safe_ids: { category_pair: ["directory-safe"] }
  }
}), true, "public validation reason labels were treated as private fields");
assert.throws(
  () => assertNoPrivateFields({ validation: { excluded_by_reason: { contact_email: "private@example.com" } } }),
  /non-negative integer/
);
assert.throws(
  () => assertNoPrivateFields({ validation: { excluded_by_reason: { camelCaseReason: 1 } } }),
  /safe reason label/
);
assert.throws(
  () => assertNoPrivateFields({ validation: { excluded_safe_ids: { hidden: Array.from({ length: 51 }, (_, index) => `safe-${index}`) } } }),
  /capped at 50/
);
assert.throws(
  () => assertNoPrivateFields({ validation: { excluded_safe_ids: { hidden: [123] } } }),
  /safe string ID/
);
for (const privateUrl of [
  "https://example.com/community/manage/?token=private",
  "https://user:password@example.com/public",
  "/admin/review/",
  "/%61dmin/review/",
  "/%2561dmin/review/",
  "https://example.com/#access_token=private",
  "https://example.com/#refresh-token=private",
  "https://example.com/?accessToken=private",
  "https://example.com/?%2561ccess_token=private",
  "https://example.com/?authorization_code=private",
  "https://example.com/?X-Amz-Credential=private&X-Amz-Signature=private",
  "https://example.com/?sig=private",
  "https://example.com/out?next=https%3A%2F%2Fother.example%2Fadmin%3Faccess_token%3Dprivate",
  "https://example.com/out?next=https%3A%2F%2Fother.example%2Fadmin%3Fview%3Dreview",
  "https://example.com/out?next=http%3A%2F%2F192.168.1.20%2Freview",
  "https://example.com/out?next=%2F%2F127.0.0.1%2Freview",
  "https://example.com\\admin\\review",
  "https://example.com/apply?candidate=private@example.com",
  "http://127.0.0.1/admin",
  "http://192.168.1.20/public",
  "http://[::1]/public",
  "http://[::ffff:192.168.1.20]/public",
  "http://[fec0::1]/public",
  "http://[ff02::1]/public",
  "https://service.internal/public"
]) {
  assert.throws(() => assertNoPrivateFields({ public_url: privateUrl }), /private|unsafe|non-public/);
}
assert.throws(
  () => assertNoPrivateFields({ images: ["https://example.com/public.webp#api_key=private"] }),
  /private|unsafe/
);
assert.throws(() => assertNoPrivateFields({ detail_url: "mailto:private@example.com" }), /non-public/);
assert.throws(() => assertNoPrivateFields({ apply_method: "Email private@example.com" }), /private application/);
assert.throws(
  () => assertNoPrivateFields({ apply_method: "Apply at https://example.com/#access_token=private" }),
  /private application/
);
assert.throws(() => assertNoPrivateFields({ id: "private@example.com" }), /unsafe public identifier/);
assert.throws(() => assertNoPrivateFields({ placeId: "private@example.com" }), /unsafe public identifier/);
assert.throws(() => assertNoPrivateFields({ slug: "https://example.com/manage?token=private" }), /unsafe public slug/);
assert.throws(() => assertNoPrivateFields({ slug: "manage-token-secret" }), /unsafe public slug/);
assert.throws(() => assertNoPrivateFields({ validation: { excluded_safe_ids: { hidden: ["manage_token_secret"] } } }), /unsafe public identifier/);
assert.equal(assertNoPrivateFields({ body: "/admin/review/?token=content-is-not-a-url-field" }), true);

const runtimeFiles = [
  "scripts/sync-public-data.mjs",
  "assets/js/community-shared.js",
  "germany/ja/community/index.html",
  "germany/ja/community/post/index.html",
  "germany/ja/index.html"
];
for (const relative of runtimeFiles) {
  const source = read(relative);
  assert.equal(source.includes("isLikelyTestPost"), false, `${relative} retains isLikelyTestPost`);
}

const syncWorkflow = read(".github/workflows/sync-public-data.yml");
const pagesWorkflow = read(".github/workflows/pages.yml");
const reusablePagesWorkflow = read(".github/workflows/pages-build-deploy.yml");
for (const legacyName of ["COMMUNITY_API_URL", "CONTENTS_API_URL", "JOBS_API_URL"]) {
  assert.equal(syncWorkflow.includes(legacyName), false, `production workflow still supplies ${legacyName}`);
}
const syncSource = read("scripts/sync-public-data.mjs");
const jobsSharedSource = read("assets/js/jobs-shared.js");
const commonImageSource = read("assets/js/common.js");
assert.equal(syncSource.includes(".filter((item) => item.title || item.body)"), false, "Community sync still suppresses rows based on content");
assert.match(syncSource, /for \(const \[, data, label\] of writes\) assertNoPrivateFields\(data, label\);[\s\S]*for \(const \[file, data, label\] of writes\)/, "public outputs are not all validated before the first write");
assert.match(syncSource, /writeFile\(tempFile,[\s\S]*rename\(tempFile, file\)/, "changed JSON is not written to a same-directory temporary file before rename");
assert.match(syncSource, /rm\(tempFile, \{ force: true \}\)/, "failed per-file replacement does not clean up its temporary file");
assert.equal(/writeFile\(file,/.test(syncSource), false, "writeJsonIfChanged writes directly to its target");
assert.equal(/sample_limit|governance_defaulted/.test(syncSource), false, "obsolete Job publication tiers remain in sync");
assert.equal(/application_email|apply_email|public_email|contact_email/.test(jobsSharedSource), false, "shared Jobs normalization retains public email fields");
assert.match(jobsSharedSource, /company_logo_url/);
assert.match(commonImageSource, /source\.company_logo_url/);

const home = read("germany/ja/index.html");
const communityList = read("germany/ja/community/index.html");
const communityDetail = read("germany/ja/community/post/index.html");
const jobsList = read("germany/ja/jobs/index.html");
const jobsDetail = read("germany/ja/jobs/detail/index.html");
const communityContact = read("germany/ja/community/contact/index.html");
const communityReport = read("germany/ja/community/report/index.html");

for (const [label, source, jsonPath] of [
  ["Home", home, "/assets/data/community/posts.json"],
  ["Community list", communityList, "/assets/data/community/posts.json"],
  ["Community detail", communityDetail, "/assets/data/community/posts.json"],
  ["Jobs list", jobsList, "/assets/data/jobs/jobs.json"],
  ["Jobs detail", jobsDetail, "/assets/data/jobs/jobs.json"]
]) {
  assert.equal(source.includes(jsonPath), true, `${label} does not reference generated public JSON`);
  assert.equal(/trying GAS fallback|GAS_FALLBACK_TIMEOUT_MS/.test(source), false, `${label} retains a GAS display fallback`);
}
for (const [label, source, jsonPath] of [
  ["Eat", read("germany/ja/eat/index.html"), "/assets/data/eat/items.json"],
  ["Shopping", read("germany/ja/shopping/index.html"), "/assets/data/shopping/items.json"],
  ["Medical", read("germany/ja/medical/index.html"), "/assets/data/medical/items.json"]
]) {
  assert.equal(source.includes(jsonPath), true, `${label} does not reference generated public JSON`);
  assert.equal(source.includes("buildDirectoryUrl"), false, `${label} still reads GAS directly`);
  assert.match(source, /UI\.(?:dataStateHtml|renderDataState)/, `${label} does not use the shared data-state renderer`);
  assert.match(source, /intentionally_empty/);
  assert.match(source, /isError \? "error" : kind|isError \? "error" : "loading"/);
  assert.match(source, /aria-disabled/);
}
for (const stateKind of ["loading", "empty", "not-available", "error", "invalid", "inactive"]) {
  assert.match(commonImageSource, new RegExp(`(?:^|\\s)["']?${stateKind.replace("-", "\\-")}["']?\\s*:`), `shared UI copy is missing ${stateKind}`);
}
assert.match(commonImageSource, /escapeHtml\(title\)[\s\S]*escapeHtml\(body\)/, "shared data-state renderer does not escape visible copy");
assert.equal(/buildCommunityUrl\(\{\s*action:\s*["'](?:getPosts|listPosts|getPost)/.test(home + communityList + communityDetail + communityContact + communityReport), false, "Community public display still reads GAS");
assert.equal(/buildDirectoryUrl\(\{[\s\S]{0,180}(?:directorySheets\.jobs|sheet:\s*["']jobs)/.test(home + jobsList + jobsDetail), false, "Jobs public display still reads GAS");
assert.equal(communityContact.includes("COMMUNITY_STATIC_POSTS_URL"), true);
assert.equal(communityReport.includes("COMMUNITY_STATIC_POSTS_URL"), true);

assert.match(communityDetail, /この投稿は見つからないか、現在公開されていません。/);
assert.match(jobsDetail, /この求人は募集終了、非公開、削除済み、または掲載期限終了のため表示できません。/);
assert.match(communityDetail, /<meta name="robots" content="noindex, follow">/);
assert.match(jobsDetail, /<meta name="robots" content="noindex, follow">/);
const jobsInitialHead = jobsDetail.slice(0, jobsDetail.indexOf("</head>") + 7);
assert.match(jobsInitialHead, /<title>求人詳細 \| 仕事・求人 \| J-Connect Germany<\/title>/);
assert.match(jobsInitialHead, /<meta name="description" content="J-Connect Germanyの求人詳細表示ページです。">/);
assert.match(jobsInitialHead, /<link rel="canonical" href="https:\/\/j-connect-global\.com\/germany\/ja\/jobs\/detail\/">/);
assert.match(jobsInitialHead, /<meta name="robots" content="noindex, follow">/);
assert.equal(/"@type"\s*:\s*"JobPosting"/.test(jobsDetail), false, "dynamic detail emits unsupported JobPosting markup");
for (const source of [home, jobsList, jobsDetail, jobsSharedSource]) {
  assert.equal(/掲載見本|応募不可|isSampleJob|listing_type|sample_label/.test(source), false, "obsolete Jobs display tier remains in the UI");
}
assert.match(communityList, /現在公開中の投稿はありません。最初の投稿を作成できます。/);
assert.match(communityList, /条件に合う投稿はありません/);
assert.match(communityList, /現在、投稿を表示できません/);
assert.match(communityList, /renderSkeletons\(\)/);
assert.match(jobsList, /求人情報は準備でき次第公開します。採用担当者の方は、無料掲載フォームから求人をお送りください。/);
assert.match(jobsList, /求人を無料掲載する/);
assert.match(jobsList, /データ最終更新/);
assert.match(jobsList, /条件に合う求人はありません/);
assert.match(jobsList, /求人情報を読み込めませんでした/);
assert.match(jobsList, /setJobsLoading\(\)/);
assert.match(jobsList, /setPublicEmptyMode\(jobs\.length === 0\)/);

const normalizePostStart = communityList.indexOf("function normalizePost(post, index)");
const normalizePostEnd = communityList.indexOf("\n    function ", normalizePostStart + 1);
assert.notEqual(normalizePostStart, -1, "Community normalizePost() is missing");
const normalizePostSource = communityList.slice(normalizePostStart, normalizePostEnd);
assert.match(
  normalizePostSource,
  /const\s+shared\s*=\s*window\.JCONNECT_COMMUNITY_SHARED\s*;/,
  "normalizePost() references shared helpers without declaring the window.JCONNECT_COMMUNITY_SHARED binding"
);

const headerTemplate = read("templates/layout/ja-header.html");
assert.equal(/header-language|germany\/(?:en|de)\//.test(headerTemplate), false, "JA header still exposes inactive language navigation");
const sitemap = read("sitemap.xml");
assert.equal(/\/germany\/(?:en|de)\/|\/(?:en|de)\//.test(sitemap), false, "Sitemap exposes an inactive language route");
const utilityHubRoutes = [
  "/germany/ja/living/travel/area/",
  "/germany/ja/living/travel/family/",
  "/germany/ja/living/travel/relax/",
  "/germany/ja/living/travel/weekend/"
];
const pageRegistry = JSON.parse(read("content/registry/pages.json"));
for (const route of utilityHubRoutes) {
  const page = pageRegistry.find((entry) => entry.url === route);
  assert.ok(page, `missing utility hub registry entry: ${route}`);
  assert.equal(page.search_visible, false, `${route} must remain noindex`);
  assert.equal(page.sitemap_visible, false, `${route} must remain out of the sitemap`);
  assert.equal(sitemap.includes(route), false, `${route} remains in sitemap.xml`);
  const generatedHub = read(`${route.replace(/^\//, "")}index.html`);
  assert.match(generatedHub, /<meta name="robots" content="noindex, follow">/, `${route} is missing noindex, follow`);
}
for (const [relative, asset] of [
  ["germany/ja/learn-german/hospital-phrases/index.html", "hospital-appointment-prep"],
  ["germany/ja/learn-german/job-seeker-german-route/index.html", "job-application-prep"],
  ["germany/ja/learn-german/parenting-german-route/index.html", "parenting-contact-prep"],
  ["germany/ja/living/anmeldung-guide/index.html", "anmeldung-preparation"],
  ["germany/ja/living/germany-first-30-days/index.html", "first-month-checklist"],
  ["germany/ja/living/health-insurance-guide/index.html", "health-insurance-path"]
]) {
  const html = read(relative);
  assert.match(html, new RegExp(`/assets/images/(?:learn-german|living)/${asset}-480\\.webp`), `${relative} is missing the small inline image variant`);
  assert.match(html, new RegExp(`/assets/images/(?:learn-german|living)/${asset}\\.webp`), `${relative} is missing the main inline image asset`);
  assert.match(html, /width="820" height="461" loading="lazy" decoding="async"/, `${relative} inline image is missing intrinsic dimensions or lazy loading`);
  assert.match(html, /AI生成イラスト/, `${relative} does not label its generated illustration`);
}
for (const relative of ["germany/ja/index.html", "germany/ja/community/index.html", "germany/ja/jobs/index.html"]) {
  const source = read(relative);
  assert.equal(/hreflang=["'](?:en|de)["']/.test(source), false, `${relative} emits inactive hreflang`);
  assert.match(source, /<html lang="ja">/);
}

const committedDatasetPayloads = new Map();
for (const relative of [
  "assets/data/community/posts.json", "assets/data/jobs/jobs.json", "assets/data/eat/items.json",
  "assets/data/shopping/items.json", "assets/data/medical/items.json"
]) {
  const payload = JSON.parse(read(relative));
  committedDatasetPayloads.set(relative, payload);
  assert.equal(payload.count, payload.items.length, `${relative} count mismatch`);
  assert.equal(assertNoPrivateFields(payload), true, `${relative} exposes a private field`);
  if (payload.api_version === EXPECTED_API_VERSION) {
    assert.match(payload.source, /^master-gas:/, `${relative} labels versioned data as a legacy bootstrap`);
  } else {
    assert.equal(payload.api_version, "unversioned-bootstrap", `${relative} has an unsupported public-data version`);
    assert.match(payload.source, /^legacy-gas-bootstrap:/, `${relative} bootstrap source label is unsafe`);
  }
}
for (const [relative, itemRelative] of [
  ["assets/data/community/categories.json", "assets/data/community/posts.json"],
  ["assets/data/jobs/categories.json", "assets/data/jobs/jobs.json"]
]) {
  const payload = JSON.parse(read(relative));
  assert.equal(assertNoPrivateFields(payload), true, `${relative} exposes a private field`);
  assert.equal(Array.isArray(payload.groups), true, `${relative} is missing category groups`);
  assert.equal(payload.api_version, committedDatasetPayloads.get(itemRelative).api_version, `${relative} version does not match ${itemRelative}`);
  assert.equal(payload.count, committedDatasetPayloads.get(itemRelative).count, `${relative} count does not match ${itemRelative}`);
}
const committedVersions = new Set([...committedDatasetPayloads.values()].map((payload) => payload.api_version));
assert.equal(committedVersions.size, 1, "committed public datasets contain mixed versions");
const committedCommunity = committedDatasetPayloads.get("assets/data/community/posts.json");
const committedJobs = committedDatasetPayloads.get("assets/data/jobs/jobs.json");
const committedEat = committedDatasetPayloads.get("assets/data/eat/items.json");
const committedShopping = committedDatasetPayloads.get("assets/data/shopping/items.json");
const committedMedical = committedDatasetPayloads.get("assets/data/medical/items.json");

for (const [relative, payload] of committedDatasetPayloads) {
  const report = payload.validation;
  assert.equal(report.generated_count, payload.count, `${relative} generated_count mismatch`);
  assert.equal(report.generated_count + report.excluded_count, report.source_count, `${relative} report counts do not reconcile`);
  for (const ids of Object.values(report.excluded_safe_ids || {})) {
    assert.equal(Array.isArray(ids) && ids.length <= 50, true, `${relative} exposes uncapped excluded safe IDs`);
  }
  for (const ids of Object.values(report.manual_correction_safe_ids || {})) {
    assert.equal(Array.isArray(ids) && ids.length <= 50, true, `${relative} exposes uncapped correction safe IDs`);
  }
}

assert.equal(committedCommunity.count > 0, true, "Community must retain at least one public item");
for (const job of committedJobs.items) {
  for (const removedField of ["listing_type", "governance_defaulted", "is_verified", "is_indexable", "emit_job_posting", "sample_label"]) {
    assert.equal(Object.hasOwn(job, removedField), false, `committed Job retains obsolete field ${removedField}`);
  }
}
assert.match(home, /const allActiveJobs = \[\.\.\.jobs\]\.sort\(jobsShared\.sortNewestFirst\);/);
assert.match(home, /const selectedMini = allActiveJobs\.slice\(0, 4\)/);
assert.match(home, /const selectedCards = allActiveJobs\.slice\(0, 4\)/);
const jobsListSource = read("germany/ja/jobs/index.html");
assert.equal(/\.slice\(0,\s*4\)/.test(jobsListSource), false, "Jobs list is capped at four records");
assert.equal(committedEat.items.some((item) => String(item.category2).toLowerCase() === "test"), false);
for (const payload of [committedEat, committedShopping, committedMedical]) {
  assert.equal(payload.items.every((item) => item.rating === null || item.rating > 0), true, "Directory retained a zero/invalid rating");
}
const eatNameAddresses = new Map();
for (const item of committedEat.items) {
  if (!eatNameAddresses.has(item.name)) eatNameAddresses.set(item.name, new Set());
  eatNameAddresses.get(item.name).add(item.address);
}
assert.equal([...eatNameAddresses.values()].some((addresses) => addresses.size > 1), true, "same-name Eat branches were not preserved");
const shoppingCoordinates = new Map();
for (const item of committedShopping.items.filter((entry) => entry.latitude !== null && entry.longitude !== null)) {
  const coordinate = `${item.latitude},${item.longitude}`;
  if (!shoppingCoordinates.has(coordinate)) shoppingCoordinates.set(coordinate, new Set());
  shoppingCoordinates.get(coordinate).add(`${item.address}|${item.postcode}|${item.city}`.toLowerCase());
}
assert.equal([...shoppingCoordinates.values()].every((addresses) => addresses.size <= 1), true, "suspicious Shopping coordinates remain map-eligible");
const shoppingCorrections = committedShopping.validation.manual_correction_safe_ids || {};
for (const [reason, ids] of Object.entries(shoppingCorrections)) {
  assert.deepEqual(ids, [...new Set(ids)].sort(), `Shopping ${reason} correction IDs are not sorted and unique`);
}

if (committedCommunity.api_version === "unversioned-bootstrap") {
  assert.equal(committedCommunity.count, 6);
  assert.equal(committedCommunity.items.some((item) => item.title === "test 1"), true);
  assert.equal(committedShopping.validation.excluded_by_reason.missing_display_name, 299);
  assert.equal(committedMedical.count, 0);
  assert.equal(committedMedical.validation.excluded_by_reason.status_not_active, 23);
} else {
  assert.equal(committedCommunity.api_version, EXPECTED_API_VERSION);
  assert.equal([...committedDatasetPayloads.values()].every((payload) => payload.source.startsWith("master-gas:")), true);
}

assert.match(syncWorkflow, /assets\/data\/eat\/\*\.json/);
assert.match(syncWorkflow, /commit_hash/);
assert.match(syncWorkflow, /uses:\s+\.\/\.github\/workflows\/pages-build-deploy\.yml/);
assert.match(pagesWorkflow, /uses:\s+\.\/\.github\/workflows\/pages-build-deploy\.yml/);
assert.match(reusablePagesWorkflow, /EXPECTED_APPROVED_COMMUNITY_POST_ID:\s*\$\{\{\s*vars\.EXPECTED_APPROVED_COMMUNITY_POST_ID\s*\}\}/);
assert.equal(/vars\.EXPECTED_APPROVED_COMMUNITY_POST_ID\s*\|\|/.test(reusablePagesWorkflow), false, "Pages workflow still defaults to a specific Community record");
assert.match(reusablePagesWorkflow, /expectedApiVersion\s*=\s*["']2026-07-13\.1["']/);
assert.match(reusablePagesWorkflow, /legacy-gas-bootstrap:/);
assert.match(reusablePagesWorkflow, /master-gas:/);
assert.match(reusablePagesWorkflow, /Refusing to deploy stale commit/);
const pageWorkflowSources = [syncWorkflow, pagesWorkflow, reusablePagesWorkflow].join("\n");
assert.equal((pageWorkflowSources.match(/Build clean Pages artifact/g) || []).length, 1, "Pages artifact builder is duplicated");
assert.equal((pageWorkflowSources.match(/actions\/upload-pages-artifact@/g) || []).length, 1, "Pages artifact upload is duplicated");
assert.equal((pageWorkflowSources.match(/actions\/deploy-pages@/g) || []).length, 1, "Pages deployment is duplicated");

for (const [type, backText] of [
  ["living", "生活・手続き一覧へ戻る"],
  ["events", "イベント一覧へ戻る"],
  ["learn-german", "ドイツ語・学びへ戻る"]
]) {
  const registry = JSON.parse(read(`content/registry/${type}.json`));
  for (const item of registry.filter((entry) => entry.published === true)) {
    const publicPath = String(item.url || item.canonical_url || `/germany/ja/${type}/${item.slug}/`).replace(/^\/+|\/+$/g, "");
    const html = read(path.posix.join(publicPath, "index.html"));
    assert.ok((html.match(/aria-label="記事内目次"/g) || []).length <= 1, `${type}/${item.slug} has duplicate tables of contents`);
    assert.equal((html.match(/article-sidebar-toc/g) || []).length, 0, `${type}/${item.slug} retains a duplicate sidebar TOC`);
    assert.ok((html.match(/>関連記事<\//g) || []).length <= 1, `${type}/${item.slug} has duplicate related-article headings`);
    assert.ok((html.match(new RegExp(backText, "g")) || []).length <= 1, `${type}/${item.slug} has duplicate back links`);
  }
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jconnect-public-data-"));
try {
  const output = path.join(tempDir, "posts.json");
  const payload = { source: "test", count: 1, items: [publicPost] };
  assert.equal(await writeJsonIfChanged(output, payload), true);
  const first = fs.readFileSync(output, "utf8");
  assert.equal(await writeJsonIfChanged(output, payload), false);
  assert.equal(fs.readFileSync(output, "utf8"), first, "unchanged public payload rewrote generated_at");
  assert.deepEqual(fs.readdirSync(tempDir), ["posts.json"], "unchanged write left a temporary file");

  const replacement = { source: "test", count: 0, items: [] };
  assert.equal(await writeJsonIfChanged(output, replacement), true);
  assert.equal(JSON.parse(fs.readFileSync(output, "utf8")).count, 0, "changed payload was not replaced");
  assert.deepEqual(fs.readdirSync(tempDir), ["posts.json"], "successful replacement left a temporary file");

  const blockedTarget = path.join(tempDir, "blocked.json");
  fs.mkdirSync(blockedTarget);
  await assert.rejects(() => writeJsonIfChanged(blockedTarget, payload));
  assert.equal(fs.statSync(blockedTarget).isDirectory(), true, "failed replacement changed the target");
  assert.equal(
    fs.readdirSync(tempDir).some((name) => name.startsWith(".blocked.json.") && name.endsWith(".tmp")),
    false,
    "failed replacement left its same-directory temporary file"
  );
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("Public data pipeline validation passed.");
