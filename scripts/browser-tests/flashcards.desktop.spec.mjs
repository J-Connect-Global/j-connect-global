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
const a2CardsPath = "/assets/data/learn-german/flashcards/cards-a2.json";
const b1CardsPath = "/assets/data/learn-german/flashcards/cards-b1.json";
const b2CardsPath = "/assets/data/learn-german/flashcards/cards-b2.json";
const c1CardsPath = "/assets/data/learn-german/flashcards/cards-c1.json";
const c2CardsPath = "/assets/data/learn-german/flashcards/cards-c2.json";
const allCardPaths = [a1CardsPath, a2CardsPath, b1CardsPath, b2CardsPath, c1CardsPath, c2CardsPath];
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
  await expect(page.locator("#originalDeckGrid .learn-deck-card")).toHaveCount(14);

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

test("flashcard session supports front and back keyboard ratings, buttons, completion, results, CSV, and dark mode", async ({ page }) => {
  await openDataRoute(page, flashcardsRoute, [decksPath, a1CardsPath]);
  await expect(page.locator("#flashcardsSetup")).toBeVisible();
  await expect(page.locator("#sessionSetupTitle")).toContainText("A1");
  await expect(page.locator('[data-study-target-count="all"]')).toHaveText("36語");
  await expect(page.locator('[data-study-target-count="unstarted"]')).toHaveText("36語");
  await expect(page.locator('input[name="session-target"][value="studied"]')).toBeDisabled();
  await expect(page.locator("#flashcardsStartSummary")).toContainText("すべて 36語から10枚");
  await page.locator("#flashcardsStart").click();
  await expect(page.locator("#flashcardsStudy")).toBeVisible();
  await expect(page.locator("#flashcardsPosition")).toHaveText("1 / 10");
  await expect(page.locator(".flashcard__hint")).toHaveCount(0);

  const cardBox = await page.locator("#flashcardFlip").boundingBox();
  expect(cardBox.width).toBeLessThanOrEqual(861);
  expect(cardBox.height).toBeLessThanOrEqual(241);

  const flip = page.locator("#flashcardFlipControl");
  const inventorySearch = page.locator("#flashcardsInventorySearch");
  expect(await page.locator("[data-rating]").evaluateAll(buttons => buttons.every(button => !button.disabled))).toBe(true);
  await inventorySearch.focus();
  await page.keyboard.press("1");
  await expect(inventorySearch).toHaveValue("1");
  await expect(page.locator("#flashcardsPosition")).toHaveText("1 / 10");

  await flip.focus();
  await page.keyboard.press("1");
  await expect(page.locator("#flashcardsPosition")).toHaveText("2 / 10");
  await expect.poll(() => page.evaluate(async () => (await window.JConnectFlashcardStorage.getProgress("a1-001"))?.last_result)).toBe("again");
  await expect(flip).toHaveAttribute("aria-pressed", "false");

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#flashcardsPosition")).toHaveText("3 / 10");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#flashcardsPosition")).toHaveText("2 / 10");
  await page.keyboard.press("2");
  await expect(page.locator("#flashcardsPosition")).toHaveText("3 / 10");
  await flip.focus();
  await page.keyboard.press("Space");
  await expect(flip).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-rating="again"]')).toBeEnabled();
  await page.locator("#flashcardsDetailsToggle").click();
  await expect(page.locator("#flashcardsDetailsToggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#flashcardsDetails")).toBeVisible();
  await flip.focus();
  await page.keyboard.press("3");
  await expect(page.locator("#flashcardsPosition")).toHaveText("4 / 10");

  for (let index = 0; index < 7; index += 1) {
    await page.locator('[data-rating="known"]').click();
  }

  await expect(page.locator("#flashcardsResults")).toBeVisible();
  await expect(page.locator(".flashcards-result-score")).toContainText("80%");
  await expect(page.locator(".flashcards-result-score")).toContainText("覚えた 8枚 / 全10枚");
  await expect(page.locator(".flashcards-result-legend .is-known")).toContainText("8枚");
  await expect(page.locator(".flashcards-result-legend .is-unsure")).toContainText("1枚");
  await expect(page.locator(".flashcards-result-legend .is-again")).toContainText("1枚");
  await expect(page.locator(".flashcards-result-metrics")).toContainText("復習対象");
  await expect(page.locator("#flashcardsBreakdownSection")).toBeHidden();
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

test("study setup filters sessions by saved progress and last rating with live counts", async ({ page }) => {
  await openDataRoute(page, flashcardsRoute, [decksPath, a1CardsPath]);
  await page.evaluate(async () => {
    const base = {
      attempts: 1,
      known_count: 0,
      unsure_count: 0,
      again_count: 0,
      current_streak: 0,
      saved: false
    };
    await Promise.all([
      window.JConnectFlashcardStorage.putProgress({ ...base, card_id: "a1-001", status: "reviewing", again_count: 1, last_result: "again", next_review: "2999-01-01T00:00:00.000Z" }),
      window.JConnectFlashcardStorage.putProgress({ ...base, card_id: "a1-002", status: "mastered", attempts: 3, known_count: 3, current_streak: 3, saved: true, last_result: "known", next_review: "2999-01-01T00:00:00.000Z" }),
      window.JConnectFlashcardStorage.putProgress({ ...base, card_id: "a1-003", status: "reviewing", unsure_count: 1, last_result: "unsure", next_review: "2000-01-01T00:00:00.000Z" }),
      window.JConnectFlashcardStorage.putProgress({ ...base, card_id: "a1-004", status: "unstarted", attempts: 0, saved: true })
    ]);
  });
  await page.reload();
  await expect(page.locator("#flashcardsSetup")).toBeVisible();

  const expectedCounts = {
    all: "36語",
    unstarted: "33語",
    studied: "3語",
    again: "1語",
    unsure: "1語",
    known: "1語",
    due: "1語",
    saved: "2語"
  };
  for (const [target, count] of Object.entries(expectedCounts)) {
    await expect(page.locator(`[data-study-target-count="${target}"]`)).toHaveText(count);
  }

  await page.locator('input[name="session-target"][value="again"]').check();
  await expect(page.locator("#flashcardsStartSummary")).toHaveText("もう一度 1語から1枚を、収録順・独→日で出題します。");
  await page.locator("#flashcardsStart").click();
  await expect(page.locator("#flashcardsPosition")).toHaveText("1 / 1");
  await expect.poll(() => page.evaluate(async () => (await window.JConnectFlashcardStorage.getSession("a1-life-basics"))?.selected_target)).toBe("again");

  await page.locator("#flashcardsEndSession").click();
  await page.locator('input[name="session-target"][value="saved"]').check();
  await expect(page.locator("#flashcardsStartSummary")).toContainText("保存済み 2語から2枚");
  await page.locator("#flashcardsStart").click();
  await expect(page.locator("#flashcardsPosition")).toHaveText("1 / 2");
  await expect.poll(() => page.evaluate(async () => (await window.JConnectFlashcardStorage.getSession("a1-life-basics"))?.card_ids)).toEqual(["a1-002", "a1-004"]);
});

test("German word and example audio can be played, switched, and stopped without overlapping", async ({ page }) => {
  await installSpeechMock(page);
  await openDataRoute(page, flashcardsRoute, [decksPath, a1CardsPath]);
  await page.locator("#flashcardsStart").click();

  const wordButton = page.locator("#flashcardsSpeak");
  const exampleButton = page.locator("#flashcardsSpeakExample");
  const prompt = page.locator("#flashcardPrompt");
  await expect(prompt).not.toHaveText("読み込み中");
  const word = await prompt.textContent();
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
  await page.locator("#flashcardsInventorySearch").fill("おはようございます");
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("1 / 36枚");
  await page.locator("#flashcardsInventoryStudyFiltered").click();
  await page.locator("#flashcardFlip").click();
  await expect(page.locator("#flashcardAnswer")).toHaveText("おはようございます");
  await expect(page.locator("#flashcardExampleDe")).toContainText("Guten Morgen");
  await expect(exampleButton).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("level deck inventory lists every word with sorting, filters, saved state, CSV, and filtered study", async ({ page }) => {
  await openDataRoute(page, flashcardsRoute, [decksPath, a1CardsPath]);
  const inventory = page.locator("#flashcardsInventory");
  await expect(inventory).toBeVisible();
  await expect(page.locator("#flashcardsInventoryTitle")).toContainText("全36枚");
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("36 / 36枚");
  await expect(page.locator("#flashcardsInventoryBody tr")).toHaveCount(25);
  await expect(page.locator("#flashcardsInventoryBody tr").first()).toContainText("der Termin");
  await expect(page.locator("#flashcardsInventoryBody tr").first()).toContainText("A1");
  await expect(page.locator("#flashcardsInventoryBody tr").first()).toContainText("明日は医師の予約があります");
  await expect(page.locator("#flashcardsInventoryBody tr").first()).not.toContainText("見出し語:");
  await expect(page.locator('[data-inventory-sort-column="level"]')).toBeVisible();
  await expect(page.locator('[data-inventory-sort-column="quality"]')).toHaveCount(0);
  await expect(page.locator('[data-inventory-sort-column="order"]')).toHaveCount(0);
  expect(await page.locator("#flashcardsInventoryBody tr").evaluateAll(rows => Math.max(...rows.map(row => row.getBoundingClientRect().height)))).toBeLessThanOrEqual(110);

  const germanHeading = page.locator('[data-inventory-sort-column="display_de"]');
  await germanHeading.locator("button").click();
  await expect(germanHeading).toHaveAttribute("aria-sort", "ascending");
  await germanHeading.locator("button").click();
  await expect(germanHeading).toHaveAttribute("aria-sort", "descending");

  const firstSave = page.locator("#flashcardsInventoryBody [data-inventory-save]").first();
  await firstSave.click();
  await expect.poll(() => page.evaluate(async () => (await window.JConnectFlashcardStorage.getProgress("a1-001"))?.saved)).toBe(true);
  const backupDownloadPromise = page.waitForEvent("download");
  await page.locator("#flashcardsBackup").click();
  const backupPath = await (await backupDownloadPromise).path();
  const backup = JSON.parse(await fs.readFile(backupPath, "utf8"));
  expect(backup.progress.find(entry => entry.card_id === "a1-001")?.saved).toBe(true);
  await page.locator("#flashcardsInventorySaved").selectOption("saved");
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("1 / 36枚");
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
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("1 / 36枚");
  await page.locator("#flashcardsInventoryStudyFiltered").click();
  await expect(page.locator("#flashcardsStudy")).toBeVisible();
  await expect(page.locator("#flashcardsPosition")).toHaveText("1 / 1");
  await page.locator("#flashcardFlip").click();
  await page.locator('[data-rating="known"]').click();
  await expect(page.locator("#flashcardsResults")).toBeVisible();
  await page.locator("#flashcardsInventoryStatus").selectOption("reviewing");
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("1 / 36枚");
  await expect(page.locator("#flashcardsInventoryBody tr")).toHaveCount(1);
  await expect(page.locator("#flashcardsInventoryBody tr").first()).toContainText("学習中");
  await expect(page.locator("#flashcardsInventoryBody .flashcards-inventory-progress .flashcards-inventory-subtext")).toHaveCSS("white-space", "nowrap");
});

test("combined deck offers six level chips for study and inventory filtering", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/learn-german/flashcards/?deck=all-levels-reviewed", [decksPath, ...allCardPaths]);
  await expect(page.locator("#flashcardsSetup")).toBeVisible();
  await expect(page.locator("#setupDeckBadges")).toContainText("全6レベル");
  await expect(page.locator("#flashcardsLevelFilter")).toBeVisible();
  await expect(page.locator('#flashcardsLevelChips input[name="session-level"]')).toHaveCount(6);
  await expect(page.locator('[data-study-target-count="all"]')).toHaveText("217語");

  for (const level of ["A2", "B1", "B2", "C1", "C2"]) {
    await page.locator(`#flashcardsLevelChips input[value="${level}"]`).uncheck();
  }
  await expect(page.locator('[data-study-target-count="all"]')).toHaveText("36語");
  await expect(page.locator("#flashcardsStartSummary")).toContainText("すべて 36語から10枚");
  await page.locator("#flashcardsStart").click();
  await expect(page.locator("#flashcardsPosition")).toHaveText("1 / 10");
  await expect.poll(() => page.evaluate(async () => (await window.JConnectFlashcardStorage.getSession("all-levels-reviewed"))?.selected_levels)).toEqual(["A1"]);
  await page.locator("#flashcardsEndSession").click();

  await expect(page.locator("#flashcardsInventoryLevelFilter")).toBeVisible();
  await expect(page.locator("#flashcardsInventoryLevelChips input")).toHaveCount(6);
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("217 / 217枚");
  for (const level of ["A2", "B1", "B2", "C1", "C2"]) {
    await page.locator(`#flashcardsInventoryLevelChips input[value="${level}"]`).uncheck();
  }
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("36 / 36枚");
  await expect(page.locator("#flashcardsInventoryBody tr")).toHaveCount(25);
  expect(await page.locator("#flashcardsInventoryBody tr").evaluateAll(rows => rows.every(row => row.textContent.includes("A1")))).toBe(true);
});

test("C2 level-only deck contains only reviewed C2 cards and can start a bounded session", async ({ page }) => {
  await openDataRoute(page, "/germany/ja/learn-german/flashcards/?deck=c2-nuance-repertoire", [decksPath, c2CardsPath]);
  await expect(page.locator("#flashcardsSetup")).toBeVisible();
  await expect(page.locator("#sessionSetupTitle")).toContainText("5");
  await expect(page.locator("#setupDeckBadges")).toContainText("5枚");
  await expect(page.locator("#flashcardsInventorySummary")).toContainText("5 / 5枚");
  await expect(page.locator("#flashcardsInventoryBody tr")).toHaveCount(5);
  expect(await page.locator("#flashcardsInventoryBody tr").evaluateAll(rows => rows.every(row => row.textContent.includes("C2")))).toBe(true);
  await page.locator("#flashcardsStart").click();
  await expect(page.locator("#flashcardsPosition")).toHaveText("1 / 5");
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
