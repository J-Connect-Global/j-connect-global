import { expect, test } from "@playwright/test";
import {
  activateDarkMode,
  assertCommunityCards,
  assertArticleHeroFrame,
  assertNoIndex,
  assertNoRuntimeDiagnostics,
  assertPublicJobs,
  assertRouteReady,
  fixtureCommunityDetailPath,
  fixtureCommunityPost,
  installRuntimeDiagnostics,
  openDataRoute,
  openRoute
} from "./support.mjs";

test.beforeEach(async ({ page }) => {
  installRuntimeDiagnostics(page);
});

test.afterEach(async ({ page }) => {
  await assertNoRuntimeDiagnostics(page);
});

test("mobile Home has no overflow and can activate dark mode", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/", [
    "/assets/data/community/posts.json",
    "/assets/data/jobs/jobs.json"
  ]);
  await expect(page.locator("main h1")).toBeVisible();
  await activateDarkMode(page);
  await assertRouteReady(page);
});

test("mobile Community renders the active fixtures", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/community/", "/assets/data/community/posts.json");
  await assertCommunityCards(page);
  const savedOnlyButton = page.locator("#mobileSavedButton");
  await expect(savedOnlyButton).toHaveAttribute("aria-pressed", "false");
  await expect(savedOnlyButton).toHaveAttribute("aria-label", "保存済みの投稿だけを表示");
  await savedOnlyButton.focus();
  await page.keyboard.press("Enter");
  await expect(savedOnlyButton).toHaveAttribute("aria-pressed", "true");
  await expect(savedOnlyButton).toHaveAttribute("aria-label", "保存済み投稿の絞り込みを解除");
  await page.keyboard.press("Enter");
  await expect(savedOnlyButton).toHaveAttribute("aria-pressed", "false");
  await assertCommunityCards(page);
  await assertRouteReady(page);
});

test("mobile Jobs renders all active records without overflow", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/jobs/", "/assets/data/jobs/jobs.json");
  await assertPublicJobs(page);
  await assertRouteReady(page);
});

test("mobile article hero frame remains a readable 16:9 crop", async ({ page }) => {
  await openRoute(page, "/germany/ja/learn-german/hospital-phrases/");
  const viewportWidth = page.viewportSize()?.width || 360;
  await assertArticleHeroFrame(page, viewportWidth >= 768
    ? { minRatio: 1.95, maxRatio: 2.05 }
    : { minRatio: 1.72, maxRatio: 1.84 });
  await assertRouteReady(page);
});

test("mobile Community detail renders the requested fixture", async ({ page }) => {
  expect(fixtureCommunityPost, "an active Community detail fixture is required").toBeTruthy();
  await openRoute(page, fixtureCommunityDetailPath);
  await expect(page.locator(".public-detail-page h1")).toHaveText(fixtureCommunityPost.title);
  const galleryTrigger = page.locator("[data-lightbox-open]").first();
  if (await galleryTrigger.isVisible()) {
    await galleryTrigger.focus();
    await galleryTrigger.tap();
    const lightbox = page.locator("[data-public-lightbox]");
    await expect(lightbox).toBeVisible();
    await expect(page.locator("body")).toHaveClass(/public-lightbox-open/);
    await page.keyboard.press("Escape");
    await expect(lightbox).toBeHidden();
    await expect(galleryTrigger).toBeFocused();
  }
  await assertNoIndex(page);
  await activateDarkMode(page);
  await assertRouteReady(page);
});

test("mobile missing legacy Job detail is readable and excluded from indexing", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/jobs/detail/?id=2", "/assets/data/jobs/jobs.json");
  await expect(page.locator("#jobDetail")).toContainText("求人が見つかりませんでした");
  await assertNoIndex(page);
  await activateDarkMode(page);
  await assertRouteReady(page);
});

test("mobile legal disclosure remains readable in light and dark modes", async ({ page }) => {
  await openRoute(page, "/germany/ja/impressum/");
  await expect(page.locator("main")).toContainText("Yoshihiro Nagamatsu");
  await expect(page.locator("main")).toContainText("Am Rosenberg 9");
  await assertRouteReady(page);
  await activateDarkMode(page);
  await assertRouteReady(page);

  await openRoute(page, "/germany/ja/privacy/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("main h1")).toHaveText("プライバシーポリシー");
  await assertRouteReady(page);
});
