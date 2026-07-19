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

    const routeImage = page.locator(`img[src$="/${slug}-route-overview.svg"]`);
    await routeImage.scrollIntoViewIfNeeded();
    await expect(routeImage).toBeVisible();
    const usesMobileSource = (page.viewportSize()?.width || 360) <= 600;
    const expectedSource = usesMobileSource
      ? `${slug}-route-overview-mobile.svg`
      : `${slug}-route-overview.svg`;
    await expect.poll(() => routeImage.evaluate((image) => image.currentSrc)).toContain(
      expectedSource
    );
    await expect.poll(() => routeImage.evaluate((image) => image.naturalWidth)).toBe(
      usesMobileSource ? 480 : 820
    );
    await expect.poll(() => routeImage.evaluate((image) => image.naturalHeight)).toBe(
      usesMobileSource ? 720 : 520
    );

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
