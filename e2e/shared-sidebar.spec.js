import { test, expect } from "@playwright/test";

for (const [role, group] of [
  ["ADMIN", "admin"],
  ["DOCTOR", "doctor"],
  ["PHARMACIST", "pharmacist"],
  ["SUPER_ADMIN", "super-admin"],
]) {
  for (const width of [360, 900, 1280]) {
    test(`${role} sidebar gradient and orientation at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.route("**/api/**", (route) =>
        route.fulfill({ json: { success: true, data: [] } }),
      );
      await page.route("**/api/auth/login", (route) =>
        route.fulfill({
          json: {
            success: true,
            data: {
              username: "example-staff",
              accessToken: "synthetic-token",
              refreshToken: "synthetic-refresh",
              expiresIn: 1800000,
              role,
              redirectUrl: `/${group}/dashboard`,
            },
          },
        }),
      );
      await page.goto("/login");
      await page.locator('input[name="username"]').fill("example-staff");
      await page.locator('input[name="password"]').fill("synthetic-password");
      await page.getByRole("button", { name: "Sign in securely" }).click();
      await page.waitForURL(`**/${group}/dashboard`);
      const sidebar = page.getByRole("navigation", { name: "Main navigation" });
      const active = sidebar.getByRole("link", {
        name: "Dashboard",
        exact: true,
      });
      await expect(active).toHaveAttribute("aria-current", "page");
      await expect(active).toHaveCSS("color", "rgb(255, 255, 255)");
      expect(
        await active.evaluate(
          (element) => getComputedStyle(element).backgroundImage,
        ),
      ).toContain("linear-gradient");
      await expect(sidebar.locator("ul")).toHaveCSS(
        "flex-direction",
        width < 1024 ? "row" : "column",
      );
      if (width < 1024)
        await expect(sidebar.locator("ul")).toHaveCSS("overflow-x", "auto");
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    });
  }
}
