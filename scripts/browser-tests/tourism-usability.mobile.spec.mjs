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

const rasterRoutes = {
  "aachen-day-trip": {
    width: 1230,
    height: 780,
    tabletHeight: 487,
    mobileHeight: 740
  },
  "bremen-weekend-trip": {
    width: 1046,
    height: 683,
    tabletHeight: 501,
    mobileHeight: 313
  }
};

const routeMedia = (slug, viewportWidth) => {
  const rasterRoute = rasterRoutes[slug];
  if (rasterRoute) {
    const usesMobileSource = viewportWidth <= 600;
    const usesTabletSource = viewportWidth <= 960;
    return {
      locatorSrc: `/assets/images/living/routes/${slug}-illustrated-map.webp`,
      expectedSource: usesMobileSource
        ? `${slug}-illustrated-map-480w.webp`
        : usesTabletSource
          ? `${slug}-illustrated-map-768w.webp`
          : `${slug}-illustrated-map.webp`,
      width: usesMobileSource ? 480 : usesTabletSource ? 768 : rasterRoute.width,
      height: usesMobileSource
        ? rasterRoute.mobileHeight
        : usesTabletSource
          ? rasterRoute.tabletHeight
          : rasterRoute.height
    };
  }
  const usesMobileSource = viewportWidth <= 600;
  return {
    locatorSrc: `/assets/images/living/routes/${slug}-route-overview.svg`,
    expectedSource: usesMobileSource ? `${slug}-route-overview-mobile.svg` : `${slug}-route-overview.svg`,
    width: usesMobileSource ? 480 : 820,
    height: usesMobileSource ? 740 : 520
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
