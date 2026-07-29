import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  activeJobs,
  assertNoRuntimeDiagnostics,
  fixtureCommunityDetailPath,
  installRuntimeDiagnostics,
  openRoute,
  stubDriveImages,
  waitForDataLoad
} from "./support.mjs";

test.setTimeout(75_000);

const representativeRoutes = [
  { name: "global home", route: "/" },
  { name: "Japanese portal", route: "/germany/ja/", ready: true },
  { name: "Jobs list", route: "/germany/ja/jobs/", ready: true },
  { name: "Jobs detail", route: activeJobs[0].detail_url },
  { name: "Community list", route: "/germany/ja/community/", ready: true },
  { name: "Community detail", route: fixtureCommunityDetailPath },
  { name: "Living article", route: "/germany/ja/living/health-insurance-guide/" },
  { name: "Learn article", route: "/germany/ja/learn-german/appointment-phrase/" },
  { name: "Events hub", route: "/germany/ja/events/" },
  { name: "Search", route: "/germany/ja/search/" },
  { name: "Community posting form", route: "/germany/ja/community/post/" },
  { name: "Contact form", route: "/germany/ja/contact/" },
  { name: "Privacy", route: "/germany/ja/privacy/" },
  { name: "Impressum", route: "/germany/ja/impressum/" }
];

const darkModeRoutes = [
  { name: "global home", route: "/" },
  { name: "Japanese portal", route: "/germany/ja/", ready: true },
  { name: "Jobs list", route: "/germany/ja/jobs/", ready: true },
  { name: "Community list", route: "/germany/ja/community/", ready: true },
  { name: "Living article", route: "/germany/ja/living/health-insurance-guide/" },
  { name: "posting form", route: "/germany/ja/community/post/" }
];

test.beforeEach(async ({ page }) => {
  installRuntimeDiagnostics(page);
  await stubDriveImages(page);
  await page.addInitScript(() => {
    localStorage.setItem("jconnect_cookie_consent", "denied");
    if (!localStorage.getItem("jconnect-theme")) localStorage.setItem("jconnect-theme", "light");
  });
});

test.afterEach(async ({ page }) => {
  await assertNoRuntimeDiagnostics(page);
});

async function openAccessibleRoute(page, entry) {
  await openRoute(page, entry.route);
  if (entry.ready) await waitForDataLoad(page);
}

function violationSummary(results) {
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      failure: node.failureSummary
    }))
  }));
}

async function expectNoAxeViolations(page, label) {
  // The artifact validator rejects iframes, so the same-origin axe path still
  // covers the complete document without the separate blank-page aggregator.
  const results = await new AxeBuilder({ page })
    .setLegacyMode()
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violationSummary(results), `${label} must have no automated WCAG A/AA violations`).toEqual([]);
}

for (const entry of representativeRoutes) {
  test(`${entry.name} passes automated WCAG checks`, async ({ page }) => {
    await openAccessibleRoute(page, entry);
    await expectNoAxeViolations(page, entry.name);
  });
}

test("not-found page passes automated WCAG checks", async ({ page }) => {
  const response = await page.goto("/quality-audit-not-found/", { waitUntil: "load" });
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toBeVisible();
  await expectNoAxeViolations(page, "not-found page");
});

for (const entry of darkModeRoutes) {
  test(`${entry.name} passes automated WCAG checks in dark mode`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("jconnect-theme", "dark"));
    await openAccessibleRoute(page, entry);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expectNoAxeViolations(page, `${entry.name} dark mode`);
  });
}

test("shared skip link moves keyboard focus to the main content", async ({ page }) => {
  await openRoute(page, "/germany/ja/living/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".jc-skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});
