import { expect, test } from "@playwright/test";
import {
  activateDarkMode,
  activeCommunityPosts,
  assertCommunityCards,
  assertDirectoryModalKeyboard,
  assertNoIndex,
  assertNoRuntimeDiagnostics,
  assertOneManualShareButton,
  assertRouteReady,
  assertSharedLayout,
  assertThreeSampleJobs,
  assertWcagTextContrast,
  eatFixture,
  fixtureCommunityDetailPath,
  fixtureCommunityPost,
  fixtureCommunityPostId,
  fixtureNoImageCommunityPost,
  fixturePhotoCommunityPost,
  installRuntimeDiagnostics,
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

test("home renders in Chromium and can activate dark mode", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/", [
    "/assets/data/community/posts.json",
    "/assets/data/jobs/jobs.json"
  ]);
  await expect(page.locator("main h1")).toBeVisible();
  await activateDarkMode(page);
  await assertWcagTextContrast(page, "body", "dark-mode body text");
  await assertWcagTextContrast(page, ".portal3-red", "dark-mode primary action");
  await assertSharedLayout(page);
  await assertRouteReady(page);
});

test("Community normalizePost renders every active fixture without an undeclared shared reference", async ({ page }) => {
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
  expect(photoSrc).not.toContain(placeholderPath);
  await expect(noImageCard).toHaveAttribute("data-photo-count", "0");
  await expect(noImageCard.locator("img")).toHaveAttribute("src", placeholderPath);

  const opener = photoCard.locator(".card-link");
  await opener.focus();
  await expect(opener).toBeFocused();
  await page.keyboard.press("Enter");
  const modal = page.locator("#detailModal");
  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute("aria-hidden", "false");
  await expect(modal.locator("#detailMainPhoto")).toHaveAttribute("src", photoSrc);
  expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);

  await page.keyboard.press("Shift+Tab");
  const afterShiftTab = await page.evaluate(() => ({
    className: document.activeElement?.className || "",
    id: document.activeElement?.id || "",
    tagName: document.activeElement?.tagName || ""
  }));
  expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  const afterTab = await page.evaluate(() => ({
    className: document.activeElement?.className || "",
    id: document.activeElement?.id || "",
    tagName: document.activeElement?.tagName || ""
  }));
  expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  expect(afterTab).not.toEqual(afterShiftTab);

  const detailSaveButton = modal.locator("#detailSaveButton");
  await detailSaveButton.focus();
  await page.keyboard.press("Enter");
  expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(modal).toHaveAttribute("aria-hidden", "true");
  await expect(modal).not.toBeVisible();
  await expect(opener).toBeFocused();
  await assertRouteReady(page);
});

test("Community detail renders the requested fixture with one accessible share button and noindex", async ({ page }) => {
  expect(fixtureCommunityPost, "an active Community detail fixture is required").toBeTruthy();
  await openDataRoute(page, fixtureCommunityDetailPath, "/assets/data/community/posts.json");
  await expect(page.locator("#detailTitle")).toHaveText(fixtureCommunityPost.title);
  const bodyExcerpt = String(fixtureCommunityPost.body || "").split(/\r?\n/).find(Boolean);
  if (bodyExcerpt) await expect(page.locator("#detailMode")).toContainText(bodyExcerpt);
  await assertOneManualShareButton(page);
  const shareUrl = new URL(await page.locator('[data-share-trigger="true"]').getAttribute("data-share-url"));
  expect(shareUrl.searchParams.get("id")).toBe(String(fixtureCommunityPostId));
  await assertNoIndex(page);
  await assertRouteReady(page);

  await openRoute(page, "/germany/ja/community/post/");
  const previewButton = page.locator("#previewButton");
  const previewModal = page.locator("#postPreviewModal");
  await previewButton.focus();
  await page.keyboard.press("Enter");
  await expect(previewModal).toBeVisible();
  await expect(previewModal.locator(".modal-card")).toBeFocused();
  await page.keyboard.press("Tab");
  expect(await previewModal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  expect(await previewModal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Shift+Tab");
  expect(await previewModal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(previewModal).toBeHidden();
  await expect(previewButton).toBeFocused();
  await assertNoIndex(page);
  await assertRouteReady(page);
});

test("Jobs renders exactly three sample listings", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/jobs/", "/assets/data/jobs/jobs.json");
  await assertThreeSampleJobs(page);
  await expect(page.locator("#resultsSummary")).toContainText("3件を表示中 / 全3件");
  const firstCard = page.locator("#cards .jobs-card[data-id]").first();
  const returnLink = firstCard.locator("[data-detail-page-link]");
  await firstCard.evaluate((element) => element.click());
  const jobsModal = page.locator("#listingModal");
  await expect(jobsModal).toBeVisible();
  await expect(page.locator("#listingModalClose")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(await jobsModal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  expect(await jobsModal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  const modalSaveButton = jobsModal.locator("[data-detail-save-id]");
  await modalSaveButton.focus();
  await page.keyboard.press("Enter");
  await expect(modalSaveButton).toBeFocused();
  expect(await jobsModal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(jobsModal).toBeHidden();
  await expect(returnLink).toBeFocused();

  const savedOnlyButton = page.locator("#savedOnlyBtn");
  await savedOnlyButton.click();
  await expect(savedOnlyButton).toHaveAttribute("aria-pressed", "true");
  const savedOnlyCards = page.locator("#cards .jobs-card[data-id]");
  await expect(savedOnlyCards).toHaveCount(1);
  await savedOnlyCards.evaluate((element) => element.click());
  await expect(jobsModal).toBeVisible();
  await jobsModal.locator("[data-detail-save-id]").focus();
  await page.keyboard.press("Enter");
  await expect(jobsModal).toBeHidden();
  await expect(savedOnlyCards).toHaveCount(0);
  await expect(page.locator("#emptyBox")).toContainText("保存済みの求人はありません");
  await expect(savedOnlyButton).toBeFocused();
  await assertRouteReady(page);
});

test("sample Job detail has no application CTA or JobPosting JSON-LD", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/jobs/detail/?id=a", "/assets/data/jobs/jobs.json");
  await expect(page.locator("#jobDetail h1")).toBeVisible();
  await expect(page.locator("#jobDetail .directory-seed-label")).toHaveText("掲載見本・応募不可");
  await expect(page.locator('#jobDetail a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: /応募先にメールする|応募する|Apply/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /応募先にメールする|応募する|Apply/i })).toHaveCount(0);

  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredData.some((value) => /["']?JobPosting["']?/i.test(value))).toBe(false);

  await assertOneManualShareButton(page);
  await assertNoIndex(page);
  await assertRouteReady(page);
});

test("an excluded old Job id renders a useful noindex not-found state", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/jobs/detail/?id=d", "/assets/data/jobs/jobs.json");
  await expect(page.locator("#jobDetail h1")).toHaveText("求人が見つかりませんでした");
  await expect(page.locator("#jobDetail")).toContainText("指定された求人IDに一致する求人は見つかりませんでした");
  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredData.some((value) => /["']?JobPosting["']?/i.test(value))).toBe(false);
  await assertNoIndex(page);
  await assertRouteReady(page);
});

test("Eat renders the committed fixture dataset", async ({ page }) => {
  expect(eatFixture.items.length).toBeGreaterThan(0);
  await openDataRoute(page, "/germany/ja/eat/", "/assets/data/eat/items.json");
  await expect(page.locator("#cards [data-item-id]")).toHaveCount(eatFixture.items.length);
  await expect(page.locator("#resultsSummary")).toContainText(`全${eatFixture.items.length}件`);
  await assertDirectoryModalKeyboard(page);
  await assertRouteReady(page);
});

test("Shopping renders the committed fixture dataset", async ({ page }) => {
  expect(shoppingFixture.items.length).toBeGreaterThan(0);
  await openDataRoute(page, "/germany/ja/shopping/", "/assets/data/shopping/items.json");
  await expect(page.locator("#cards [data-item-id]")).toHaveCount(shoppingFixture.items.length);
  await expect(page.locator("#resultsSummary")).toContainText(`全${shoppingFixture.items.length}件`);
  await assertDirectoryModalKeyboard(page);
  await assertRouteReady(page);
});

test("Medical renders its intentional empty state and emergency guidance", async ({ page }) => {
  expect(medicalFixture.items).toHaveLength(0);
  expect(medicalFixture.validation?.intentionally_empty).toBe(true);
  await openDataRoute(page, "/germany/ja/medical/", "/assets/data/medical/items.json");
  await expect(page.locator("#cards .jc-result-card")).toHaveCount(0);
  await expect(page.locator("#statusBox")).toContainText("現在は医療機関を探すための基本ガイドを表示しています");
  await expect(page.locator("#statusBox")).toContainText("112");
  await expect(page.locator("#statusBox")).toContainText("116117");
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
  await assertDirectoryModalKeyboard(page);
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
