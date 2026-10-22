import { test, expect } from "@playwright/test";

for (const role of ["ADMIN", "SUPER_ADMIN"]) {
  test(`${role} keeps its own dashboard, navigation and patient permissions`, async ({
    page,
  }) => {
    const group = role === "ADMIN" ? "admin" : "super-admin";
    const dashboard = `/${group}/dashboard`;
    const heading =
      role === "ADMIN" ? "AdminDashboardPage" : "SuperAdminDashboardPage";
    let patientRequests = 0;
    await page.route("**/api/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.startsWith("/api/patients")) patientRequests++;
      await route.fulfill({
        json: {
          success: true,
          data:
            pathname === "/api/auth/login"
              ? {
                  accessToken: "fixture-token",
                  refreshToken: "fixture-refresh",
                  role,
                  expiresIn: 1800,
                  redirectUrl: dashboard,
                }
              : [],
        },
      });
    });
    await page.goto(dashboard);
    await page.getByLabel(/^Username/).fill("fixture-user");
    await page.getByLabel(/^Password/).fill("fixture-password");
    await page.getByRole("button", { name: /Sign in securely/i }).click();
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    if (role === "SUPER_ADMIN") {
      await expect(
        nav.getByRole("link", { name: "Register Patient" }),
      ).toHaveCount(0);
      await expect(
        nav.getByRole("link", { name: "Patient Search" }),
      ).toHaveCount(0);
      await expect(
        page.getByText("FAMILY CLINIC", { exact: true }),
      ).toHaveCount(0);
      for (const path of [
        "/admin/register-patient",
        "/admin/patient-search",
        "/admin/dashboard",
      ]) {
        await page.goto(path);
        await expect(page).toHaveURL(new RegExp(`${dashboard}$`));
        await expect(
          page.getByRole("heading", { name: heading, exact: true }),
        ).toBeVisible();
      }
      expect(patientRequests).toBe(0);
    } else {
      for (const [label, title] of [
        ["Register Patient", "Register New Patient"],
        ["Patient Search", "Search Patients"],
      ]) {
        await nav.getByRole("link", { name: label, exact: true }).click();
        await expect(
          page.getByRole("heading", { name: title, exact: true }),
        ).toBeVisible();
      }
      await page.goto("/super-admin/dashboard");
      await expect(page).toHaveURL(new RegExp(`${dashboard}$`));
    }
    await nav.getByRole("link", { name: "Queue", exact: true }).click();
    if (role === "SUPER_ADMIN") {
      await page.getByRole("button", { name: "Home", exact: true }).click();
    } else {
      await nav.getByRole("link", { name: "Dashboard", exact: true }).click();
    }
    await expect(page).toHaveURL(new RegExp(`${dashboard}$`));
    for (const path of [
      "/super-admin/register-patient",
      "/super-admin/patient-search",
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { name: /page not found/i }),
      ).toBeVisible();
    }
  });
}
