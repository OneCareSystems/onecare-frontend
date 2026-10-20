import { test, expect } from "@playwright/test";

// This suite uses synthetic accounts/patients only. Never capture browser state,
// traces, screenshots, request bodies, or headers in test artifacts.
test.use({
  channel: process.env.PLAYWRIGHT_CHANNEL,
  trace: "off",
  screenshot: "off",
  video: "off",
});

const access = "fixture-access";
const fresh = "fixture-fresh-access";
const refresh = "fixture-refresh";
const cases = [
  { name: "ADMIN success", role: "ADMIN", status: 201 },
  { name: "SUPER_ADMIN success", role: "SUPER_ADMIN", status: 201 },
  { name: "expired access refreshes successfully", expired: true, status: 201 },
  ...[400, 403, 404, 409, 500, "network"].flatMap((status) => [
    { name: `direct ${status}`, status },
    { name: `retry ${status}`, expired: true, status },
  ]),
  ...[429, 500, "network"].map((refreshStatus) => ({
    name: `temporary refresh ${refreshStatus}`,
    expired: true,
    refreshStatus,
  })),
  { name: "invalid refresh", expired: true, refreshStatus: 401, logout: true },
  { name: "retry unauthorized", expired: true, status: 401, logout: true },
];

for (const scenario of cases) {
  test(`ADM-02 session: ${scenario.name}`, async ({ page }, testInfo) => {
    const role = scenario.role ?? "ADMIN";
    const registration =
      role === "ADMIN"
        ? "/admin/register-patient"
        : "";
    const summary = [];
    let patientPosts = 0,
      refreshPosts = 0,
      pageErrors = 0,
      consoleErrors = 0;
    page.on("pageerror", () => {
      pageErrors++;
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors++;
    });
    page.on("response", (response) => {
      const path = new URL(response.url()).pathname;
      if (path.startsWith("/api/"))
        summary.push({
          method: response.request().method(),
          path,
          status: response.status(),
        });
    });
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path === "/api/auth/login") {
        await route.fulfill({
          json: {
            success: true,
            data: {
              accessToken: access,
              refreshToken: refresh,
              expiresIn: 1800000,
              role,
              redirectUrl:
                role === "ADMIN"
                  ? "/admin/dashboard"
                  : "/super-admin/dashboard",
            },
          },
        });
        return;
      }
      if (path === "/api/auth/refresh") {
        refreshPosts++;
        expect(
          !request.headers().authorization &&
            request.postDataJSON().refreshToken === refresh,
        ).toBe(true);
        if (scenario.refreshStatus === "network") {
          await route.abort("connectionrefused");
        } else if (scenario.refreshStatus) {
          await route.fulfill({
            status: scenario.refreshStatus,
            json: { success: false, data: null },
          });
        } else {
          await route.fulfill({
            json: {
              success: true,
              data: { accessToken: fresh, expiresIn: 1800000 },
            },
          });
        }
        return;
      }
      if (path === "/api/patients") {
        patientPosts++;
        const expected = patientPosts === 1 ? access : fresh;
        expect(
          request.method() === "POST" &&
            request.headers().authorization === `Bearer ${expected}`,
        ).toBe(true);
        const status =
          scenario.expired && patientPosts === 1 ? 401 : scenario.status;
        if (status === "network") {
          summary.push({ method: "POST", path, status: "network-failure" });
          await route.abort("connectionrefused");
        } else {
          await route.fulfill({
            status,
            json:
              status === 201
                ? {
                    success: true,
                    data: { patientId: 101, fullName: "Synthetic Patient" },
                  }
                : {
                    success: false,
                    data:
                      status === 400
                        ? [
                            {
                              field: "contactNo",
                              message: "Check phone number",
                            },
                          ]
                        : null,
                  },
          });
        }
        return;
      }
      await route.fulfill({
        status: 404,
        json: { success: false, data: null },
      });
    });

    await page.goto(registration);
    await page.getByLabel(/^Username/).fill("fixture-user");
    await page.getByLabel(/^Password/).fill("fixture-password");
    await page.getByRole("button", { name: /Sign in securely/i }).click();
    await expect(
      page.getByRole("heading", { name: "Register New Patient" }),
    ).toBeVisible();
    if (!scenario.expired && scenario.status === 201) {
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Register New Patient" }),
      ).toBeVisible();
    }
    await page.getByLabel("Full Name").fill("Synthetic Patient");
    await page.getByLabel("Phone Number").fill("fixture-phone");
    await page.getByLabel("Date of Birth").fill("1990-01-15");
    await page.getByRole("button", { name: "Save Patient" }).click();

    if (scenario.logout) {
      await expect(page).toHaveURL(/\/login\?reason=session-expired$/);
      await expect(
        page.getByText("Your session has expired. Please sign in again."),
      ).toBeVisible();
    } else if (scenario.status === 201 && !scenario.refreshStatus) {
      await expect(page.getByRole("status")).toContainText(
        "Patient registered successfully",
      );
    } else {
      await expect(page.getByRole("alert").first()).toBeVisible();
      if (scenario.refreshStatus) {
        await expect(page.getByRole("alert").first()).toHaveText(
          "Unable to refresh your session. Please try again shortly.",
        );
      }
      await expect(page).toHaveURL(new RegExp(`${registration}$`));
      expect(
        (await page.getByLabel("Full Name").inputValue()) ===
          "Synthetic Patient",
      ).toBe(true);
      expect(
        (await page.getByLabel("Phone Number").inputValue()) ===
          "fixture-phone",
      ).toBe(true);
      expect(
        (await page.getByLabel("Date of Birth").inputValue()) === "1990-01-15",
      ).toBe(true);
      await expect(page.getByText(/session has expired/i)).toHaveCount(0);
    }
    expect(refreshPosts).toBe(scenario.expired ? 1 : 0);
    expect(patientPosts).toBe(
      scenario.expired && !scenario.refreshStatus ? 2 : 1,
    );
    expect(pageErrors).toBe(0);
    await testInfo.attach("request-summary", {
      contentType: "application/json",
      body: JSON.stringify({ requests: summary, pageErrors, consoleErrors }),
    });
  });
}
