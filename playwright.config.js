
import { defineConfig, devices } from "@playwright/test";

/**
 * CFG-07 — real-browser viewport tests (AC1/AC3/AC4).
 * jsdom cannot verify layout overflow, so the responsive and keyboard
 * guarantees are proven in Chromium at the 360 px minimum width
 * (NFRU-004). The dev server is started automatically via `webServer`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never" }],
      ]
    : [
        ["list"],
        ["html", { open: "never" }],
      ],

  use: {
    baseURL: "http://localhost:5173",

    // Capture screenshots when tests fail.
    screenshot: "only-on-failure",

    // Retain traces when a test fails after a retry.
    trace: "on-first-retry",

    // Uncomment to capture screenshots for both passed and failed tests.
    // screenshot: "on",
  },

  projects: [
    {
      name: "chromium-360px",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 740 },
      },
    },
  ],

  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,

    // Same-origin API base so page.route() mocks need no CORS preflight.
    env: { ...process.env, VITE_API_BASE_URL: "/api" },
  },
});
