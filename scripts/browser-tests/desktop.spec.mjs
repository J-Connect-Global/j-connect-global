import { expect, test } from "@playwright/test";
import {
  activateDarkMode,
  activeCommunityPosts,
  communityFixture,
  assertCommunityCards,
  assertDirectoryModalKeyboard,
  assertArticleHeroFrame,
  assertNoHorizontalOverflow,
  assertNoIndex,
  assertNoRuntimeDiagnostics,
  assertPublicJobs,
  assertRouteReady,
  assertSharedLayout,
  assertNoPublicJobs,
  assertWcagTextContrast,
  eatFixture,
  fixtureCommunityDetailPath,
  fixtureCommunityPost,
  fixtureCommunityPostId,
  fixtureNoImageCommunityPost,
  fixturePhotoCommunityPost,
  installRuntimeDiagnostics,
  jobsFixture,
  medicalFixture,
  openDataRoute,
  openRoute,
  shoppingFixture
} from "./support.mjs";

test.beforeEach(async ({ page }) => {
  installRuntimeDiagnostics(page);
});

test.afterEach(async ({ page }) => {
  await assertNoRuntimeDiagnostics(page);
});

test("home renders no more than four active Jobs and can activate dark mode", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/", [
    "/assets/data/community/posts.json",
    "/assets/data/jobs/jobs.json"
  ]);
  await expect(page.locator("main h1")).toBeVisible();
  expect(jobsFixture.items.length).toBeGreaterThan(0);
  await expect(page.locator("#homeJobsCards [data-job-id]")).toHaveCount(Math.min(jobsFixture.items.length, 4));
  await expect(page.locator("#homeJobsCards .portal3-fallback-actions")).toHaveCount(0);
  await activateDarkMode(page);
  await assertWcagTextContrast(page, "body", "dark-mode body text");
  await assertWcagTextContrast(page, ".portal3-red", "dark-mode primary action");
  await assertSharedLayout(page);
  await assertRouteReady(page);
});

test("Home uses modern responsive hero and bounded Community thumbnail delivery", async ({ page }) => {
  const heroRequests = [];
  const driveRequests = [];
  page.on("request", (request) => {
    if (request.resourceType() !== "image") return;
    if (/\/assets\/images\/hero\/home-portal-hero/.test(request.url())) heroRequests.push(request.url());
    if (request.url().startsWith("https://drive.google.com/thumbnail")) driveRequests.push(request.url());
  });
  await page.route("https://drive.google.com/**", (route) => route.fulfill({
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#829ab1"/></svg>',
    contentType: "image/svg+xml",
    status: 200
  }));

  expect(fixturePhotoCommunityPost, "a Community fixture with a real image is required").toBeTruthy();
  expect(fixtureNoImageCommunityPost, "an image-less Community fixture is required").toBeTruthy();
  const homeFixture = {
    ...communityFixture,
    count: 2,
    items: [fixturePhotoCommunityPost, fixtureNoImageCommunityPost]
  };
  await page.route("**/assets/data/community/posts.json", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(homeFixture)
  }));
  await openDataRoute(page, "/germany/ja/", [
    "/assets/data/community/posts.json",
    "/assets/data/jobs/jobs.json"
  ]);

  await expect(page.locator(".portal3-hero")).toBeVisible();
  await expect.poll(() => heroRequests.length, { message: "Home hero must request an image" }).toBeGreaterThan(0);
  expect(heroRequests).toHaveLength(1);
  expect(heroRequests[0]).toMatch(/home-portal-hero-1440w\.(?:avif|webp)$/);
  expect(heroRequests[0]).not.toContain("-dark-");

  const photoId = String(fixturePhotoCommunityPost.post_id || fixturePhotoCommunityPost.id);
  const noImageId = String(fixtureNoImageCommunityPost.post_id || fixtureNoImageCommunityPost.id);
  const photoImages = page.locator(`[data-post-id="${photoId}"] img`);
  await expect(photoImages).toHaveCount(2);
  const [miniImage, cardImage] = await photoImages.all();
  await expect(miniImage).toHaveAttribute("src", /https:\/\/drive\.google\.com\/thumbnail/);
  await expect(miniImage).toHaveAttribute("src", /[?&]sz=w128(?:&|$)/);
  await expect(cardImage).toHaveAttribute("src", /https:\/\/drive\.google\.com\/thumbnail/);
  await expect(cardImage).toHaveAttribute("src", /[?&]sz=w480(?:&|$)/);
  for (const image of [miniImage, cardImage]) {
    await expect(image).toHaveAttribute("src", /https:\/\/drive\.google\.com\/thumbnail/);
    await expect(image).not.toHaveAttribute("src", /[?&]sz=w1200(?:&|$)/);
    await expect(image).toHaveAttribute("loading", "lazy");
    await expect(image).toHaveAttribute("decoding", "async");
    await expect(image).toHaveAttribute("width", /\d+/);
    await expect(image).toHaveAttribute("height", /\d+/);
  }
  const noImageImages = page.locator(`[data-post-id="${noImageId}"] img`);
  await expect(noImageImages).toHaveCount(2);
  for (const image of await noImageImages.all()) {
    await expect(image).toHaveAttribute("src", /\/assets\/img\/placeholders\/jconnect-default-card\.webp$/);
  }
  expect(new Set(driveRequests).size).toBe(2);
  expect(driveRequests).toEqual(expect.arrayContaining([
    expect.stringMatching(/[?&]sz=w128(?:&|$)/),
    expect.stringMatching(/[?&]sz=w480(?:&|$)/)
  ]));
  await assertRouteReady(page);
});

test("Home keeps contrast, intrinsic images, and the footer readable in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.route("https://drive.google.com/**", (route) => route.fulfill({
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#829ab1"/></svg>',
    contentType: "image/svg+xml",
    status: 200
  }));
  await openDataRoute(page, "/germany/ja/", [
    "/assets/data/community/posts.json",
    "/assets/data/jobs/jobs.json"
  ]);

  await expect(page.locator('link[href*="fonts.googleapis.com"]')).toHaveCount(0);
  await expect(page.locator('link[href*="jconnect-ui.css"]')).toHaveCount(0);
  await expect(page.locator('link[href*="social-share.css"]')).toHaveCount(0);
  await expect(page.locator('script[src*="social-share.js"]')).toHaveCount(0);
  await expect(page.locator("#cookie-banner")).toBeVisible();
  for (const image of await page.locator(".brand-logo, .footer-logo").all()) {
    await expect(image).toHaveAttribute("width", /\d+/);
    await expect(image).toHaveAttribute("height", /\d+/);
  }
  await expect(page.locator('.portal3-section-buttons a[href="/germany/ja/jobs/"]')).toHaveAccessibleName(/求人を探す/);

  const contrastTargets = [
    [".portal3-community-date", "Community date"],
    [".portal3-latest-date", "latest-content date"],
    [".portal3-panel .portal3-mini small", "panel metadata"],
    [".portal3-card small", "content-card metadata"],
    [".portal3-job-card small", "Job card metadata"],
    [".portal3-job-card em", "Job card emphasis"],
    [".portal3-news-list small", "news metadata"],
    [".event-date", "event date"],
    [".event-date strong", "event date value"]
  ];
  for (const [selector, label] of contrastTargets) await assertWcagTextContrast(page, selector, `light-mode ${label}`);

  const footerLight = await page.locator(".footer-left").evaluate((element) => {
    const copy = element.querySelector(".footer-copy");
    const relationship = element.querySelector(".footer-relationship");
    const footer = element.closest(".page-footer");
    return {
      copyWidth: copy?.getBoundingClientRect().width || 0,
      relationshipHeight: relationship?.getBoundingClientRect().height || 0,
      footerWidth: footer?.clientWidth || 0,
      footerScrollWidth: footer?.scrollWidth || 0
    };
  });
  expect(footerLight.copyWidth).toBeGreaterThanOrEqual(180);
  expect(footerLight.relationshipHeight).toBeLessThanOrEqual(52);
  expect(footerLight.footerScrollWidth).toBeLessThanOrEqual(footerLight.footerWidth);

  await activateDarkMode(page);
  for (const [selector, label] of contrastTargets) await assertWcagTextContrast(page, selector, `dark-mode ${label}`);
  await assertRouteReady(page);
});

test("Community renders active fixtures and links to the generated detail page", async ({ page }) => {
  await page.route("https://drive.google.com/**", (route) => route.fulfill({
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#829ab1"/></svg>',
    contentType: "image/svg+xml",
    status: 200
  }));
  await openDataRoute(page, "/germany/ja/community/", "/assets/data/community/posts.json");
  await assertCommunityCards(page);
  await expect(page.locator("#resultText")).toContainText(`${activeCommunityPosts.length}件中 ${activeCommunityPosts.length}件を表示`);

  expect(fixturePhotoCommunityPost, "a Community fixture with a real image is required").toBeTruthy();
  expect(fixtureNoImageCommunityPost, "an image-less Community fixture is required").toBeTruthy();
  const photoPostId = String(fixturePhotoCommunityPost.post_id || fixturePhotoCommunityPost.id);
  const noImagePostId = String(fixtureNoImageCommunityPost.post_id || fixtureNoImageCommunityPost.id);
  const placeholderPath = "/assets/img/placeholders/jconnect-default-card.webp";
  const photoCard = page.locator(`#cards [data-post-id="${photoPostId}"]`);
  const noImageCard = page.locator(`#cards [data-post-id="${noImagePostId}"]`);
  const photoSrc = await photoCard.locator("img").getAttribute("src");
  await expect(photoCard).toHaveAttribute("data-photo-count", /^[1-9]\d*$/);
  expect(photoSrc).toContain("https://drive.google.com/thumbnail");
  expect(photoSrc).toMatch(/[?&]sz=w1200(?:&|$)/);
  expect(photoSrc).not.toContain(placeholderPath);
  await expect(noImageCard).toHaveAttribute("data-photo-count", "0");
  await expect(noImageCard.locator("img")).toHaveAttribute("src", placeholderPath);

  const opener = photoCard.locator(".card-link");
  await expect(opener).toHaveAttribute("href", new RegExp(`${fixturePhotoCommunityPost.detail_url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await opener.focus();
  await expect(opener).toBeFocused();
  await Promise.all([
    page.waitForURL(new RegExp(`${fixturePhotoCommunityPost.detail_url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)),
    page.keyboard.press("Enter")
  ]);
  await expect(page.locator(".public-detail-page h1")).toHaveText(fixturePhotoCommunityPost.title);
  await expect(page.locator(".public-detail-gallery img").first()).toHaveAttribute("src", photoSrc);
  await expect(page.locator(`a[href="/germany/ja/community/contact/?post_id=${encodeURIComponent(photoPostId)}"]`)).toBeVisible();
  await expect(page.locator(`a[href="/germany/ja/community/report/?post_id=${encodeURIComponent(photoPostId)}"]`)).toBeVisible();
  const galleryTrigger = page.locator("[data-lightbox-open]").first();
  const lightbox = page.locator("[data-public-lightbox]");
  await galleryTrigger.focus();
  await galleryTrigger.click();
  await expect(lightbox).toBeVisible();
  await expect(page.locator("body")).toHaveClass(/public-lightbox-open/);
  await expect(lightbox.locator("[data-lightbox-close]")).toBeFocused();
  await expect(lightbox.locator("[data-lightbox-image]")).toHaveAttribute("src", photoSrc);
  await expect(lightbox.locator("[data-lightbox-caption]")).toContainText("1 / ");
  await page.keyboard.press("Shift+Tab");
  expect(await lightbox.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  if (await page.locator("[data-lightbox-open]").count() > 1) {
    await lightbox.locator("[data-lightbox-next]").click();
    await expect(lightbox.locator("[data-lightbox-caption]")).toContainText("2 / ");
    await page.keyboard.press("ArrowLeft");
    await expect(lightbox.locator("[data-lightbox-caption]")).toContainText("1 / ");
  }
  await page.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();
  await expect(page.locator("body")).not.toHaveClass(/public-lightbox-open/);
  await expect(galleryTrigger).toBeFocused();
  await assertNoIndex(page);
  await activateDarkMode(page);
  await assertWcagTextContrast(page, ".public-detail-content", "Community detail dark-mode text");
  await assertRouteReady(page);
});

test("home Jobs fallback actions keep their intrinsic flex layout in light and dark themes", async ({ page }) => {
  await page.route("**/assets/data/jobs/jobs.json", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ ...jobsFixture, count: 0, items: [] })
  }));
  await openDataRoute(page, "/germany/ja/", [
    "/assets/data/community/posts.json",
    "/assets/data/jobs/jobs.json"
  ]);
  const actions = page.locator("#homeJobsCards .portal3-fallback-actions");
  await expect(actions).toBeVisible();
  const layout = await actions.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { width: rect.width, height: rect.height, parentWidth: parent.width, display: style.display, direction: style.flexDirection };
  });
  expect(layout.display).toBe("flex");
  expect(layout.direction).toBe("row");
  expect(layout.width).toBeLessThan(layout.parentWidth);
  expect(layout.height).toBeGreaterThan(0);
  await activateDarkMode(page);
  await expect(actions).toBeVisible();
  await assertRouteReady(page);
});

test("legacy Community detail safely redirects and the no-ID route remains the post form", async ({ page }) => {
  expect(fixtureCommunityPost, "an active Community detail fixture is required").toBeTruthy();
  const legacyPath = `/germany/ja/community/post/?id=${encodeURIComponent(fixtureCommunityPostId)}`;
  await openDataRoute(page, legacyPath, "/assets/data/community/posts.json");
  await expect(page).toHaveURL(new RegExp(`${fixtureCommunityDetailPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await expect(page.locator(".public-detail-page h1")).toHaveText(fixtureCommunityPost.title);
  const bodyExcerpt = String(fixtureCommunityPost.body || "").split(/\r?\n/).find(Boolean);
  if (bodyExcerpt) await expect(page.locator(".public-detail-page")).toContainText(bodyExcerpt);
  await assertNoIndex(page);
  await assertRouteReady(page);

  await openRoute(page, "/germany/ja/community/post/");
  await expect(page).toHaveTitle(/投稿フォーム/);
  await expect(page.locator("h1:visible")).toHaveCount(1);
  const previewButton = page.locator("#previewButton");
  const previewModal = page.locator("#postPreviewModal");
  await previewButton.focus();
  await page.keyboard.press("Enter");
  await expect(previewModal).toBeVisible();
  await expect(previewModal.locator(".modal-card")).toBeFocused();
  await expect(previewModal.locator(".preview-selected-image")).toHaveCount(0);
  await expect(previewModal.locator(".preview-default-image")).toHaveAttribute("src", "/assets/img/placeholders/jconnect-default-card.webp");
  await expect(previewModal.getByText("画像なし", { exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await previewModal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  expect(await previewModal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Shift+Tab");
  expect(await previewModal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(previewModal).toBeHidden();
  await expect(previewButton).toBeFocused();

  await page.evaluate(() => {
    window.__jconnectRevokedObjectUrls = [];
    const originalRevokeObjectURL = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = function (url) {
      window.__jconnectRevokedObjectUrls.push(url);
      originalRevokeObjectURL(url);
    };
  });
  const imageUpload = page.locator("#imageUpload");
  await imageUpload.setInputFiles({
    name: "preview.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")
  });
  const thumbnailUrl = await page.locator("#imagePreviewList img").getAttribute("src");
  expect(thumbnailUrl).toMatch(/^blob:/);
  await previewButton.click();
  await expect(previewModal).toBeVisible();
  await expect(previewModal.locator(".preview-selected-image img")).toHaveAttribute("src", /^blob:/);
  await expect(previewModal.locator(".preview-selected-image figcaption")).toHaveText("preview.png");
  const firstModalUrl = await previewModal.locator(".preview-selected-image img").getAttribute("src");
  await page.keyboard.press("Escape");
  await expect(previewModal).toBeHidden();
  expect(await page.evaluate((url) => window.__jconnectRevokedObjectUrls.includes(url), firstModalUrl)).toBe(true);

  await previewButton.click();
  const reopenedModalUrl = await previewModal.locator(".preview-selected-image img").getAttribute("src");
  expect(reopenedModalUrl).toMatch(/^blob:/);
  expect(reopenedModalUrl).not.toBe(firstModalUrl);
  await page.keyboard.press("Escape");

  const imageBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  await imageUpload.setInputFiles([
    { name: "preview-2.png", mimeType: "image/png", buffer: imageBuffer },
    { name: "preview-3.png", mimeType: "image/png", buffer: imageBuffer }
  ]);
  await expect(page.locator("#imagePreviewList img")).toHaveCount(3);
  await previewButton.click();
  await expect(previewModal.locator(".preview-selected-image img")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await page.locator("[data-remove-image]").first().click();
  await expect(page.locator("#imagePreviewList img")).toHaveCount(2);
  expect(await page.evaluate((url) => window.__jconnectRevokedObjectUrls.includes(url), thumbnailUrl)).toBe(true);

  await page.evaluate(() => addImageFiles([new File(["invalid"], "not-an-image.txt", { type: "text/plain" })]));
  await expect(page.locator("#messageBox")).toContainText("JPG / PNG / WebP形式");
  await expect(page.locator("#imagePreviewList img")).toHaveCount(2);
  await assertNoIndex(page);
  await assertRouteReady(page);

  await openDataRoute(page, "/germany/ja/community/post/?id=missing-public-id", "/assets/data/community/posts.json");
  await expect(page).toHaveURL(/\/germany\/ja\/community\/post\/\?id=missing-public-id$/);
  await expect(page.locator("h1:visible")).toHaveText("投稿が見つかりません");
  await assertNoIndex(page);
  await assertRouteReady(page);
});

test("Jobs list renders every active record and has no four-record cap", async ({ page }) => {
  const exemplar = jobsFixture.items[0];
  expect(exemplar, "a public Jobs fixture is required").toBeTruthy();
  const extendedJobs = [
    ...jobsFixture.items,
    { ...exemplar, id: "regression-active-job", job_id: "regression-active-job", title: "Regression active job", status: "active" }
  ];
  const extendedFixture = { ...jobsFixture, count: extendedJobs.length, items: extendedJobs };
  await page.route("**/assets/data/jobs/jobs.json", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(extendedFixture)
  }));
  await openDataRoute(page, "/germany/ja/jobs/", "/assets/data/jobs/jobs.json");
  await assertPublicJobs(page, extendedJobs);
  await expect(page.locator("#cards")).not.toContainText(/分類できません|応募方法がありません|警告/);
  await expect(page.locator("#cards .jobs-card").first()).toContainText("支給期間は各求人で確認");
  await expect(page.locator("#cards .jobs-card").first()).toContainText("EUR");
  await expect(page.locator("#salaryFilterField")).toBeHidden();
  await expect(page.locator("#mainLayout")).not.toHaveClass(/jobs-empty-mode/);
  await assertRouteReady(page);
});

test("Jobs annual-salary filter is offered only for comparable annual data", async ({ page }) => {
  const annualJobs = jobsFixture.items.map((job, index) => ({
    ...job,
    id: `annual-salary-${index + 1}`,
    job_id: `annual-salary-${index + 1}`,
    salary_currency: "EUR",
    salary_unit: "YEAR",
    salary_min_eur: 40_000 + index * 5_000,
    salary_max_eur: 50_000 + index * 5_000
  }));
  await page.route("**/assets/data/jobs/jobs.json", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ ...jobsFixture, count: annualJobs.length, items: annualJobs })
  }));
  await openDataRoute(page, "/germany/ja/jobs/", "/assets/data/jobs/jobs.json");
  await expect(page.locator("#salaryFilterField")).toBeVisible();
  await expect(page.locator("#salaryRange")).toBeEnabled();
  await expect(page.locator("#salaryCurrentLabel")).toHaveText("すべて");
  await assertRouteReady(page);
});

test("generated Job detail stays readable and private in dark mode", async ({ page }) => {
  const exemplar = jobsFixture.items[0];
  expect(exemplar?.detail_url, "a stable public Jobs detail route is required").toBeTruthy();
  await openRoute(page, exemplar.detail_url);
  await expect(page.locator(".public-detail-content h1")).toHaveText(exemplar.position_title);
  await expect(page.locator(".public-detail-facts")).toContainText("支給期間は各求人で確認");
  await expect(page.locator('main article a[href^="mailto:"]')).toHaveCount(0);
  await activateDarkMode(page);
  await assertWcagTextContrast(page, ".public-detail-facts", "dark-mode Job facts");
  await assertRouteReady(page);
});

test("article hero frames preserve the desktop crop and article alignment", async ({ page }) => {
  for (const route of [
    "/germany/ja/living/hamburg-weekend-trip/",
    "/germany/ja/events/natsu-hikari-japan-festival-cologne/",
    "/germany/ja/learn-german/hospital-phrases/"
  ]) {
    await openRoute(page, route);
    await assertArticleHeroFrame(page, { minRatio: 1.95, maxRatio: 2.05 });
    await assertRouteReady(page);
  }
});

test("articles expose distinct editorial updates as visible semantic freshness", async ({ page }) => {
  await openRoute(page, "/germany/ja/living/hamburg-weekend-trip/");
  const freshness = page.locator(".article-freshness");
  await expect(freshness).toBeVisible();
  await expect(freshness.locator('time.article-date--published[datetime="2026-06-29"]')).toHaveText("公開: 2026-06-29");
  await expect(freshness.locator('time.article-date--updated-verified[datetime="2026-07-16"]')).toHaveText("最終更新・確認: 2026-07-16");
  await expect(freshness.locator("time")).toHaveCount(2);
  await activateDarkMode(page);
  await assertWcagTextContrast(page, ".article-freshness", "article freshness in dark mode");
  await assertRouteReady(page);
});

test("root 404 is a noindex, theme-aware recovery page", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist/", { waitUntil: "load" });
  expect(response, "missing route returned no main-document response").not.toBeNull();
  expect(response.status()).toBe(404);
  expect(response.headers()["content-type"]).toContain("text/html");
  await expect(page.locator("main h1")).toHaveText("ページが見つかりません");
  await assertNoIndex(page);
  await assertSharedLayout(page);

  const recoveryLinks = page.locator("main .not-found-links");
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
    await expect(recoveryLinks.locator(`a[href="${href}"]`)).toBeVisible();
  }
  const homeLink = recoveryLinks.locator('a[href="/germany/ja/"]').first();
  await homeLink.focus();
  await expect(homeLink).toBeFocused();

  await activateDarkMode(page);
  await assertWcagTextContrast(page, ".not-found-page .site-hero h1", "root 404 heading in dark mode");
  await assertWcagTextContrast(page, ".not-found-page .not-found-links .site-chip", "root 404 navigation in dark mode");
  await assertNoHorizontalOverflow(page);
});

test("Jobs empty fallback remains actionable when the public data is empty", async ({ page }) => {
  await page.route("**/assets/data/jobs/jobs.json", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ ...jobsFixture, count: 0, items: [] })
  }));
  await openDataRoute(page, "/germany/ja/jobs/", "/assets/data/jobs/jobs.json");
  await assertNoPublicJobs(page);
  await expect(page.locator("#mainLayout")).toHaveClass(/jobs-empty-mode/);
  await assertRouteReady(page);
});

test("legacy Job detail with an absent ID remains safe and noindex", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/jobs/detail/?id=2", "/assets/data/jobs/jobs.json");
  await expect(page).toHaveURL(/\/germany\/ja\/jobs\/detail\/\?id=2$/);
  await expect(page.locator("#jobDetail")).toContainText("求人が見つかりませんでした");
  await assertNoIndex(page);
  await activateDarkMode(page);
  await assertRouteReady(page);
});

test("Eat renders the committed fixture dataset", async ({ page }) => {
  expect(eatFixture.items.length).toBeGreaterThan(0);
  await openDataRoute(page, "/germany/ja/eat/", "/assets/data/eat/items.json");
  await expect(page.locator("#cards [data-item-id]")).toHaveCount(eatFixture.items.length);
  await expect(page.locator("#resultsSummary")).toContainText(`全${eatFixture.items.length}件`);
  await expect(page.locator("#cards")).not.toContainText("★0.0");
  await expect(page.locator("#regionField")).toBeHidden();
  await expect(page.locator("#categoryField")).toBeHidden();
  await expect(page.locator("#ratingField")).toBeHidden();
  await expect(page.locator("#mapViewBtn")).toBeHidden();
  await expect(page.locator("#detailCategoryField")).toBeVisible();
  await expect(page.locator("#reviewField")).toBeVisible();
  await expect(page.locator("#priceField")).toBeVisible();
  await expect(page.locator("#cards [data-detail]")).toHaveCount(0);
  const expectedReviewedEat = eatFixture.items.filter((item) => Number(item.reviews_count) >= 1000).length;
  await page.locator('#reviewChipGroup [data-value="1000"]').click();
  await expect(page.locator("#cards [data-item-id]")).toHaveCount(expectedReviewedEat);
  await page.locator('#reviewChipGroup [data-value=""]').click();
  const eatBranchGroups = new Map();
  for (const item of eatFixture.items) {
    if (!eatBranchGroups.has(item.name)) eatBranchGroups.set(item.name, []);
    eatBranchGroups.get(item.name).push(item);
  }
  const eatBranch = [...eatBranchGroups.values()].find((items) => new Set(items.map((item) => item.address)).size > 1)?.[0];
  expect(eatBranch, "an Eat same-name branch fixture is required").toBeTruthy();
  const eatBranchCard = page.locator(`[data-item-id="${eatBranch.slug || eatBranch.id}"]`);
  await expect(eatBranchCard).toContainText(eatBranch.street || eatBranch.address);
  await assertRouteReady(page);
});

test("Shopping renders the committed fixture dataset", async ({ page }) => {
  expect(shoppingFixture.items.length).toBeGreaterThan(0);
  await openDataRoute(page, "/germany/ja/shopping/", "/assets/data/shopping/items.json");
  await expect(page.locator("#cards [data-item-id]")).toHaveCount(shoppingFixture.items.length);
  await expect(page.locator("#resultsSummary")).toContainText(`全${shoppingFixture.items.length}件`);
  await expect(page.locator("#cards")).not.toContainText("★0.0");
  await expect(page.locator("h1")).toContainText("デュッセルドルフ");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /デュッセルドルフ/);
  await expect(page.locator("#resultsSummary")).toContainText("Düsseldorfの公開データ");
  await expect(page.locator("#regionField")).toBeHidden();
  await expect(page.locator("#ratingField")).toBeHidden();
  await expect(page.locator("#priceField")).toBeHidden();
  await expect(page.locator("#mapViewBtn")).toBeHidden();
  await expect(page.locator("#categoryField")).toBeVisible();
  await expect(page.locator("#detailCategoryField")).toBeVisible();
  await expect(page.locator("#reviewField")).toBeVisible();
  await expect(page.locator("#cards [data-detail]")).toHaveCount(0);
  await page.locator('#categoryChipGroup [data-value="美容"]').click();
  await expect(page.locator("#detailCategoryField")).toBeHidden();
  await expect(page.locator("#detailCategoryChipGroup")).not.toContainText("その他・未分類");
  await page.locator('#categoryChipGroup [data-value=""]').click();
  const expectedReviewedShopping = shoppingFixture.items.filter((item) => Number(item.reviews_count) >= 1000).length;
  await page.locator('#reviewChipGroup [data-value="1000"]').click();
  await expect(page.locator("#cards [data-item-id]")).toHaveCount(expectedReviewedShopping);
  await page.locator('#reviewChipGroup [data-value=""]').click();
  await assertRouteReady(page);
});

test("Directory capabilities appear automatically at the documented coverage boundary", async ({ page }) => {
  await page.addInitScript(() => {
    const map = {
      setView() { return this; },
      invalidateSize() {},
      fitBounds() {}
    };
    window.L = {
      map: () => map,
      tileLayer: () => ({ addTo() { return this; } }),
      layerGroup: () => ({ addTo() { return this; }, clearLayers() {} }),
      marker: () => ({ bindPopup() { return this; }, on() { return this; }, addTo() { return this; } })
    };
  });
  const items = Array.from({ length: 10 }, (_, index) => {
    const hasRepresentativeValue = index < 6;
    return {
      id: `capability-${index + 1}`,
      slug: `capability-${index + 1}`,
      status: "active",
      name: `Capability ${index + 1}`,
      title: `Capability ${index + 1}`,
      category: index < 5 ? "Restaurant" : "Cafe",
      category1: index < 5 ? "Restaurant" : "Cafe",
      detail_category: index % 2 ? "Sushi" : "Ramen",
      category2: index % 2 ? "Sushi" : "Ramen",
      region: index < 5 ? "Berlin" : "Hamburg",
      city: index < 5 ? "Berlin" : "Hamburg",
      address: `Test street ${index + 1}, Germany`,
      price: hasRepresentativeValue ? (index % 2 ? "€10–20" : "€20–30") : "",
      rating: hasRepresentativeValue ? 4.4 : null,
      reviews_count: 100 + index,
      latitude: hasRepresentativeValue ? 51.2 + index / 100 : null,
      longitude: hasRepresentativeValue ? 6.7 + index / 100 : null,
      phone: index === 0 ? "+49 211 123456" : "",
      opening_hours: "",
      language_support: "",
      short_description: "",
      description: "",
      detail_comment: "",
      official_url: "",
      website: "",
      map_url: ""
    };
  });
  const capabilityFixture = {
    ...eatFixture,
    count: items.length,
    items,
    validation: {
      ...eatFixture.validation,
      source_count: items.length,
      explicitly_active_count: items.length,
      eligible_count: items.length,
      generated_count: items.length,
      intentionally_empty: false
    }
  };
  await page.route("**/assets/data/eat/items.json", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(capabilityFixture)
  }));
  await openDataRoute(page, "/germany/ja/eat/", "/assets/data/eat/items.json");
  await expect(page.locator("#cards [data-item-id]")).toHaveCount(items.length);
  for (const selector of [
    "#regionField",
    "#categoryField",
    "#detailCategoryField",
    "#ratingField",
    "#reviewField",
    "#priceField",
    "#mapViewBtn"
  ]) await expect(page.locator(selector)).toBeVisible();
  await expect(page.locator("#mapCoverageNote")).toContainText("6 件 / 全 10 件");
  await expect(page.locator("#cards [data-detail]")).toHaveCount(1);
  await page.locator('#regionChipGroup [data-value="Berlin"]').click();
  await expect(page.locator("#cards [data-item-id]")).toHaveCount(5);
  await page.locator('#regionChipGroup [data-value=""]').click();
  await expect(page.locator("#cards [data-item-id]")).toHaveCount(items.length);
  await assertDirectoryModalKeyboard(page);
  await page.locator("#mapViewBtn").click();
  await expect(page.locator("#mapCoverageNote")).toBeVisible();
  await assertRouteReady(page);
});

test("Medical renders its intentional empty state and emergency guidance", async ({ page }) => {
  expect(medicalFixture.items).toHaveLength(0);
  expect(medicalFixture.validation?.intentionally_empty).toBe(true);
  await openDataRoute(page, "/germany/ja/medical/", "/assets/data/medical/items.json");
  await expect(page.locator("#main-content.medical-official-guide")).toBeVisible();
  await expect(page.locator("#main-content")).toContainText("生命に関わる緊急時");
  await expect(page.locator("#main-content")).toContainText("112");
  await expect(page.locator("#main-content")).toContainText("116117");
  await expect(page.locator('#main-content a[href="https://gesund.bund.de/wege-im-gesundheitswesen/erwachsenenleben/notfaelle/erste-hilfe"]')).toHaveCount(1);
  await expect(page.locator('#main-content a[href="https://www.116117.de/de/englisch.php"]')).toHaveCount(1);
  await expect(page.locator('#main-content a[href="https://arztsuche.116117.de/"]')).toHaveCount(1);
  await expect(page.locator('#main-content a[href="https://www.abda.de/apotheke-in-deutschland/was-apotheken-leisten/immer-erreichbar-sein/apotheken-finden/"]')).toHaveCount(1);
  await expect(page.locator('#main-content a[href="https://www.aponet.de/notdienstsuche/0"]')).toHaveCount(1);
  await expect(page.locator("#medicalDirectory")).toBeHidden();
  await expect(page.locator(".view-toggle-wrap")).toBeHidden();
  await expect(page.locator(".filters")).toBeHidden();
  await expect(page.locator("#mapPanel")).toHaveAttribute("hidden", "");
  await expect(page.locator("#statusBox")).toBeHidden();
  await activateDarkMode(page);
  await assertRouteReady(page);

  const modalFixture = {
    ...medicalFixture,
    count: 1,
    items: [{
      id: "medical-modal-fixture",
      name_ja: "モーダル確認用医療機関",
      category: "病院",
      detail_category: "総合病院",
      region: "Berlin",
      description: "キーボード操作確認用のローカルテストデータです。"
    }],
    validation: {
      ...medicalFixture.validation,
      eligible_count: 1,
      generated_count: 1,
      intentionally_empty: false
    }
  };
  await page.route("**/assets/data/medical/items.json", (route) => route.fulfill({
    body: JSON.stringify(modalFixture),
    contentType: "application/json",
    status: 200
  }));
  await openDataRoute(page, "/germany/ja/medical/", "/assets/data/medical/items.json");
  await expect(page.locator("#cards .jc-result-card")).toHaveCount(1);
  await expect(page.locator("#medicalDirectory")).toBeVisible();
  await expect(page.locator("#main-content.medical-official-guide")).toBeVisible();
  await expect(page.locator(".view-toggle-wrap")).toBeVisible();
  await expect(page.locator(".filters")).toBeVisible();
  await assertDirectoryModalKeyboard(page);
  await assertRouteReady(page);
});

test("legal trust pages expose the operator clearly in light and dark modes", async ({ page }) => {
  await openRoute(page, "/germany/ja/impressum/");
  await expect(page.locator("main h1")).toHaveText("運営者情報");
  await expect(page.locator("main")).toContainText("Yoshihiro Nagamatsu");
  await expect(page.locator("main")).toContainText("Am Rosenberg 9");
  await expect(page.locator("main")).toContainText("§ 18 Abs. 2 MStV");
  await assertRouteReady(page);

  await openRoute(page, "/germany/ja/privacy/");
  await expect(page.locator("main h1")).toHaveText("プライバシーポリシー");
  await expect(page.locator("main")).toContainText("G-BSKBFKQY19");
  await activateDarkMode(page);
  await assertWcagTextContrast(page, "main", "dark-mode privacy text");
  await assertRouteReady(page);

  await openRoute(page, "/germany/ja/contact/");
  await expect(page.locator(".form-privacy-notice a")).toHaveAttribute("href", "/germany/ja/privacy/");
  await assertRouteReady(page);
});

test("post and report completion utilities are distinct noindex pages with the shared layout", async ({ page }) => {
  await openRoute(page, "/germany/ja/community/complete/");
  await expect(page.locator("main h1")).toHaveText("投稿を受け付けました");
  const postCompletion = await page.locator("main").innerText();
  await assertNoIndex(page);
  await assertSharedLayout(page);
  await assertRouteReady(page);

  await openRoute(page, "/germany/ja/community/report/complete/");
  await expect(page.locator("main h1")).toHaveText("通報を受け付けました");
  const reportCompletion = await page.locator("main").innerText();
  expect(reportCompletion).not.toBe(postCompletion);
  await assertNoIndex(page);
  await assertSharedLayout(page);
  await assertRouteReady(page);
});
