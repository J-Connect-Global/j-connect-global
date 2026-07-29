import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  publicSnapshotItems,
  renderPublicListSnapshots
} from "./render-public-list-snapshots.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixedNow = new Date("2026-07-29T12:00:00.000Z");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function snapshot(html, name) {
  const start = `<!-- PUBLIC-SNAPSHOT:${name}:start -->`;
  const end = `<!-- PUBLIC-SNAPSHOT:${name}:end -->`;
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `${name} snapshot markers are missing`);
  return html.slice(startIndex + start.length, endIndex);
}

function countItems(html, kind) {
  return (html.match(new RegExp(`data-public-snapshot-item="${kind}"`, "g")) || []).length;
}

function withoutScripts(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function payload(items) {
  return {
    api_version: "test",
    source: "test",
    generated_at: fixedNow.toISOString(),
    count: items.length,
    items,
    validation: { generated_count: items.length }
  };
}

function community(id, overrides = {}) {
  return {
    id,
    post_id: id,
    detail_url: `/germany/ja/community/posts/${id}/`,
    status: "active",
    title: `投稿 ${id}`,
    body: "公開本文",
    category1: "質問",
    category2: "生活一般",
    country: "ドイツ",
    region: "NRW",
    city: "デュッセルドルフ",
    published_at: "2026-07-20T10:00:00.000Z",
    created_at: "2026-07-19T10:00:00.000Z",
    expires_at: "",
    image_urls: [],
    ...overrides
  };
}

function job(id, overrides = {}) {
  return {
    id,
    job_id: id,
    detail_url: `/germany/ja/jobs/${id}/`,
    status: "active",
    company_name: `会社 ${id}`,
    position_title: `求人 ${id}`,
    location: "デュッセルドルフ",
    summary: "公開概要",
    published_at: "2026-07-20T10:00:00.000Z",
    expires_at: "",
    ...overrides
  };
}

function assertRepositorySnapshots(siteDir = "") {
  const result = renderPublicListSnapshots({ root: rootDir, now: fixedNow, write: false });
  const repeated = renderPublicListSnapshots({ root: rootDir, now: fixedNow, write: false });
  assert.deepEqual(repeated.html, result.html, "same committed JSON must produce deterministic HTML");

  const home = result.html.home;
  const jobsHtml = result.html.jobs;
  const communityHtml = result.html.community;
  const jobList = snapshot(jobsHtml, "jobs-list");
  const communityList = snapshot(communityHtml, "community-list");
  const homeJobs = snapshot(home, "home-jobs-cards");
  const homeCommunityMini = snapshot(home, "home-community-mini");
  const homeCommunity = snapshot(home, "home-community-cards");

  assert.equal(countItems(jobList, "jobs"), result.jobs.length, "Jobs initial HTML must contain every eligible public job");
  assert.equal(countItems(communityList, "community"), result.community.length, "Community initial HTML must contain every eligible public post");
  assert.equal(countItems(homeJobs, "jobs"), Math.min(result.jobs.length, 4), "Home Jobs must preserve its four-item cap");
  assert.equal(countItems(homeCommunity, "community"), Math.min(result.community.length, 5), "Home Community must preserve its five-item cap");
  if (/https:\/\/drive\.google\.com\/thumbnail/.test(`${homeCommunityMini}${homeCommunity}`)) {
    assert.match(homeCommunityMini, /[?&](?:amp;)?sz=w128(?:&|&amp;|")/, "Home mini thumbnails must request the bounded 128 px rendition");
    assert.match(homeCommunity, /[?&](?:amp;)?sz=w480(?:&|&amp;|")/, "Home cards must request the bounded 480 px rendition");
    assert.doesNotMatch(`${homeCommunityMini}${homeCommunity}`, /[?&](?:amp;)?sz=w1200(?:&|&amp;|")/, "Home snapshots must not request full-size Drive thumbnails");
  }

  for (const item of result.jobs) {
    assert.match(jobList, new RegExp(`href="${item.detail_url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
  for (const item of result.community) {
    assert.match(communityList, new RegExp(`href="${item.detail_url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
  assert.doesNotMatch(jobList, /\/jobs\/detail\/\?id=/, "crawler-visible Jobs links must use canonical detail routes");
  assert.doesNotMatch(communityList, /\/community\/post\/\?id=/, "crawler-visible Community links must use canonical detail routes");

  const staticJobs = withoutScripts(jobsHtml);
  const staticCommunity = withoutScripts(communityHtml);
  assert.doesNotMatch(snapshot(staticJobs, "jobs-list"), /読み込んでいます/, "no-JS Jobs must not be loading-only");
  assert.doesNotMatch(snapshot(staticCommunity, "community-list"), /読み込んでいます/, "no-JS Community must not be loading-only");
  assert.match(staticJobs, /検索・絞り込み・保存機能には JavaScript が必要です/);
  assert.match(staticCommunity, /検索・絞り込み・保存機能には JavaScript が必要です/);

  for (const forbidden of [
    "contact_name",
    "contact_email",
    "contact_email_private",
    "manage_url",
    "manage_token",
    "manage_token_hash"
  ]) {
    assert.ok(!jobList.includes(forbidden) && !communityList.includes(forbidden), `${forbidden} leaked into initial HTML`);
  }

  if (siteDir) {
    const artifactJobs = fs.readFileSync(path.join(siteDir, "germany/ja/jobs/index.html"), "utf8");
    const artifactCommunity = fs.readFileSync(path.join(siteDir, "germany/ja/community/index.html"), "utf8");
    for (const item of result.jobs) assert.ok(artifactJobs.includes(`href="${item.detail_url}"`), `Pages artifact lacks ${item.detail_url}`);
    for (const item of result.community) assert.ok(artifactCommunity.includes(`href="${item.detail_url}"`), `Pages artifact lacks ${item.detail_url}`);
  }
}

function assertLifecyclePolicy() {
  const rows = [
    community("public"),
    community("hidden", { status: "hidden" }),
    community("moderation-pending", { moderation_status: "pending" }),
    community("deleted", { deleted: true }),
    community("expired", { expires_at: "2026-07-28T00:00:00.000Z" })
  ];
  assert.deepEqual(
    publicSnapshotItems(payload(rows), "community", fixedNow).map((item) => item.id),
    ["public"],
    "Community snapshot must reuse its lifecycle eligibility"
  );

  const jobs = [
    job("public"),
    job("inactive", { status: "inactive" }),
    job("expired", { expires_at: "2026-07-28T00:00:00.000Z" })
  ];
  assert.deepEqual(
    publicSnapshotItems(payload(jobs), "jobs", fixedNow).map((item) => item.id),
    ["public"],
    "Jobs snapshot must reuse its publication policy"
  );
}

function assertEmptyEscapingAndPrivacy() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "jconnect-public-snapshots-"));
  try {
    for (const relativePath of [
      "germany/ja/index.html",
      "germany/ja/jobs/index.html",
      "germany/ja/community/index.html"
    ]) {
      const target = path.join(tempRoot, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, read(relativePath), "utf8");
    }
    const communityFile = path.join(tempRoot, "assets/data/community/posts.json");
    const jobsFile = path.join(tempRoot, "assets/data/jobs/jobs.json");
    fs.mkdirSync(path.dirname(communityFile), { recursive: true });
    fs.mkdirSync(path.dirname(jobsFile), { recursive: true });

    fs.writeFileSync(communityFile, `${JSON.stringify(payload([]), null, 2)}\n`, "utf8");
    fs.writeFileSync(jobsFile, `${JSON.stringify(payload([]), null, 2)}\n`, "utf8");
    const empty = renderPublicListSnapshots({ root: tempRoot, now: fixedNow, write: false });
    assert.match(snapshot(empty.html.community, "community-list"), /現在公開中の投稿はありません/);
    assert.match(snapshot(empty.html.jobs, "jobs-list"), /現在公開中の求人はありません/);

    const unsafeMarkupPost = community("safe-post", {
      title: "<script>alert(1)</script>",
      body: "<img src=x onerror=alert(1)>"
    });
    fs.writeFileSync(communityFile, `${JSON.stringify(payload([unsafeMarkupPost]), null, 2)}\n`, "utf8");
    const escaped = renderPublicListSnapshots({ root: tempRoot, now: fixedNow, write: false });
    const escapedList = snapshot(escaped.html.community, "community-list");
    assert.ok(!escapedList.includes("<script>alert(1)</script>"));
    assert.ok(escapedList.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.ok(!escapedList.includes("<img src=x onerror=alert(1)>"));

    const privatePost = community("private-post", { contact_email: "private@example.com" });
    fs.writeFileSync(communityFile, `${JSON.stringify(payload([privatePost]), null, 2)}\n`, "utf8");
    assert.throws(
      () => renderPublicListSnapshots({ root: tempRoot, now: fixedNow, write: false }),
      /private|forbidden|email/i,
      "private fields must fail before HTML generation"
    );

    fs.writeFileSync(communityFile, `${JSON.stringify(payload([]), null, 2)}\n`, "utf8");
    const unsafeUrlJob = job("unsafe-url", {
      company_url: "https://example.com/profile?manage_token=secret"
    });
    fs.writeFileSync(jobsFile, `${JSON.stringify(payload([unsafeUrlJob]), null, 2)}\n`, "utf8");
    assert.throws(
      () => renderPublicListSnapshots({ root: tempRoot, now: fixedNow, write: false }),
      /private|unsafe|URL/i,
      "credential-bearing URLs must fail before HTML generation"
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

const siteArg = process.argv.indexOf("--site-dir");
const siteDir = siteArg >= 0 && process.argv[siteArg + 1]
  ? path.resolve(rootDir, process.argv[siteArg + 1])
  : "";

assertRepositorySnapshots(siteDir);
assertLifecyclePolicy();
assertEmptyEscapingAndPrivacy();
console.log("Crawler-first public list snapshot tests passed.");
