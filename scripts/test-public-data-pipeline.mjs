import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isPublicCommunityPost,
  normalizeCommunityPost,
  writeJsonIfChanged
} from "./sync-public-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const now = Date.parse("2026-07-13T12:00:00Z");

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

for (const row of activeRows) {
  assert.equal(isPublicCommunityPost(row, now), true, `active content was suppressed: ${row.post_id}`);
}

for (const status of ["pending", "rejected", "hidden", "deleted", "inactive", "draft", "spam", "closed"]) {
  assert.equal(isPublicCommunityPost({ status, title: "通常の投稿", body: "本文" }, now), false, `${status} post became public`);
}
for (const flag of ["deleted", "is_deleted", "archived", "hidden", "is_hidden"]) {
  assert.equal(isPublicCommunityPost({ status: "active", [flag]: true }, now), false, `${flag}=true post became public`);
}
assert.equal(isPublicCommunityPost({ status: "active", deleted_at: "2026-07-12T00:00:00Z" }, now), false);
assert.equal(isPublicCommunityPost({ status: "active", hidden_at: "2026-07-12T00:00:00Z" }, now), false);
assert.equal(isPublicCommunityPost({ status: "active", expires_at: "2026-07-12T00:00:00Z" }, now), false);
assert.equal(isPublicCommunityPost({ status: "active", expires_at: "2026-07-14T00:00:00Z" }, now), true);

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
assert.equal(/buildCommunityUrl\(\{\s*action:\s*["'](?:getPosts|listPosts|getPost)/.test(home + communityList + communityDetail + communityContact + communityReport), false, "Community public display still reads GAS");
assert.equal(/buildDirectoryUrl\(\{[\s\S]{0,180}(?:directorySheets\.jobs|sheet:\s*["']jobs)/.test(home + jobsList + jobsDetail), false, "Jobs public display still reads GAS");
assert.equal(communityContact.includes("COMMUNITY_STATIC_POSTS_URL"), true);
assert.equal(communityReport.includes("COMMUNITY_STATIC_POSTS_URL"), true);

assert.match(communityDetail, /この投稿は見つからないか、現在公開されていません。/);
assert.match(jobsDetail, /この求人は見つからないか、現在公開されていません。/);
assert.match(communityDetail, /<meta name="robots" content="noindex, follow">/);
assert.match(jobsDetail, /<meta name="robots" content="noindex, follow">/);
assert.match(communityList, /現在公開中の投稿はありません。最初の投稿を作成できます。/);
assert.match(jobsList, /現在公開中の求人はありません。求人掲載をご希望の場合は、掲載フォームをご利用ください。/);

const headerTemplate = read("templates/layout/ja-header.html");
assert.equal(/header-language|germany\/(?:en|de)\//.test(headerTemplate), false, "JA header still exposes inactive language navigation");
const sitemap = read("sitemap.xml");
assert.equal(/\/germany\/(?:en|de)\/|\/(?:en|de)\//.test(sitemap), false, "Sitemap exposes an inactive language route");
for (const relative of ["germany/ja/index.html", "germany/ja/community/index.html", "germany/ja/jobs/index.html"]) {
  const source = read(relative);
  assert.equal(/hreflang=["'](?:en|de)["']/.test(source), false, `${relative} emits inactive hreflang`);
  assert.match(source, /<html lang="ja">/);
}

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
