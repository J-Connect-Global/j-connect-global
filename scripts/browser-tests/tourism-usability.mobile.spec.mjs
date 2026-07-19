import { expect, test } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  assertNoRuntimeDiagnostics,
  installRuntimeDiagnostics,
  openRoute
} from "./support.mjs";

const representativeRoutes = [
  "bremen-weekend-trip",
  "cologne-city-guide",
  "duesseldorf-family-trip",
  "paris-weekend-trip"
];

const routeMedia = (slug, viewportWidth) => {
  if (slug === 'bremen-weekend-trip') {
    return { locatorSrc: '/assets/img/living/bremen-city-guide-map-final.webp', expectedSource: 'bremen-city-guide-map-final.webp', width: 1536, height: 1024 };
  }
  const usesMobileSource = viewportWidth <= 600;
  return {
    locatorSrc: `/assets/images/living/routes/${slug}-route-overview.svg`,
    expectedSource: usesMobileSource ? `${slug}-route-overview-mobile.svg` : `${slug}-route-overview.svg`,
    width: usesMobileSource ? 480 : 820,
    height: usesMobileSource ? 720 : 520
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
