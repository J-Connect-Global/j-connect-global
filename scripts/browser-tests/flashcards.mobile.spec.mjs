import { expect, test } from "@playwright/test";
import {
  activateDarkMode,
  assertNoHorizontalOverflow,
  assertNoRuntimeDiagnostics,
  assertRouteReady,
  installRuntimeDiagnostics,
  openDataRoute
} from "./support.mjs";

const decksPath = "/assets/data/learn-german/flashcards/decks.json";
const a1CardsPath = "/assets/data/learn-german/flashcards/cards-a1.json";

async function installSpeechMock(page) {
  await page.addInitScript(() => {
    class MockSpeechSynthesisUtterance {
      constructor(text) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: MockSpeechSynthesisUtterance });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { cancel() {}, getVoices: () => [{ lang: "de-DE" }], speak() {} }
    });
  });
}

test.beforeEach(async ({ page }) => {
  installRuntimeDiagnostics(page);
  await page.addInitScript(() => localStorage.setItem("jconnect_cookie_consent", "denied"));
});

test.afterEach(async ({ page }) => {
  await assertNoRuntimeDiagnostics(page);
});

test("mobile Learn German has a four-item page navigation without overflow", async ({ page }, testInfo) => {
  await openDataRoute(page, "/germany/ja/learn-german/", decksPath);
  await expect(page.locator(".learn-mobile-page-nav a")).toHaveCount(4);

  if (testInfo.project.name === "tablet-chromium") {
    await expect(page.locator(".learn-mobile-page-nav")).toBeHidden();
    await expect(page.locator(".learn-pillar-ribbon")).toBeVisible();
    await page.locator('.learn-pillar-ribbon a[href="#original-web-tools"]').click();
    await expect(page).toHaveURL(/#original-web-tools$/);
  } else {
    await expect(page.locator(".learn-mobile-page-nav")).toBeVisible();
    await page.locator('.learn-mobile-page-nav a[href="#original-web-tools"]').click();
    await expect(page.locator('.learn-mobile-page-nav a[href="#original-web-tools"]')).toHaveAttribute("aria-current", "location");
  }

  await expect(page.locator("#originalDeckGrid .learn-deck-card")).toHaveCount(17);
  await assertNoHorizontalOverflow(page);
  await assertRouteReady(page);
});

test("mobile flashcard keeps progress, card, and primary controls readable at 360px", async ({ page }) => {
  await installSpeechMock(page);
  await openDataRoute(page, "/germany/ja/learn-german/flashcards/?deck=a1-life-basics", [decksPath, a1CardsPath]);
  await expect(page.locator("#flashcardsInventory")).toBeVisible();
  await expect(page.locator("#flashcardsInventoryBody tr")).toHaveCount(50);
  expect(await page.locator(".flashcards-inventory-table-wrap").evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  await assertNoHorizontalOverflow(page);
  await page.locator("#flashcardsStart").tap();
  await expect(page.locator("#flashcardsStudy")).toBeVisible();
  await expect(page.locator("#flashcardsPosition")).toHaveText("1 / 10");
  await expect(page.locator("#flashcardFlip")).toBeVisible();
  await expect(page.locator(".flashcard__hint")).toHaveCount(0);
  const cardBox = await page.locator("#flashcardFlip").boundingBox();
  expect(cardBox.height).toBeLessThanOrEqual(240);
  await expect(page.locator('[data-rating="again"]')).toBeEnabled();
  await expect(page.locator('[data-rating="unsure"]')).toBeEnabled();
  await expect(page.locator('[data-rating="known"]')).toBeEnabled();
  await page.locator('[data-rating="unsure"]').tap();
  await expect(page.locator("#flashcardsPosition")).toHaveText("2 / 10");
  await page.locator("#flashcardFlip").tap();
  await expect(page.locator("#flashcardsSpeakExample")).toBeVisible();
  await expect(page.locator("#flashcardsSpeakExample")).toHaveCSS("width", "44px");
  await page.locator("#flashcardsSpeakExample").tap();
  await expect(page.locator("#flashcardsSpeakExample")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-rating="again"]')).toBeVisible();
  await expect(page.locator('[data-rating="unsure"]')).toBeVisible();
  await expect(page.locator('[data-rating="known"]')).toBeVisible();
  await page.locator('[data-rating="known"]').tap();
  await expect(page.locator("#flashcardsPosition")).toHaveText("3 / 10");
  await activateDarkMode(page);
  await assertNoHorizontalOverflow(page);
  await assertRouteReady(page);
});
