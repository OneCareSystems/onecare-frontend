import { test, expect } from "@playwright/test";

for (const width of [360, 1280]) {
  test(`ADM-02 registration and layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: {
            username: "example-admin",
            accessToken: "synthetic-token",
            refreshToken: "synthetic-refresh",
            expiresIn: 1800000,
            role: "ADMIN",
            redirectUrl: "/admin/dashboard",
          },
        },
      }),
    );
    let requests = 0;
    await page.route("**/api/patients", async (route) => {
      requests++;
      expect(route.request().headers().authorization).toBe(
        "Bearer synthetic-token",
      );
      expect(route.request().postDataJSON()).toEqual({
        full_name: "Example Patient",
        contactNo: "shared-phone",
        dateOfBirth: "1990-01-15",
        address: null,
        email: null,
        gender: null,
        bloodGroup: null,
      });
      await route.fulfill({
        status: 201,
        json: {
          success: true,
          data: {
            patientId: 101,
            fullName: "Example Patient",
            duplicateSuspected: true,
            bloodGroup: "CLINICAL_SECRET",
          },
        },
      });
    });
    await page.goto("/admin/register-patient");
    await page.locator('input[name="username"]').fill("example-admin");
    await page.locator('input[name="password"]').fill("synthetic-password");
    await page.getByRole("button", { name: "Sign in securely" }).click();
    await expect(
      page.getByRole("heading", { name: "Register New Patient" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save Patient" }).click();
    await expect(page.getByText("Full name is required.")).toBeVisible();
    await page.getByLabel("Full Name").fill("Example Patient");
    await page.getByLabel("Phone Number").fill("shared-phone");
    await page.getByLabel("Date of Birth").fill("1990-01-15");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const nameBox = await page.getByLabel("Full Name").boundingBox();
    const phoneBox = await page.getByLabel("Phone Number").boundingBox();
    if (width === 360) expect(phoneBox.y).toBeGreaterThan(nameBox.y);
    else expect(phoneBox.y).toBe(nameBox.y);
    await page.screenshot({
      path: `test-results/adm02-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Save Patient" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Patient ID: 101" }),
    ).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "already been saved" }),
    ).toBeVisible();
    await expect(page.getByText("CLINICAL_SECRET")).toHaveCount(0);
    expect(requests).toBe(1);
  });
}
