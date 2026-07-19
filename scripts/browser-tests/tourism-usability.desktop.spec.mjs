import { expect, test } from "@playwright/test";
import {
  activateDarkMode,
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

    const routeImage = page.locator(`img[src$="/${slug}-route-overview.svg"]`);
    await routeImage.scrollIntoViewIfNeeded();
    await expect(routeImage).toBeVisible();
    await expect.poll(() => routeImage.evaluate((image) => image.naturalWidth)).toBe(820);
    await expect(routeImage).toHaveAttribute("width", "820");
    await expect(routeImage).toHaveAttribute("height", "520");

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
