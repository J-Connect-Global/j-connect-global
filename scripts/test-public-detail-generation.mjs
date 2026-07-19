import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildJobPosting, generatePublicDetails, isIndexableJob, jobSitemapLastmod } from "./generate-public-details.mjs";
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
  await writeFile(path.join(siteDir, "sitemap.xml"), "<?xml version=\"1.0\"?><urlset><url><loc>https://j-connect-global.com/</loc><lastmod>2026-07-01</lastmod></url></urlset>\n", "utf8");
  return siteDir;
}

function extractJsonLd(html) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return match ? JSON.parse(match[1]) : null;
}

function sitemapEntries(xml) {
  return [...xml.matchAll(/<url>\s*([\s\S]*?)<\/url>/g)].map((match) => {
    const block = match[1];
    return {
      loc: block.match(/<loc>([\s\S]*?)<\/loc>/)?.[1]?.trim() || "",
      lastmod: block.match(/<lastmod>([\s\S]*?)<\/lastmod>/)?.[1]?.trim() || ""
    };
  });
}

function sitemapEntry(entries, loc) {
  return entries.find((entry) => entry.loc === loc);
}

async function assertProductionArtifact(siteDir) {
  const communityPayload = JSON.parse(await readFile(path.join(siteDir, "assets", "data", "community", "posts.json"), "utf8"));
  const jobsPayload = JSON.parse(await readFile(path.join(siteDir, "assets", "data", "jobs", "jobs.json"), "utf8"));
  const sitemap = await readFile(path.join(siteDir, "sitemap.xml"), "utf8");
  const entries = sitemapEntries(sitemap);
  const sourceEntries = sitemapEntries(await readFile(path.join(rootDir, "sitemap.xml"), "utf8"));
  for (const entry of sourceEntries) {
    const route = new URL(entry.loc).pathname;
    if (/^\/germany\/ja\/jobs\/[^/]+\/$/.test(route) && route !== "/germany/ja/jobs/posting/") continue;
    assert.deepEqual(sitemapEntry(entries, entry.loc), entry, `artifact must preserve static sitemap entry ${entry.loc}`);
  }
  const notFound = await readFile(path.join(siteDir, "404.html"), "utf8");
  const notFoundMain = notFound.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0] || "";
  assert.match(notFound, /<html\b[^>]*\blang="ja"/i);
  assert.match(notFound, /<meta name="viewport"/i);
  assert.match(notFound, /<meta name="robots" content="noindex, follow">/i);
  assert.match(notFound, /<title>ページが見つかりません\s*\|\s*J-Connect Germany<\/title>/);
  assert.equal((notFound.match(/<h1(?:\s|>)/gi) || []).length, 1, "root 404 page must have one recovery heading");
  for (const href of [
    "/germany/ja/",
    "/germany/ja/search/",
    "/germany/ja/community/",
    "/germany/ja/living/",
    "/germany/ja/jobs/",
    "/germany/ja/events/",
    "/germany/ja/learn-german/",
    "/germany/ja/contact/"
  ]) {
    assert.match(notFoundMain, new RegExp(`href="${href}"`));
  }
  assert.match(notFound, /<footer class="page-footer">/);
  assert.match(notFound, /class="footer-logo"[^>]*\bwidth="900"[^>]*\bheight="217"/);
  assert.match(notFound, /data-jconnect-theme-init/);
  assert.match(notFound, /data-theme-toggle/);
  assert.equal(/<link\b[^>]*\brel=["']canonical["']/i.test(notFound), false, "root 404 must not canonicalize to a live page");
  assert.equal(/http-equiv=["']refresh|window\.location\.(?:replace|assign)|location\.href\s*=/i.test(notFound), false, "root 404 must not redirect away");
  assert.equal(Boolean(sitemapEntry(entries, "https://j-connect-global.com/404.html")), false, "root 404 must stay out of the sitemap");
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
    const entry = sitemapEntry(entries, `https://j-connect-global.com${route}`);
    assert.equal(/<meta name="robots" content="index, follow">/.test(html), shouldIndex);
    assert.equal(Boolean(extractJsonLd(html)), Boolean(buildJobPosting(item, `https://j-connect-global.com${route}`)));
    assert.equal(Boolean(entry), shouldIndex);
    if (shouldIndex) assert.equal(entry.lastmod, jobSitemapLastmod(item));
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
    const incomplete = job("job-incomplete", {
      apply_url: "", application_url: "", apply_method: "", salary_unit: "", salary_currency: ""
    });
    const future = job("job-future", { published_at: "2026-07-18T10:00:00.000Z" });
    const expired = job("job-expired", { expires_at: "2026-07-01T00:00:00.000Z" });
    await writeJson(path.join(siteDir, "assets", "data", "community", "posts.json"), payload([safeCommunity]));
    await writeJson(path.join(siteDir, "assets", "data", "jobs", "jobs.json"), payload([indexable, incomplete, future]));
    const result = await generatePublicDetails({ siteDir, now: fixedNow });
    assert.deepEqual({ community: result.community, jobs: result.jobs, indexableJobs: result.indexableJobs }, { community: 1, jobs: 3, indexableJobs: 2 });

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
    assert.match(incompleteHtml, /給与額 50,000–65,000 EUR（支給期間は各求人で確認）/);
    assert.ok(!incompleteHtml.includes("公開できる応募方法はありません"));
    assert.ok(!incompleteHtml.includes("検索エンジンへの掲載対象外"));

    const futureHtml = await readFile(path.join(siteDir, "germany", "ja", "jobs", "job-future", "index.html"), "utf8");
    assert.match(futureHtml, /<meta name="robots" content="noindex, follow">/);

    const sitemap = await readFile(path.join(siteDir, "sitemap.xml"), "utf8");
    const entries = sitemapEntries(sitemap);
    assert.deepEqual(sitemapEntry(entries, "https://j-connect-global.com/"), { loc: "https://j-connect-global.com/", lastmod: "2026-07-01" });
    assert.deepEqual(
      entries.filter((entry) => entry.loc.startsWith("https://j-connect-global.com/germany/ja/jobs/")).map((entry) => entry.loc),
      ["https://j-connect-global.com/germany/ja/jobs/job-incomplete/", "https://j-connect-global.com/germany/ja/jobs/job-safe/"]
    );
    assert.equal(sitemapEntry(entries, "https://j-connect-global.com/germany/ja/jobs/job-safe/")?.lastmod, "2026-07-11");
    assert.equal(sitemapEntry(entries, "https://j-connect-global.com/germany/ja/jobs/job-incomplete/")?.lastmod, "2026-07-11");
    assert.equal(sitemapEntry(entries, "https://j-connect-global.com/germany/ja/jobs/job-future/"), undefined);
    assert.ok(!sitemap.includes("community/posts"));
    assert.equal(jobSitemapLastmod({ last_modified_at: "2026-07-15", updated_at: "2026-07-14", published_at: "2026-07-13", posted_at: "2026-07-12", created_at: "2026-07-11" }), "2026-07-15");
    assert.equal(jobSitemapLastmod({ updated_at: "2026-07-14", published_at: "2026-07-13", posted_at: "2026-07-12", created_at: "2026-07-11" }), "2026-07-14");
    assert.equal(jobSitemapLastmod({ published_at: "2026-07-13", posted_at: "2026-07-12", created_at: "2026-07-11" }), "2026-07-13");
    assert.equal(jobSitemapLastmod({ posted_at: "2026-07-12", created_at: "2026-07-11" }), "2026-07-12");
    assert.equal(jobSitemapLastmod({ created_at: "2026-07-11" }), "2026-07-11");

    await writeJson(path.join(siteDir, "assets", "data", "jobs", "jobs.json"), payload([future, incomplete, indexable]));
    await generatePublicDetails({ siteDir, now: fixedNow });
    assert.equal(await readFile(path.join(siteDir, "sitemap.xml"), "utf8"), sitemap, "sitemap ordering must be stable when Jobs JSON order changes");

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
