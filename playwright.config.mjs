import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./scripts/browser-tests",
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || path.join(os.tmpdir(), "j-connect-playwright-results"),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  timeout: 30_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL,
    browserName: "chromium",
    locale: "ja-JP",
    timezoneId: "Europe/Berlin",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "node scripts/browser-tests/build-and-serve.mjs",
    env: {
      ...process.env,
      PORT: String(port)
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  },
  projects: [
    {
      name: "desktop-chromium",
      testMatch: /desktop\.spec\.mjs/,
      use: {
        viewport: { width: 1440, height: 1000 }
      }
    },
    {
      name: "mobile-chromium",
      testMatch: /mobile\.spec\.mjs/,
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
      }
    }
  ]
});
