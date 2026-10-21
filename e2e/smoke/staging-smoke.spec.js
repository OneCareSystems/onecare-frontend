import { test, expect, request as playwrightRequest } from "@playwright/test";

// DDP-#49 / DKR-06 — staging smoke checks.
//
// Synthetic test data only (SDS §2.6.4.2); credentials come from the
// environment (CI secrets), never from the repo. No traces, videos or
// screenshots of successful runs — nothing with tokens or patient data
// may leave the runner.

const staffUser = process.env.SMOKE_STAFF_USERNAME;
const staffPass = process.env.SMOKE_STAFF_PASSWORD;

test.describe("staging smoke", () => {
  test("healthz responds from the frontend container", async ({ request }) => {
    const res = await request.get("/healthz");
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("ok");
  });

  test("runtime config is served and not cached", async ({ request }) => {
    const res = await request.get("/config.json");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("no-store");
    const body = await res.json();
    expect(typeof body.apiBaseUrl).toBe("string");
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /sign in|login/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("deep-link refresh renders the app (no server 404)", async ({
    page,
  }) => {
    // A protected deep link: unauthenticated it redirects to /login, but it
    // must be served by the SPA (client routing), not nginx's 404.
    const response = await page.goto("/doctor/today-schedule");
    expect(response.status()).toBe(200);
    await expect(page).toHaveURL(/\/login/);
  });

  test("unknown asset returns a real 404", async ({ request }) => {
    const res = await request.get("/assets/smoke-missing-123.js");
    expect(res.status()).toBe(404);
  });

  test("unknown deep link renders the in-app 404 page", async ({ page }) => {
    const response = await page.goto("/definitely/not/a/route");
    expect(response.status()).toBe(200);
    await expect(page.getByText(/404|not found/i).first()).toBeVisible();
  });

  test("staff login lands on the role dashboard and one protected API call succeeds", async ({
    page,
  }) => {
    test.skip(
      !staffUser || !staffPass,
      "SMOKE_STAFF_USERNAME/SMOKE_STAFF_PASSWORD not provided (CI secrets)",
    );

    await page.goto("/login");
    await page.getByLabel(/username/i).fill(staffUser);
    await page.getByLabel(/password/i).fill(staffPass);
    await page.getByRole("button", { name: /sign in|login/i }).click();

    // Staff landing page is a role dashboard (DDP-#43).
    await expect(page).toHaveURL(/\/(admin|doctor|pharmacist|super-admin)\//, {
      timeout: 15_000,
    });

    // One protected API call through the same-origin proxy succeeds.
    const apiContext = await playwrightRequest.newContext({
      baseURL: process.env.SMOKE_BASE_URL || "http://localhost:18080",
    });
    // Re-use the browser session cookie for the API call.
    const cookies = await page.context().cookies();
    await apiContext.addCookies(cookies);
    const me = await apiContext.get("/api/auth/me");
    expect(me.status()).toBe(200);
    await apiContext.dispose();
  });

  test("public booking page loads in English and Tamil", async ({ page }) => {
    // DDP-#48 delivers the public booking route; skip cleanly until then.
    const first = await page.goto("/booking");
    test.skip(
      first.status() !== 200 ||
        (await page.getByText(/404|not found/i).count()) > 0,
      "public booking route (DDP-#48) not deployed yet",
    );
    await expect(page.getByRole("heading").first()).toBeVisible();

    // Tamil: the public layout exposes a language switch; switch and confirm
    // the page still renders with lang="ta".
    const tamilToggle = page.getByRole("button", { name: /தமிழ்|tamil/i });
    if (await tamilToggle.count()) {
      await tamilToggle.first().click();
      await expect(page.locator("html")).toHaveAttribute("lang", /^ta/);
    }
  });
});
