import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, openRoute } from "./support.mjs";

test("bread guide keeps every photo and its attribution together on small screens", async ({ page }) => {
  await openRoute(page, "/germany/ja/living/germany-bread-guide/");
  await expect(page.getByRole("heading", { name: "ドイツのパン図鑑｜定番12タイプの味・見分け方・楽しみ方", exact: true })).toBeVisible();
  const cards = page.locator(".bread-profile-card");
  await expect(cards).toHaveCount(12);
  const figures = page.locator(".article-content-shell figure");
  await expect(figures).toHaveCount(15);
  for (const figure of await figures.all()) {
    const photo = figure.locator("img");
    await photo.scrollIntoViewIfNeeded();
    await expect.poll(() => photo.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    const credit = figure.locator("figcaption .article-photo-credit");
    await expect(credit).toBeVisible();
    await expect(credit.getByRole("link", { name: "Wikimedia Commons", exact: true })).toHaveAttribute("href", /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    await expect(credit.getByRole("link").last()).toHaveAttribute("href", /^https:\/\/creativecommons\.org\//);
    const media = figure.locator(".article-hero-frame, picture, img").first();
    const imageBox = await media.boundingBox();
    const creditBox = await credit.boundingBox();
    expect(creditBox.y).toBeGreaterThanOrEqual(imageBox.y + imageBox.height - 1);
  }
  await assertNoHorizontalOverflow(page);
});
