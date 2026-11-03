import { defineConfig, devices } from "@playwright/test";

/**
 * DDP-#49 / DKR-06 — staging smoke suite.
 *
 * Runs against an already-deployed environment (SHA-tagged image behind the
 * prod-like Compose stack), NOT against a local dev server. Point it at
 * staging with SMOKE_BASE_URL; seeded staff credentials come from
 * environment variables — never from the repo:
 *
 *   SMOKE_BASE_URL=https://staging.example \
 *   SMOKE_STAFF_USERNAME=... SMOKE_STAFF_PASSWORD=... \
 *   npm run test:smoke
 *
 * Synthetic test data only (SDS §2.6.4.2). The suite never captures
 * credentials, tokens, traces with bodies, or patient data.
 */
export default defineConfig({
  testDir: "./e2e/smoke",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.SMOKE_BASE_URL || "http://localhost:18080",
    screenshot: "only-on-failure",
    // No traces/videos: smoke runs handle live (synthetic) credentials.
    trace: "off",
    video: "off",
  },

  projects: [
    {
      name: "smoke-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  // No webServer: the environment under test is already running.
});
