import fs from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  activateDarkMode,
  assertNoHorizontalOverflow,
  assertNoRuntimeDiagnostics,
  assertRouteReady,
  assertSharedLayout,
  installRuntimeDiagnostics,
  openDataRoute,
  openRoute
} from "./support.mjs";

const decksPath = "/assets/data/learn-german/flashcards/decks.json";
const a1CardsPath = "/assets/data/learn-german/flashcards/cards-a1.json";
const c2CardsPath = "/assets/data/learn-german/flashcards/cards-c2.json";
const flashcardsRoute = "/germany/ja/learn-german/flashcards/?deck=a1-life-basics";

async function installSpeechMock(page) {
  await page.addInitScript(() => {
    const calls = [];
    class MockSpeechSynthesisUtterance {
      constructor(text) {
        this.text = text;
      }
    }
    const speechSynthesis = {
      cancel() {
        calls.push({ type: "cancel" });
      },
      getVoices() {
        return [{ name: "Test German", lang: "de-DE" }];
      },
      speak(utterance) {
        calls.push({
          type: "speak",
          text: utterance.text,
          lang: utterance.lang,
          rate: utterance.rate,
          voice: utterance.voice?.lang || ""
        });
      }
    };
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: MockSpeechSynthesisUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: speechSynthesis });
    Object.defineProperty(window, "__flashcardsSpeechCalls", { configurable: true, value: calls });
  });
}

test.beforeEach(async ({ page }) => {
  installRuntimeDiagnostics(page);
  await page.addInitScript(() => localStorage.setItem("jconnect_cookie_consent", "denied"));
});

test.afterEach(async ({ page }) => {
  await assertNoRuntimeDiagnostics(page);
});

test("Learn German exposes four pillars and filters original decks without breaking existing controls", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/learn-german/", decksPath);

  await expect(page.locator(".jc-hero-actions a")).toHaveCount(4);
  await expect(page.locator(".learn-pillar-ribbon a")).toHaveCount(4);
  await expect(page.locator(".learn-mobile-page-nav a")).toHaveCount(4);
  await expect(page.locator(".learn-page-guide a")).toHaveCount(4);
  await expect(page.locator('.learn-pillar-ribbon a[href="#original-web-tools"]')).toBeVisible();
  await expect(page.locator("#originalDeckGrid .learn-deck-card")).toHaveCount(17);

  const a1Filter = page.locator('[data-deck-filter="level"][data-filter-value="A1"]');
  await a1Filter.click();
  await expect(a1Filter).toHaveAttribute("aria-pressed", "true");
  const a1Count = await page.locator("#originalDeckGrid .learn-deck-card").count();
  expect(a1Count).toBeGreaterThan(0);
  expect(await page.locator("#originalDeckGrid .learn-deck-card").evaluateAll(cards => cards.every(card => card.dataset.level.split(" ").includes("A1")))).toBe(true);

  await page.locator("#deckFilterReset").click();
  const shoppingFilter = page.locator('[data-deck-filter="scene"][data-filter-value="shopping"]');
  await shoppingFilter.click();
  expect(await page.locator("#originalDeckGrid .learn-deck-card").evaluateAll(cards => cards.every(card => card.dataset.scene.split(" ").includes("shopping")))).toBe(true);
  await page.locator("#deckFilterReset").click();

  const unstartedFilter = page.locator('[data-deck-filter="status"][data-filter-value="unstarted"]');
  await unstartedFilter.click();
  expect(await page.locator("#originalDeckGrid .learn-deck-card").evaluateAll(cards => cards.every(card => card.dataset.status === "unstarted"))).toBe(true);
  await page.locator("#deckFilterReset").click();

  await page.locator("#deckSearch").fill("存在しない教材語");
  await expect(page.locator("#deckEmpty")).toBeVisible();
  await page.locator("[data-deck-empty-reset]").click();
  await expect(page.locator("#deckEmpty")).toBeHidden();

  const listButton = page.locator('[data-deck-view="list"]');
  await listButton.click();
  await expect(listButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#originalDeckGrid")).toHaveClass(/is-list-view/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("jconnect-flashcards-deck-view"))).toBe("list");

  const phraseFilter = page.locator('[data-article-filter="situation"][data-filter-value="shopping"]');
  await phraseFilter.click();
  await expect(phraseFilter).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator("#learningArticleGrid [data-learn-article-card]:visible").count()).toBeGreaterThan(0);
  const resourceFilter = page.locator('[data-resource-filter="level"][data-filter-value="A1"]');
  await resourceFilter.click();
  await expect(resourceFilter).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator("#resourceArticleGrid [data-resource-article-card]:visible").count()).toBeGreaterThan(0);

  await page.locator("#original-web-tools").scrollIntoViewIfNeeded();
  await expect(page.locator('.learn-page-guide a[href="#original-web-tools"]')).toHaveAttribute("aria-current", "location");
  await assertSharedLayout(page);
  await assertRouteReady(page);

  await openRoute(page, "/germany/ja/");
  await expect(page.locator('.portal3-chips a[href="/germany/ja/learn-german/#original-web-tools"]')).toBeVisible();
});

test("flashcard session supports keyboard flip, three ratings, completion, results, CSV, and dark mode", async ({ page }) => {
  await openDataRoute(page, flashcardsRoute, [decksPath, a1CardsPath]);
  await expect(page.locator("#flashcardsSetup")).toBeVisible();
  await expect(page.locator("#sessionSetupTitle")).toContainText("A1");
  await page.locator("#flashcardsStart").click();
  await expect(page.locator("#flashcardsStudy")).toBeVisible();
  await expect(page.locator("#flashcardsPosition")).toHaveText("1 / 10");

  const flip = page.locator("#flashcardFlipControl");
  await flip.focus();
  await page.keyboard.press("Space");
  await expect(flip).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-rating="again"]')).toBeEnabled();
  await page.locator("#flashcardsDetailsToggle").click();
  await expect(page.locator("#flashcardsDetailsToggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#flashcardsDetails")).toBeVisible();
  await page.locator('[data-rating="again"]').click();

  const ratings = ["unsure", "known", "known", "known", "known", "known", "known", "known", "known"];
  for (const rating of ratings) {
    await page.locator("#flashcardFlip").click();
    await page.locator(`[data-rating="${rating}"]`).click();
  }

  await expect(page.locator("#flashcardsResults")).toBeVisible();
  await expect(page.locator("#flashcardsResultStats")).toContainText("10枚");
  await expect(page.locator("#flashcardsResultStats")).toContainText("1枚");
  await expect(page.locator("#flashcardsWeakList li")).toHaveCount(2);
  await expect(page.locator("#flashcardsReviewWeak")).toBeEnabled();

  const csvDownloadPromise = page.waitForEvent("download");
  await page.locator("#flashcardsDownloadCsv").click();
  const csvDownload = await csvDownloadPromise;
  const csvPath = await csvDownload.path();
  const csv = await fs.readFile(csvPath);
  expect([...csv.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const csvText = csv.toString("utf8");
  expect(csvText).toContain('"level","deck","german","japanese"');
  expect(csvText).toContain('"grammar_info"');
  expect(csvText.split("\r\n").filter(Boolean)).toHaveLength(11);

  await activateDarkMode(page);
  await assertSharedLayout(page);
  await assertRouteReady(page);
});

test("German word and example audio can be played, switched, and stopped without overlapping", async ({ page }) => {
  await installSpeechMock(page);
  await openDataRoute(page, flashcardsRoute, [decksPath, a1CardsPath]);
  await page.locator("#flashcardsStart").click();

  const wordButton = page.locator("#flashcardsSpeak");
  const exampleButton = page.locator("#flashcardsSpeakExample");
  const word = await page.locator("#flashcardPrompt").textContent();
  await expect(wordButton).toHaveAccessibleName(new RegExp(word));
  await wordButton.click();
  await expect(wordButton).toHaveAttribute("aria-pressed", "true");

  await page.locator("#flashcardFlip").click();
  const example = await page.locator("#flashcardExampleDe").textContent();
  await expect(exampleButton).toBeVisible();
  await expect(exampleButton).toBeEnabled();
  await expect(exampleButton).toHaveAccessibleName(new RegExp(example.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await exampleButton.click();
  await expect(wordButton).toHaveAttribute("aria-pressed", "false");
  await expect(exampleButton).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => window.__flashcardsSpeechCalls.filter(call => call.type === "speak"))).toEqual([
    { type: "speak", text: word, lang: "de-DE", rate: 0.9, voice: "de-DE" },
    { type: "speak", text: example, lang: "de-DE", rate: 0.9, voice: "de-DE" }
  ]);

  await exampleButton.click();
  await expect(exampleButton).toHaveAttribute("aria-pressed", "false");
  await page.locator("#flashcardsNext").click();
  await expect(wordButton).toHaveAttribute("aria-pressed", "false");

  await openDataRoute(page, flashcardsRoute, [decksPath, a1CardsPath]);
  await page.locator("#flashcardsInventorySearch").fill("夕方、夜会");
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("1 / 650語");
  await page.locator("#flashcardsInventoryStudyFiltered").click();
  await page.locator("#flashcardFlip").click();
  await expect(page.locator("#flashcardExampleDe")).toContainText("編集レビュー待ち");
  await expect(exampleButton).toBeHidden();
  await assertNoHorizontalOverflow(page);
});

test("level deck inventory lists every word with sorting, filters, saved state, CSV, and filtered study", async ({ page }) => {
  await openDataRoute(page, flashcardsRoute, [decksPath, a1CardsPath]);
  const inventory = page.locator("#flashcardsInventory");
  await expect(inventory).toBeVisible();
  await expect(page.locator("#flashcardsInventoryTitle")).toContainText("全650語");
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("650 / 650語");
  await expect(page.locator("#flashcardsInventoryBody tr")).toHaveCount(50);
  await expect(page.locator("#flashcardsInventoryBody tr").first()).toContainText("der Termin");
  await expect(page.locator("#flashcardsInventoryBody tr").first()).toContainText("明日は医師の予約があります");

  const germanHeading = page.locator('[data-inventory-sort-column="display_de"]');
  await germanHeading.locator("button").click();
  await expect(germanHeading).toHaveAttribute("aria-sort", "ascending");
  await germanHeading.locator("button").click();
  await expect(germanHeading).toHaveAttribute("aria-sort", "descending");

  await page.locator("#flashcardsInventoryQuality").selectOption("editorial-reviewed");
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("50 / 650語");
  await expect(page.locator("#flashcardsInventoryBody tr")).toHaveCount(50);
  await page.locator("#flashcardsInventoryReset").click();

  const firstSave = page.locator("#flashcardsInventoryBody [data-inventory-save]").first();
  await firstSave.click();
  await expect.poll(() => page.evaluate(async () => (await window.JConnectFlashcardStorage.getProgress("a1-001"))?.saved)).toBe(true);
  const backupDownloadPromise = page.waitForEvent("download");
  await page.locator("#flashcardsBackup").click();
  const backupPath = await (await backupDownloadPromise).path();
  const backup = JSON.parse(await fs.readFile(backupPath, "utf8"));
  expect(backup.progress.find(entry => entry.card_id === "a1-001")?.saved).toBe(true);
  await page.locator("#flashcardsInventorySaved").selectOption("saved");
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("1 / 650語");
  await expect(page.locator("#flashcardsInventoryBody tr")).toHaveCount(1);

  const csvDownloadPromise = page.waitForEvent("download");
  await page.locator("#flashcardsInventoryCsv").click();
  const csvPath = await (await csvDownloadPromise).path();
  const csvText = await fs.readFile(csvPath, "utf8");
  expect(csvText).toContain('"order","saved","level","german"');
  expect(csvText).toContain('"yes","A1","der Termin"');
  expect(csvText.split("\r\n").filter(Boolean)).toHaveLength(2);

  await page.locator("#flashcardsInventoryReset").click();
  await page.locator("#flashcardsInventorySearch").fill("予約、約束の日時");
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("1 / 650語");
  await page.locator("#flashcardsInventoryStudyFiltered").click();
  await expect(page.locator("#flashcardsStudy")).toBeVisible();
  await expect(page.locator("#flashcardsPosition")).toHaveText("1 / 1");
  await page.locator("#flashcardFlip").click();
  await page.locator('[data-rating="known"]').click();
  await expect(page.locator("#flashcardsResults")).toBeVisible();
  await page.locator("#flashcardsInventoryStatus").selectOption("reviewing");
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("1 / 650語");
  await expect(page.locator("#flashcardsInventoryBody tr")).toHaveCount(1);
  await expect(page.locator("#flashcardsInventoryBody tr").first()).toContainText("学習中");
});

test("C2 level-only deck loads 3,000 cards without lower levels and can start a bounded session", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/learn-german/flashcards/?deck=c2-nuance-repertoire", [decksPath, c2CardsPath]);
  await expect(page.locator("#flashcardsSetup")).toBeVisible();
  await expect(page.locator("#sessionSetupTitle")).toContainText("3,000");
  await expect(page.locator("#setupDeckBadges")).toContainText("3,000枚");
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("3,000 / 3,000語");
  await expect(page.locator("#flashcardsInventoryBody tr")).toHaveCount(50);
  await page.locator("#flashcardsStart").click();
  await expect(page.locator("#flashcardsPosition")).toHaveText("1 / 10");
});

test("incomplete progress resumes after reload and JSON backup, rejection, restore, and reset are safe", async ({ page }) => {
  await openDataRoute(page, flashcardsRoute, [decksPath, a1CardsPath]);
  await page.locator("#flashcardsStart").click();
  await page.locator("#flashcardFlip").click();
  await page.locator('[data-rating="known"]').click();
  await expect(page.locator("#flashcardsPosition")).toHaveText("2 / 10");

  const decksReload = page.waitForResponse(response => new URL(response.url()).pathname === decksPath);
  const cardsReload = page.waitForResponse(response => new URL(response.url()).pathname === a1CardsPath);
  await page.reload({ waitUntil: "load" });
  await Promise.all([decksReload, cardsReload]);
  await expect(page.locator("#flashcardsResume")).toBeVisible();
  await expect(page.locator("#flashcardsResumeNote")).toContainText("2/10枚目");
  await page.locator("#flashcardsResume").click();
  await expect(page.locator("#flashcardsPosition")).toHaveText("2 / 10");
  await page.locator("#flashcardsEndSession").click();

  const backupDownloadPromise = page.waitForEvent("download");
  await page.locator("#flashcardsBackup").click();
  const backupDownload = await backupDownloadPromise;
  const backupPath = await backupDownload.path();
  const backup = JSON.parse(await fs.readFile(backupPath, "utf8"));
  expect(backup.schema_version).toBe(1);
  expect(backup.progress).toHaveLength(1);
  expect(backup.sessions).toHaveLength(1);

  await page.locator("#flashcardsRestore").setInputFiles({
    name: "unsupported-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ schema_version: 999, progress: [], sessions: [] }))
  });
  await expect(page.locator("#flashcardsToast")).toContainText("対応していないバックアップ形式");

  await page.locator("#flashcardsReset").click();
  await expect(page.locator("#flashcardsResetDialog")).toBeVisible();
  await page.locator("#flashcardsConfirmReset").click();
  await expect.poll(() => page.evaluate(async () => ({
    progress: (await window.JConnectFlashcardStorage.getAllProgress()).length,
    sessions: (await window.JConnectFlashcardStorage.getAllSessions()).length
  }))).toEqual({ progress: 0, sessions: 0 });

  const loadPromise = page.waitForEvent("load");
  await page.locator("#flashcardsRestore").setInputFiles(backupPath);
  await loadPromise;
  await expect(page.locator("#flashcardsResume")).toBeVisible();
  await expect(page.locator("#flashcardsResumeNote")).toContainText("2/10枚目");
  await assertNoHorizontalOverflow(page);
});
