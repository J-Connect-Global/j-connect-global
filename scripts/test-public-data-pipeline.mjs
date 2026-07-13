import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_API_VERSION,
  SAMPLE_JOB_LIMIT,
  assertApiVersion,
  assertNoPrivateFields,
  assertNoLegacyEndpointOverrides,
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

const sampleRows = ["a", "b", "c", "d"].map((id, index) => ({
  id,
  status: "active",
  listing_type: "sample",
  priority: index + 1,
  position_title: `Sample ${id}`,
  application_email: `apply-${id}@example.com`,
  apply_url: `https://example.com/apply/${id}`
}));
const publicSamples = sampleRows
  .map((row, index) => normalizeJob(row, index, classifyJob(row, now)))
  .slice(0, SAMPLE_JOB_LIMIT);
assert.equal(publicSamples.length, 3, "sample jobs were not capped at three");
for (const sample of publicSamples) {
  assert.equal(sample.listing_type, "sample");
  assert.equal(sample.is_indexable, false);
  assert.equal(sample.emit_job_posting, false);
  assert.equal(Object.hasOwn(sample, "application_email"), false);
  assert.equal(Object.hasOwn(sample, "apply_email"), false);
  assert.equal(sample.apply_url, "");
  assert.equal(sample.sample_label, "掲載見本・応募不可");
}
const legacyGovernance = normalizeJob({ id: "legacy", status: "active", position_title: "Legacy" }, 0, classifyJob({ status: "active" }, now));
assert.equal(legacyGovernance.listing_type, "sample");
assert.equal(legacyGovernance.governance_defaulted, true);
const jobWithLogo = normalizeJob({
  id: "logo",
  status: "active",
  listing_type: "sample",
  position_title: "Logo fixture",
  company_logo_url: "https://cdn.example.com/logo.webp"
}, 0, classifyJob({ status: "active", listing_type: "sample" }, now));
assert.equal(jobWithLogo.company_logo_url, "https://cdn.example.com/logo.webp");
assert.equal(jobWithLogo.image_url, jobWithLogo.company_logo_url);
const jobWithUnsafeLogo = normalizeJob({
  id: "unsafe-logo",
  status: "active",
  listing_type: "sample",
  position_title: "Unsafe logo fixture",
  logo_url: "javascript:alert(1)"
}, 0, classifyJob({ status: "active", listing_type: "sample" }, now));
assert.equal(jobWithUnsafeLogo.logo_url, "");
const unverifiedReal = classifyJob({ status: "active", listing_type: "real", is_verified: false }, now);
assert.equal(unverifiedReal.eligible, false);
assert.equal(unverifiedReal.indexable, false);

const validDirectoryBase = {
  status: "active",
  name: "Public place",
  category1: "Cafe",
  city: "Berlin",
  website: "https://example.com",
  updated_at: "2026-07-01"
};
assert.deepEqual(validateDirectoryRow({ ...validDirectoryBase, category2: "test" }, "eat").reason, "placeholder_category");
assert.deepEqual(validateDirectoryRow({ ...validDirectoryBase, url: "not-http" }, "eat").reason, "invalid_public_url");
assert.deepEqual(validateDirectoryRow({ ...validDirectoryBase, name: "" }, "shopping").reason, "missing_display_name");
assert.deepEqual(validateDirectoryRow({ ...validDirectoryBase, status: "" }, "medical").reason, "status_not_active");
assert.deepEqual(validateDirectoryRow({ ...validDirectoryBase, website: "", source_url: "" }, "medical").reason, "missing_provenance_url");
assert.deepEqual(validateDirectoryRow({ ...validDirectoryBase, updated_at: "" }, "medical").reason, "missing_review_date");
assert.equal(validateDirectoryRow(validDirectoryBase, "medical").eligible, true);
const normalizedDirectory = normalizeDirectoryItem({ ...validDirectoryBase, notes_internal: "private", map_url: "javascript:alert(1)" }, "eat", 0);
assert.equal(normalizedDirectory.map_url, "");
assert.equal(Object.hasOwn(normalizedDirectory, "notes_internal"), false);

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
for (const key of ["contact_email", "reviewer_email", "manage_url", "spreadsheet_id", "moderation_status"]) {
  assert.throws(() => assertNoPrivateFields({ [key]: "private" }), new RegExp(key));
}
for (const privateUrl of [
  "https://example.com/community/manage/?token=private",
  "https://user:password@example.com/public",
  "/admin/review/"
]) {
  assert.throws(() => assertNoPrivateFields({ public_url: privateUrl }), /private/);
}
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
  assert.match(source, /データを読み込んでいます/);
  assert.match(source, /intentionally_empty/);
  assert.match(source, /条件に一致する結果がありません/);
  assert.match(source, /読み込みエラー|一時的に表示できません/);
  assert.match(source, /aria-disabled/);
}
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
assert.equal(/"@type"\s*:\s*"JobPosting"/.test(jobsDetail), false, "sample-capable dynamic detail emits JobPosting");
for (const source of [home, jobsList, jobsDetail]) assert.match(source, /掲載見本・応募不可/);
assert.match(jobsDetail, /isSample[\s\S]*応募・問い合わせ/);
assert.match(communityList, /現在公開中の投稿はありません。最初の投稿を作成できます。/);
assert.match(communityList, /条件に合う投稿はありません/);
assert.match(communityList, /現在、投稿を表示できません/);
assert.match(communityList, /renderSkeletons\(\)/);
assert.match(jobsList, /現在公開中の求人はありません。求人掲載をご希望の場合は、掲載フォームをご利用ください。/);
assert.match(jobsList, /条件に合う求人はありません/);
assert.match(jobsList, /求人情報を読み込めませんでした/);
assert.match(jobsList, /setJobsLoading\(\)/);

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
for (const relative of ["germany/ja/index.html", "germany/ja/community/index.html", "germany/ja/jobs/index.html"]) {
  const source = read(relative);
  assert.equal(/hreflang=["'](?:en|de)["']/.test(source), false, `${relative} emits inactive hreflang`);
  assert.match(source, /<html lang="ja">/);
}

for (const relative of [
  "assets/data/community/posts.json", "assets/data/jobs/jobs.json", "assets/data/eat/items.json",
  "assets/data/shopping/items.json", "assets/data/medical/items.json"
]) {
  const payload = JSON.parse(read(relative));
  assert.equal(payload.count, payload.items.length, `${relative} count mismatch`);
  assert.equal(assertNoPrivateFields(payload), true, `${relative} exposes a private field`);
  if (payload.api_version === EXPECTED_API_VERSION) {
    assert.match(payload.source, /^master-gas:/, `${relative} labels versioned data as a legacy bootstrap`);
  } else {
    assert.equal(payload.api_version, "unversioned-bootstrap", `${relative} has an unsupported public-data version`);
    assert.match(payload.source, /^legacy-gas-bootstrap:/, `${relative} bootstrap source label is unsafe`);
  }
}
for (const relative of ["assets/data/community/categories.json", "assets/data/jobs/categories.json"]) {
  const payload = JSON.parse(read(relative));
  assert.equal(assertNoPrivateFields(payload), true, `${relative} exposes a private field`);
  assert.equal(Array.isArray(payload.groups), true, `${relative} is missing category groups`);
}
const committedCommunity = JSON.parse(read("assets/data/community/posts.json"));
assert.equal(committedCommunity.count, 6);
assert.equal(committedCommunity.items.some((item) => item.title === "test 1"), true);
const committedJobs = JSON.parse(read("assets/data/jobs/jobs.json"));
assert.equal(committedJobs.count, SAMPLE_JOB_LIMIT);
assert.deepEqual(committedJobs.items.map((item) => item.id), ["a", "b", "c"]);
assert.equal(committedJobs.items.every((item) => item.listing_type === "sample" && !item.is_indexable && !item.emit_job_posting), true);
assert.equal(committedJobs.validation.excluded_by_reason.sample_limit, 1);
assert.deepEqual(committedJobs.validation.excluded_safe_ids.sample_limit, ["d"]);
assert.match(home, /const selectedMini = selected\.slice\(0, 3\)/);
assert.match(home, /const selectedCards = selected\.slice\(0, 3\)/);
const committedEat = JSON.parse(read("assets/data/eat/items.json"));
assert.equal(committedEat.items.some((item) => String(item.category2).toLowerCase() === "test"), false);
const committedShopping = JSON.parse(read("assets/data/shopping/items.json"));
assert.equal(committedShopping.validation.excluded_by_reason.missing_display_name, 299);
const committedMedical = JSON.parse(read("assets/data/medical/items.json"));
assert.equal(committedMedical.count, 0);
assert.equal(committedMedical.validation.excluded_by_reason.status_not_active, 23);

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
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("Public data pipeline validation passed.");
