import { expect, test } from "@playwright/test";
import {
  activateDarkMode,
  activeCommunityPosts,
  assertCommunityCards,
  assertDirectoryModalKeyboard,
  assertNoIndex,
  assertNoRuntimeDiagnostics,
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
  await assertNoIndex(page);
  await activateDarkMode(page);
  await assertWcagTextContrast(page, ".public-detail-content", "Community detail dark-mode text");
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

  await openDataRoute(page, "/germany/ja/community/post/?id=missing-public-id", "/assets/data/community/posts.json");
  await expect(page).toHaveURL(/\/germany\/ja\/community\/post\/\?id=missing-public-id$/);
  await expect(page.locator("h1:visible")).toHaveText("投稿が見つかりません");
  await assertNoIndex(page);
  await assertRouteReady(page);
});

test("Jobs uses a compact, actionable empty state when no public listing exists", async ({ page }) => {
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
  const expectedRatedEat = eatFixture.items.filter((item) => Number(item.rating) >= 4).length;
  await page.locator('#starChipGroup [data-value="4.0"]').click();
  await expect(page.locator("#cards [data-item-id]")).toHaveCount(expectedRatedEat);
  await page.locator('#starChipGroup [data-value=""]').click();
  const eatBranchGroups = new Map();
  for (const item of eatFixture.items) {
    if (!eatBranchGroups.has(item.name)) eatBranchGroups.set(item.name, []);
    eatBranchGroups.get(item.name).push(item);
  }
  const eatBranch = [...eatBranchGroups.values()].find((items) => new Set(items.map((item) => item.address)).size > 1)?.[0];
  expect(eatBranch, "an Eat same-name branch fixture is required").toBeTruthy();
  const eatBranchCard = page.locator(`[data-item-id="${eatBranch.slug || eatBranch.id}"]`);
  await expect(eatBranchCard).toContainText(eatBranch.street || eatBranch.address);
  await assertDirectoryModalKeyboard(page);
  await assertRouteReady(page);
});

test("Shopping renders the committed fixture dataset", async ({ page }) => {
  expect(shoppingFixture.items.length).toBeGreaterThan(0);
  await openDataRoute(page, "/germany/ja/shopping/", "/assets/data/shopping/items.json");
  await expect(page.locator("#cards [data-item-id]")).toHaveCount(shoppingFixture.items.length);
  await expect(page.locator("#resultsSummary")).toContainText(`全${shoppingFixture.items.length}件`);
  await expect(page.locator("#cards")).not.toContainText("★0.0");
  const expectedRatedShopping = shoppingFixture.items.filter((item) => Number(item.rating) >= 4).length;
  await page.locator('#starChipGroup [data-value="4.0"]').click();
  await expect(page.locator("#cards [data-item-id]")).toHaveCount(expectedRatedShopping);
  await page.locator('#starChipGroup [data-value=""]').click();
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
  await expect(page.locator(".view-toggle-wrap")).toBeHidden();
  await expect(page.locator(".filters")).toBeHidden();
  await expect(page.locator("#mapPanel")).toHaveAttribute("hidden", "");
  await expect(page.locator('#statusBox a[href="https://gesund.bund.de/en/emergency-numbers"]')).toHaveCount(1);
  await expect(page.locator('#statusBox a[href="https://www.116117.de/de/englisch.php"]')).toHaveCount(1);
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
