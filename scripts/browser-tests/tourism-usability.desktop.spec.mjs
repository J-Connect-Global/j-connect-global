import { expect, test } from "@playwright/test";
import {
  activateDarkMode,
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
    height: 780
  },
  "bremen-weekend-trip": {
    width: 1046,
    height: 683
  }
};

const routeMedia = (slug) => {
  const rasterRoute = rasterRoutes[slug];
  if (rasterRoute) {
    return {
      src: `/assets/images/living/routes/${slug}-illustrated-map.webp`,
      expectedSource: `${slug}-illustrated-map.webp`,
      naturalWidth: 820,
      ...rasterRoute
    };
  }
  return {
    src: `/assets/images/living/routes/${slug}-route-overview.svg`,
    expectedSource: `${slug}-route-overview.svg`,
    naturalWidth: 820,
    width: 820,
    height: 520
  };
};

test.beforeEach(async ({ page }) => {
  installRuntimeDiagnostics(page);
});

test.afterEach(async ({ page }) => {
  await assertNoRuntimeDiagnostics(page);
});

for (const slug of representativeRoutes) {
  test(`${slug} keeps its desktop route overview and utility lists readable`, async ({ page }) => {
    await openRoute(page, `/germany/ja/living/${slug}/`);
    await expect(page.locator(".article-sidebar")).toBeVisible();
    await expect(page.locator(".article-mobile-toc")).toBeHidden();

    const media = routeMedia(slug);
    const routeImage = page.locator(`img[src="${media.src}"]`);
    await routeImage.scrollIntoViewIfNeeded();
    await expect(routeImage).toBeVisible();
    await expect.poll(() => routeImage.evaluate((image) => image.currentSrc)).toContain(
      media.expectedSource
    );
    await expect.poll(() => routeImage.evaluate((image) => image.naturalWidth)).toBe(media.naturalWidth);
    await expect(routeImage).toHaveAttribute("width", String(media.width));
    await expect(routeImage).toHaveAttribute("height", String(media.height));

    for (const selector of [".official-source-section", ".article-main > .related-section"]) {
      const list = page.locator(`${selector} ul`).first();
      await list.scrollIntoViewIfNeeded();
      const indentation = await list.evaluate((element) => {
        const firstItem = element.querySelector("li");
        return {
          paddingInlineStart: Number.parseFloat(getComputedStyle(element).paddingInlineStart),
          firstItemOffset: firstItem
            ? firstItem.getBoundingClientRect().left - element.getBoundingClientRect().left
            : 0
        };
      });
      expect(indentation.paddingInlineStart).toBeGreaterThanOrEqual(20);
      expect(indentation.firstItemOffset).toBeGreaterThanOrEqual(0);
    }

    if (slug === representativeRoutes[0]) {
      await activateDarkMode(page);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    }
    await assertNoHorizontalOverflow(page);
  });
}
