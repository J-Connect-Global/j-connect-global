import { expect, test } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  assertNoRuntimeDiagnostics,
  installRuntimeDiagnostics,
  openRoute
} from "./support.mjs";

const representativeRoutes = [
  "aachen-day-trip",
  "bremen-weekend-trip",
  "cologne-city-guide",
  "duesseldorf-family-trip",
  "paris-weekend-trip"
];

const routeMedia = (slug, viewportWidth) => {
  const usesMobileSource = viewportWidth <= 600;
  const usesTabletSource = viewportWidth <= 960;
  return {
    locatorSrc: `/assets/images/living/${slug}-guide-map-v2.webp`,
    expectedSource: usesMobileSource
      ? `${slug}-guide-map-v2-480w.webp`
      : usesTabletSource
        ? `${slug}-guide-map-v2-768w.webp`
        : `${slug}-guide-map-v2.webp`,
    width: usesMobileSource ? 480 : usesTabletSource ? 768 : 1440,
    height: usesMobileSource ? 320 : usesTabletSource ? 512 : 960
  };
};

test.beforeEach(async ({ page }) => {
  installRuntimeDiagnostics(page);
});

test.afterEach(async ({ page }) => {
  await assertNoRuntimeDiagnostics(page);
});

for (const slug of representativeRoutes) {
  test(`${slug} selects the responsive route overview without overflow`, async ({ page }) => {
    await openRoute(page, `/germany/ja/living/${slug}/`);
    await expect(page.locator(".article-sidebar")).toBeHidden();
    await expect(page.locator(".article-mobile-toc")).toBeVisible();

    const media = routeMedia(slug, page.viewportSize()?.width || 360);
    const routeImage = page.locator(`img[src="${media.locatorSrc}"]`);
    await routeImage.scrollIntoViewIfNeeded();
    await expect(routeImage).toBeVisible();
    await expect.poll(() => routeImage.evaluate((image) => image.currentSrc)).toContain(
      media.expectedSource
    );
    await expect.poll(() => routeImage.evaluate((image) => image.naturalWidth)).toBe(media.width);
    await expect.poll(() => routeImage.evaluate((image) => image.naturalHeight)).toBe(media.height);

    for (const selector of [".official-source-section", ".article-main > .related-section"]) {
      const list = page.locator(`${selector} ul`).first();
      await list.scrollIntoViewIfNeeded();
      const paddingInlineStart = await list.evaluate((element) => (
        Number.parseFloat(getComputedStyle(element).paddingInlineStart)
      ));
      expect(paddingInlineStart).toBeGreaterThanOrEqual(20);
    }

    await assertNoHorizontalOverflow(page);
  });
}
