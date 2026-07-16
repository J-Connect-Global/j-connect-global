import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const localOrigin = new URL(baseURL).origin;
const diagnosticsByPage = new WeakMap();

async function readFixture(relativePath) {
  return JSON.parse(await readFile(new URL(`../../${relativePath}`, import.meta.url), "utf8"));
}

export const communityFixture = await readFixture("assets/data/community/posts.json");
export const jobsFixture = await readFixture("assets/data/jobs/jobs.json");
export const eatFixture = await readFixture("assets/data/eat/items.json");
export const shoppingFixture = await readFixture("assets/data/shopping/items.json");
export const medicalFixture = await readFixture("assets/data/medical/items.json");

export const activeCommunityPosts = communityFixture.items.filter((post) => post.status === "active");
export const fixtureCommunityPost = activeCommunityPosts[0];
export const fixtureCommunityPostId = fixtureCommunityPost?.post_id || fixtureCommunityPost?.id || "";
export const fixtureCommunityDetailPath = fixtureCommunityPost?.detail_url || `/germany/ja/community/post/?id=${encodeURIComponent(fixtureCommunityPostId)}`;

function communityFixtureImageUrls(post) {
  const values = [
    post?.image_url,
    post?.image_url_1,
    post?.image_url_2,
    post?.image_url_3,
    ...(Array.isArray(post?.image_urls) ? post.image_urls : []),
    ...(Array.isArray(post?.images) ? post.images : [])
  ];
  return values.map((value) => String(value || "").trim()).filter(Boolean);
}

export const fixturePhotoCommunityPost = activeCommunityPosts.find((post) => communityFixtureImageUrls(post).length > 0);
export const fixtureNoImageCommunityPost = activeCommunityPosts.find((post) => communityFixtureImageUrls(post).length === 0);

export function installRuntimeDiagnostics(page) {
  const diagnostics = { pageErrors: [], consoleErrors: [], externalDataRequests: [] };
  diagnosticsByPage.set(page, diagnostics);

  page.on("pageerror", (error) => {
    diagnostics.pageErrors.push(error.stack || error.message || String(error));
  });

  page.on("console", (message) => {
    if (message.type() !== "error") return;

    const text = message.text();
    if (/^Failed to load resource:/i.test(text)) return;

    const location = message.location();
    if (location.url) {
      try {
        if (new URL(location.url).origin !== localOrigin) return;
      } catch {
        return;
      }
    }

    const source = location.url
      ? `${location.url}:${location.lineNumber || 0}:${location.columnNumber || 0}`
      : "inline page script";
    diagnostics.consoleErrors.push(`${text} (${source})`);
  });

  page.on("request", (request) => {
    if (!["fetch", "xhr"].includes(request.resourceType())) return;
    const url = new URL(request.url());
    if (url.hostname === "script.google.com" || url.hostname === "script.googleusercontent.com") {
      diagnostics.externalDataRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
    }
  });
}

export async function assertNoRuntimeDiagnostics(page) {
  await page.waitForTimeout(50);
  const diagnostics = diagnosticsByPage.get(page) || { pageErrors: [], consoleErrors: [], externalDataRequests: [] };
  expect.soft(diagnostics.pageErrors, "uncaught page errors").toEqual([]);
  expect.soft(diagnostics.consoleErrors, "console.error calls from J-Connect scripts").toEqual([]);
  expect.soft(diagnostics.externalDataRequests, "public rendering must not fetch Apps Script data").toEqual([]);
}

export async function openRoute(page, route) {
  const response = await page.goto(route, { waitUntil: "load" });
  expect(response, `${route} returned no main-document response`).not.toBeNull();
  expect(response.ok(), `${route} returned HTTP ${response.status()}`).toBe(true);
}

export async function openDataRoute(page, route, dataPath) {
  const dataPaths = Array.isArray(dataPath) ? dataPath : [dataPath];
  const staticDataResponses = dataPaths.map((expectedPath) => page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === localOrigin && url.pathname === expectedPath;
  }));

  await openRoute(page, route);
  const responses = await Promise.all(staticDataResponses);
  responses.forEach((response, index) => {
    expect(response.ok(), `${route} did not load ${dataPaths[index]} successfully from the local origin`).toBe(true);
  });
}

export async function waitForDataLoad(page) {
  await expect.poll(async () => page.evaluate(() => {
    const isVisible = (element) => {
      if (element.hidden) return false;
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const bodyText = document.body?.innerText || "";
    const visibleIndicators = Array.from(document.querySelectorAll(
      ".detail-loading, .jc-loading-state, .loading-lines, #cards[aria-busy='true'], #jobDetail[aria-busy='true']"
    )).filter(isVisible).length;

    return {
      hasLoadingText: /読み込み中|データを読み込んでいます/.test(bodyText),
      visibleIndicators
    };
  }), {
    message: "the route must leave its loading state",
    timeout: 15_000
  }).toEqual({ hasLoadingText: false, visibleIndicators: 0 });
}

export async function assertNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      clientWidth: root.clientWidth,
      scrollWidth: Math.max(root.scrollWidth, document.body?.scrollWidth || 0)
    };
  });
  expect(dimensions.scrollWidth, `horizontal overflow: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.clientWidth);
}

export async function assertRouteReady(page) {
  await waitForDataLoad(page);
  await assertDocumentSemantics(page);
  await assertNoHorizontalOverflow(page);
}

export async function assertDirectoryModalKeyboard(page) {
  const detailButton = page.locator("#cards [data-detail]").first();
  const modal = page.locator("#listingModal");
  await expect(detailButton).toBeVisible();
  await detailButton.focus();
  await page.keyboard.press("Enter");
  await expect(modal).toBeVisible();
  await expect(page.locator("#listingModalClose")).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await expect(detailButton).toBeFocused();
}

export async function assertDocumentSemantics(page) {
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  const canonicalLink = page.locator('link[rel="canonical"]');
  await expect(canonicalLink).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(1);

  const currentUrl = new URL(page.url());
  const canonicalUrl = new URL(await canonicalLink.getAttribute("href"));
  expect({
    origin: canonicalUrl.origin,
    pathname: canonicalUrl.pathname,
    search: canonicalUrl.search,
    hash: canonicalUrl.hash
  }, "canonical URL must identify the current route without query or fragment state").toEqual({
    origin: "https://j-connect-global.com",
    pathname: currentUrl.pathname,
    search: "",
    hash: ""
  });

  const visibleH1 = page.locator("h1:visible");
  await expect(visibleH1).toHaveCount(1);
  await expect(visibleH1).not.toHaveText(/^\s*$/);

  const emptyHeadings = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((headings) => headings
    .filter((heading) => !heading.textContent?.trim())
    .map((heading) => heading.outerHTML));
  expect(emptyHeadings, "headings must not be empty after rendering").toEqual([]);

  const hreflangs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((links) => links
    .map((link) => link.getAttribute("hreflang"))
    .sort());
  expect(hreflangs).toEqual(["ja", "x-default"]);
  await expect(page.locator('a[href*="/community/detail/"]')).toHaveCount(0);
}

export async function assertNoIndex(page) {
  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveCount(1);
  await expect(robots).toHaveAttribute("content", /(?:^|,)\s*noindex\b/i);
}

export async function assertSharedLayout(page) {
  await expect(page.locator("header.site-header")).toHaveCount(1);
  await expect(page.locator("footer.page-footer")).toHaveCount(1);
}

export async function assertOneManualShareButton(page) {
  const manualShare = page.locator('[data-social-share="manual"]');
  const accessibleButton = page.getByRole("button", { name: "シェアする", exact: true });
  await expect(manualShare).toHaveCount(1);
  await expect(page.locator('[data-social-share="auto"]')).toHaveCount(0);
  await expect(manualShare.locator('[data-share-trigger="true"]')).toHaveCount(1);
  await expect(accessibleButton).toHaveCount(1);
  await expect(accessibleButton).toBeVisible();
  await expect(accessibleButton).toBeEnabled();
}

export async function activateDarkMode(page) {
  const toggle = page.locator("[data-theme-toggle]").first();
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("jconnect-theme"))).toBe("dark");
}

export async function assertWcagTextContrast(page, selector, label) {
  const element = page.locator(selector).first();
  await expect(element).toBeVisible();

  const result = await element.evaluate((target) => {
    const parseColor = (value) => {
      const channels = String(value).match(/[\d.]+/g)?.map(Number) || [];
      if (channels.length < 3) throw new Error(`Unsupported computed color: ${value}`);
      return {
        r: channels[0],
        g: channels[1],
        b: channels[2],
        a: channels.length > 3 ? channels[3] : 1
      };
    };

    const composite = (foreground, background) => {
      const alpha = foreground.a + background.a * (1 - foreground.a);
      if (!alpha) return { r: 0, g: 0, b: 0, a: 0 };
      return {
        r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
        g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
        b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
        a: alpha
      };
    };

    const effectiveBackground = (start) => {
      let accumulated = { r: 0, g: 0, b: 0, a: 0 };
      for (let current = start; current; current = current.parentElement) {
        accumulated = composite(accumulated, parseColor(getComputedStyle(current).backgroundColor));
        if (accumulated.a >= 0.999) break;
      }
      return composite(accumulated, { r: 255, g: 255, b: 255, a: 1 });
    };

    const linearChannel = (channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (color) => (
      0.2126 * linearChannel(color.r)
      + 0.7152 * linearChannel(color.g)
      + 0.0722 * linearChannel(color.b)
    );

    const style = getComputedStyle(target);
    const background = effectiveBackground(target);
    const foreground = composite(parseColor(style.color), background);
    const lighter = Math.max(luminance(foreground), luminance(background));
    const darker = Math.min(luminance(foreground), luminance(background));
    const fontSize = Number.parseFloat(style.fontSize) || 0;
    const parsedWeight = Number.parseInt(style.fontWeight, 10);
    const fontWeight = Number.isFinite(parsedWeight) ? parsedWeight : (style.fontWeight === "bold" ? 700 : 400);
    const largeText = fontSize >= 24 || (fontSize >= 18.6667 && fontWeight >= 700);

    return {
      background: style.backgroundColor,
      color: style.color,
      fontSize,
      fontWeight,
      ratio: (lighter + 0.05) / (darker + 0.05),
      threshold: largeText ? 3 : 4.5
    };
  });

  expect(
    result.ratio,
    `${label} contrast ${result.ratio.toFixed(2)}:1 is below ${result.threshold}:1 (${result.color} on ${result.background})`
  ).toBeGreaterThanOrEqual(result.threshold);
}

export async function assertCommunityCards(page) {
  expect(activeCommunityPosts.length, "the Community fixture must contain active records").toBeGreaterThan(0);
  const cards = page.locator("#cards [data-post-id]");
  await expect(cards).toHaveCount(activeCommunityPosts.length);

  const renderedIds = await cards.evaluateAll((elements) => elements.map((element) => element.dataset.postId).sort());
  const fixtureIds = activeCommunityPosts
    .map((post) => String(post.post_id || post.id))
    .sort();
  expect(renderedIds).toEqual(fixtureIds);
}

export async function assertNoPublicJobs(page) {
  expect(jobsFixture.items, "the committed Jobs fixture must exclude sample/test records").toHaveLength(0);
  await expect(page.locator("#cards .jobs-card[data-id]")).toHaveCount(0);
  await expect(page.locator("#emptyBox")).toBeVisible();
  await expect(page.locator("#emptyBox")).toContainText("現在公開中の求人はありません");
  await expect(page.locator("#emptyBox").getByRole("link", { name: "求人を無料掲載する" })).toBeVisible();
  await expect(page.locator("#emptyBox").getByRole("link", { name: "ドイツで仕事を探すガイド" })).toBeVisible();
  await expect(page.locator("#jobsFilters")).toBeHidden();
  await expect(page.locator("#jobsViewToggle")).toBeHidden();
  await expect(page.locator("#jobsResultsControls")).toBeHidden();
  await expect(page.locator("#jobsDataUpdated")).toContainText("データ最終更新:");
}
