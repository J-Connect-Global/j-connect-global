import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildJobPosting, generatePublicDetails, isIndexableJob } from "./generate-public-details.mjs";
import { publicDetailOutputPath, publicDetailUrl } from "./public-detail-routes.mjs";
import { analyzeContentFreshness, freshnessMarkdown } from "./report-content-freshness.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixedNow = new Date("2026-07-16T12:00:00.000Z");

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
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

function community(id = "post-safe") {
  return {
    id, post_id: id, slug: id, detail_url: publicDetailUrl("community", id),
    status: "active", title: "危険 <script>alert(1)</script>", body: "本文 </script><img src=x onerror=alert(1)>",
    category1: "質問", category2: "生活", country: "Germany", region: "NRW", city: "Düsseldorf",
    image_urls: ["https://cdn.example.com/post.webp"], published_at: "2026-07-10T10:00:00.000Z", updated_at: "", expires_at: ""
  };
}

function job(id = "job-safe", overrides = {}) {
  return {
    id, job_id: id, slug: id, detail_url: publicDetailUrl("jobs", id), status: "active",
    company_name: "Example GmbH", position_title: "Support Engineer", location: "Düsseldorf", city: "Düsseldorf", region: "NRW",
    description: "Customers <b>must not become markup</b>.", job_details: "", summary: "Public role",
    requirements: "Experience", employment_type: "正社員", apply_url: "https://jobs.example.com/apply/123",
    application_url: "https://jobs.example.com/apply/123", apply_method: "", company_url: "https://example.com/",
    published_at: "2026-07-11T10:00:00.000Z", updated_at: "", expires_at: "2026-08-31T23:59:59.000Z",
    salary_min_eur: 50000, salary_max_eur: 65000, salary_currency: "EUR", salary_unit: "YEAR",
    ...overrides
  };
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createFixture() {
  const siteDir = await mkdtemp(path.join(os.tmpdir(), "jconnect-public-details-"));
  const layout = `<!doctype html><html><body>
<!-- LAYOUT:ja-header:start --><header><a href="/germany/ja/">J-Connect</a></header><!-- LAYOUT:ja-header:end -->
<!-- LAYOUT:ja-footer:start --><footer>Footer</footer><!-- LAYOUT:ja-footer:end -->
</body></html>`;
  await mkdir(path.join(siteDir, "germany", "ja", "community"), { recursive: true });
  await mkdir(path.join(siteDir, "germany", "ja", "jobs"), { recursive: true });
  await writeFile(path.join(siteDir, "germany", "ja", "community", "index.html"), layout, "utf8");
  await writeFile(path.join(siteDir, "germany", "ja", "jobs", "index.html"), layout, "utf8");
  await writeFile(path.join(siteDir, "index.html"), "<!doctype html><meta name=robots content='index, follow'><h1>Home</h1>", "utf8");
  await mkdir(path.join(siteDir, "assets", "js"), { recursive: true });
  await writeFile(path.join(siteDir, "assets", "js", "search-index.js"), "window.JCONNECT_SEARCH_INDEX = [];\n", "utf8");
  await writeFile(path.join(siteDir, "sitemap.xml"), "<?xml version=\"1.0\"?><urlset><url><loc>https://j-connect-global.com/</loc></url></urlset>\n", "utf8");
  return siteDir;
}

function extractJsonLd(html) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return match ? JSON.parse(match[1]) : null;
}

async function assertProductionArtifact(siteDir) {
  const communityPayload = JSON.parse(await readFile(path.join(siteDir, "assets", "data", "community", "posts.json"), "utf8"));
  const jobsPayload = JSON.parse(await readFile(path.join(siteDir, "assets", "data", "jobs", "jobs.json"), "utf8"));
  const sitemap = await readFile(path.join(siteDir, "sitemap.xml"), "utf8");
  for (const post of communityPayload.items) {
    const route = publicDetailUrl("community", post.id || post.post_id);
    assert.equal(post.detail_url, route);
    const html = await readFile(path.join(siteDir, ...publicDetailOutputPath("community", route, post.id || post.post_id).split("/")), "utf8");
    assert.match(html, /<meta name="robots" content="noindex, follow">/);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
    assert.ok(html.indexOf("<h1") < html.lastIndexOf("<script src="), "Community SSR content must precede client JavaScript");
    assert.ok(!html.includes("DiscussionForumPosting"));
    assert.match(html, /<meta name="twitter:title"/);
    assert.ok(!sitemap.includes(`https://j-connect-global.com${route}`));
  }
  for (const item of jobsPayload.items) {
    const route = publicDetailUrl("jobs", item.id || item.job_id);
    assert.equal(item.detail_url, route);
    const html = await readFile(path.join(siteDir, ...publicDetailOutputPath("jobs", route, item.id || item.job_id).split("/")), "utf8");
    const shouldIndex = isIndexableJob(item);
    assert.equal(/<meta name="robots" content="index, follow">/.test(html), shouldIndex);
    assert.equal(Boolean(extractJsonLd(html)), Boolean(buildJobPosting(item, `https://j-connect-global.com${route}`)));
    assert.equal(sitemap.includes(`https://j-connect-global.com${route}`), shouldIndex);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
    assert.ok(html.indexOf("<h1") < html.lastIndexOf("<script src="), "Jobs SSR content must precede client JavaScript");
    assert.match(html, /<meta name="twitter:description"/);
  }
  for (const route of [
    "germany/ja/jobs/sales-assistant-japanese-duesseldorf/index.html",
    "germany/ja/jobs/it-support-specialist-cologne/index.html",
    "germany/ja/jobs/accounting-staff-munich/index.html"
  ]) {
    const html = await readFile(path.join(siteDir, ...route.split("/")), "utf8");
    assert.match(html, /<meta name="robots" content="noindex, follow">/);
    assert.equal(extractJsonLd(html), null);
  }
}

async function runFixtureTests() {
  const siteDir = await createFixture();
  try {
    const safeCommunity = community();
    const indexable = job();
    const incomplete = job("job-incomplete", { apply_url: "", application_url: "", apply_method: "" });
    const expired = job("job-expired", { expires_at: "2026-07-01T00:00:00.000Z" });
    await writeJson(path.join(siteDir, "assets", "data", "community", "posts.json"), payload([safeCommunity]));
    await writeJson(path.join(siteDir, "assets", "data", "jobs", "jobs.json"), payload([indexable, incomplete]));
    const result = await generatePublicDetails({ siteDir, now: fixedNow });
    assert.deepEqual({ community: result.community, jobs: result.jobs, indexableJobs: result.indexableJobs }, { community: 1, jobs: 2, indexableJobs: 2 });

    const communityHtml = await readFile(path.join(siteDir, "germany", "ja", "community", "posts", "post-safe", "index.html"), "utf8");
    assert.ok(!communityHtml.includes("<script>alert(1)</script>"));
    assert.ok(communityHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.equal((communityHtml.match(/<h1(?:\s|>)/g) || []).length, 1);
    assert.ok(!communityHtml.includes("DiscussionForumPosting"));
    assert.match(communityHtml, /\/germany\/ja\/community\/contact\/\?post_id=post-safe/);
    assert.match(communityHtml, /\/germany\/ja\/community\/report\/\?post_id=post-safe/);
    assert.match(communityHtml, /data-public-lightbox/);

    const jobHtml = await readFile(path.join(siteDir, "germany", "ja", "jobs", "job-safe", "index.html"), "utf8");
    assert.match(jobHtml, /<meta name="robots" content="index, follow">/);
    assert.ok(!jobHtml.includes("Customers <b>must"));
    const posting = extractJsonLd(jobHtml);
    assert.equal(posting["@type"], "JobPosting");
    assert.equal(posting.hiringOrganization.name, "Example GmbH");
    assert.equal(posting.jobLocation.address.addressCountry, "DE");
    assert.equal(posting.baseSalary.currency, "EUR");

    const incompleteHtml = await readFile(path.join(siteDir, "germany", "ja", "jobs", "job-incomplete", "index.html"), "utf8");
    assert.match(incompleteHtml, /<meta name="robots" content="index, follow">/);
    assert.equal(extractJsonLd(incompleteHtml), null);
    assert.ok(!incompleteHtml.includes("公開できる応募方法はありません"));
    assert.ok(!incompleteHtml.includes("検索エンジンへの掲載対象外"));

    const sitemap = await readFile(path.join(siteDir, "sitemap.xml"), "utf8");
    assert.equal((sitemap.match(/https:\/\/j-connect-global\.com\/germany\/ja\/jobs\/job-safe\//g) || []).length, 1);
    assert.ok(sitemap.includes("job-incomplete"));
    assert.ok(!sitemap.includes("community/posts"));

    await writeJson(path.join(siteDir, "assets", "data", "jobs", "jobs.json"), payload([expired]));
    await assert.rejects(() => generatePublicDetails({ siteDir, now: fixedNow }), /expired/);

    await writeJson(path.join(siteDir, "assets", "data", "community", "posts.json"), payload([]));
    await writeJson(path.join(siteDir, "assets", "data", "jobs", "jobs.json"), payload([incomplete]));
    await generatePublicDetails({ siteDir, now: fixedNow });
    assert.equal(await exists(path.join(siteDir, "germany", "ja", "community", "posts", "post-safe", "index.html")), false);
    assert.equal(await exists(path.join(siteDir, "germany", "ja", "jobs", "job-safe", "index.html")), false);

    const failureCases = [
      { label: "unsafe ID", communities: [{ ...community(), id: "../escape", post_id: "../escape" }], jobs: [] },
      { label: "private data", communities: [{ ...community(), contact_email: "private@example.com" }], jobs: [] },
      { label: "expired Community", communities: [{ ...community("post-expired"), expires_at: "2026-07-01T00:00:00.000Z" }], jobs: [] },
      { label: "duplicate", communities: [community(), community()], jobs: [] }
    ];
    for (const testCase of failureCases) {
      await writeJson(path.join(siteDir, "assets", "data", "community", "posts.json"), payload(testCase.communities));
      await writeJson(path.join(siteDir, "assets", "data", "jobs", "jobs.json"), payload(testCase.jobs));
      await assert.rejects(() => generatePublicDetails({ siteDir, now: fixedNow }), undefined, testCase.label);
    }
    await writeFile(path.join(siteDir, "assets", "data", "community", "posts.json"), "{ invalid json", "utf8");
    await writeJson(path.join(siteDir, "assets", "data", "jobs", "jobs.json"), payload([]));
    await assert.rejects(() => generatePublicDetails({ siteDir, now: fixedNow }), /invalid JSON/);
    await writeJson(path.join(siteDir, "assets", "data", "community", "posts.json"), { ...payload([community()]), count: 2 });
    await assert.rejects(() => generatePublicDetails({ siteDir, now: fixedNow }), /count does not match/);
    assert.throws(() => publicDetailUrl("jobs", ""));
    assert.equal(
      publicDetailOutputPath("community", publicDetailUrl("community", "投稿-1"), "投稿-1"),
      "germany/ja/community/posts/投稿-1/index.html"
    );
    assert.equal(buildJobPosting(incomplete, `https://j-connect-global.com${incomplete.detail_url}`, fixedNow), null);
  } finally {
    await rm(siteDir, { recursive: true, force: true });
  }
}

async function assertRepositoryPolicies() {
  const workflow = await readFile(path.join(rootDir, ".github", "workflows", "pages-build-deploy.yml"), "utf8");
  const verifyIndex = workflow.indexOf("Verify deployment commit is current main");
  const buildIndex = workflow.indexOf("node scripts/build-pages-artifact.mjs --site-dir _site");
  assert.ok(verifyIndex >= 0 && buildIndex > verifyIndex, "Pages generation must follow the exact-main-SHA check");
  assert.match(workflow, /Recheck deployment commit is current main/);
  assert.match(workflow, /report-content-freshness\.mjs --github-summary/);

  const buildSource = await readFile(path.join(rootDir, "scripts", "build-pages-artifact.mjs"), "utf8");
  assert.ok(buildSource.indexOf("await generatePublicDetails") > buildSource.indexOf("await removeHiddenEntries"), "detail generation must follow the _site copy");

  const home = await readFile(path.join(rootDir, "germany", "ja", "index.html"), "utf8");
  const events = await readFile(path.join(rootDir, "germany", "ja", "events", "index.html"), "utf8");
  const communityShared = await readFile(path.join(rootDir, "assets", "js", "community-shared.js"), "utf8");
  assert.ok(!/最新情報をチェック|掲示板の新着投稿を見る|新着コンテンツ/.test(home));
  assert.ok(!events.includes("最新情報・お知らせ"));
  assert.ok(!communityShared.includes('return "新着"'));

  const freshness = await analyzeContentFreshness({ root: rootDir, now: new Date() });
  assert.deepEqual(freshness.results.map((result) => result.name), ["Living", "Events/News", "Learn German"]);
  assert.ok(freshness.results.every((result) => result.newestPublished !== "—"));
  assert.match(freshnessMarkdown(freshness), /Overdue reviews/);
}

await runFixtureTests();
await assertRepositoryPolicies();
const siteArg = process.argv.indexOf("--site-dir");
if (siteArg >= 0 && process.argv[siteArg + 1]) await assertProductionArtifact(path.resolve(process.argv[siteArg + 1]));
console.log("Public detail generation tests passed.");
