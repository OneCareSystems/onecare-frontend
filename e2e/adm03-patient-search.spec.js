import { test, expect } from "@playwright/test";
test.use({
  channel: process.env.PLAYWRIGHT_CHANNEL,
  trace: "off",
  screenshot: "off",
  video: "off",
});
for (const role of ["ADMIN", "SUPER_ADMIN"]) {
  for (const width of [360, 1280]) {
    test(`ADM-03 ${role} at ${width}px: search, safe edit and consistent navigation`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      const group = role === "ADMIN" ? "admin" : "super-admin";
      const patients = [101, 102].map((patientId) => ({
        patientId,
        fullName: `Example ${patientId}`,
        contactNo: "+94 771 234 567",
        dateOfBirth: "1990-01-15",
        gender: "OTHER",
        isActive: true,
        email: "",
        address: "",
        bloodGroup: "A+",
        clinicalNotes: "CLINICAL_SECRET",
      }));
      let updateCount = 0;
      await page.route("**/api/**", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (url.pathname === "/api/auth/login")
          return route.fulfill({
            json: {
              success: true,
              data: {
                username: "example-admin",
                accessToken: "synthetic-token",
                refreshToken: "synthetic-refresh",
                expiresIn: 1800000,
                role,
                redirectUrl: `/${group}/dashboard`,
              },
            },
          });
        if (url.pathname === "/api/patients" && request.method() === "GET") {
          expect(
            request.headers().authorization === "Bearer synthetic-token",
          ).toBe(true);
          const term = url.searchParams.get("search");
          return route.fulfill({
            json: { success: true, data: term === "missing" ? [] : patients },
          });
        }
        if (url.pathname === "/api/patients/102") {
          if (request.method() === "PUT") {
            const body = request.postDataJSON();
            expect(body).toEqual({ full_name: "Updated Example" });
            expect(Object.hasOwn(body, "bloodGroup")).toBe(false);
            patients[1].fullName = body.full_name;
            updateCount++;
          }
          return route.fulfill({ json: { success: true, data: patients[1] } });
        }
        return route.fulfill({ json: { success: true, data: [] } });
      });
      await page.goto(`/${group}/patient-search`);
      await page.locator('input[name="username"]').fill("example-admin");
      await page.locator('input[name="password"]').fill("synthetic-password");
      await page.getByRole("button", { name: "Sign in securely" }).click();
      await expect(
        page.getByRole("heading", { name: "Search Patients" }),
      ).toBeVisible();
      await expect(page.getByLabel("Search by")).toHaveValue("name");
      await expect(
        page.getByLabel("Search by").getByRole("option"),
      ).toHaveCount(3);
      if (width === 1280) {
        await page.getByLabel("Search by").focus();
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
      } else {
        await page.getByLabel("Search by").selectOption("phone");
      }
      await expect(page.getByLabel("Search by")).toHaveValue("phone");
      await page.getByRole("searchbox").fill("Sarah");
      await expect(page.getByRole("searchbox")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      await expect(page.getByRole("alert")).toContainText("phone number");
      await page.getByRole("searchbox").fill("0771234567");
      await expect(
        page.getByRole("button", { name: "Edit patient 102" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Edit patient 102" }),
      ).toHaveCSS("background-color", "rgb(30, 64, 175)");
      await expect(
        page.getByRole("button", { name: "Edit patient 102" }),
      ).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(page.getByTestId("admin-avatar")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Edit patient 101" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Edit patient 102" }).click();
      await expect(page.getByLabel("Clinic ID (read-only)")).toHaveValue("102");
      await expect(
        page.getByLabel("Date of Birth (read-only)"),
      ).toHaveAttribute("readonly", "");
      await expect(page.getByLabel("Clinic ID (read-only)")).toHaveAttribute(
        "readonly",
        "",
      );
      await expect(page.getByText("CLINICAL_SECRET")).toHaveCount(0);
      await expect(page.getByLabel(/Blood Group/)).toHaveCount(0);
      await page.getByLabel("Full Name").fill(" ");
      await page.getByRole("button", { name: "Update Patient" }).click();
      await expect(page.getByLabel("Full Name")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      await expect(page.getByRole("alert")).toContainText(/required/i);
      expect(updateCount).toBe(0);
      await page.getByLabel("Full Name").fill("Updated Example");
      await page.getByRole("button", { name: "Update Patient" }).click();
      await expect(
        page.getByText("Patient updated successfully."),
      ).toBeVisible();
      expect(updateCount).toBe(1);
      expect(patients[1].bloodGroup).toBe("A+");
      await expect(
        page.getByRole("cell", { name: "Updated Example" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await page.getByRole("banner").evaluate((element) => {
        element.dataset.testPersist = "yes";
      });
      const nav = page.getByRole("navigation", { name: "Main navigation" });
      for (const name of [
        "Dashboard",
        "Register Patient",
        "Queue",
        "Patient Search",
      ]) {
        const link = nav.getByRole("link", { name, exact: true });
        await link.scrollIntoViewIfNeeded();
        await link.click();
        await expect(link).toHaveAttribute("aria-current", "page");
        await expect(page.getByRole("banner")).toHaveAttribute(
          "data-test-persist",
          "yes",
        );
        await expect(
          page.getByText("FAMILY CLINIC", { exact: true }),
        ).toHaveCount(1);
        await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(
          1,
        );
        await expect(page.getByTestId("admin-avatar")).toBeVisible();
      }
      await page.getByRole("searchbox").fill("missing");
      await expect(
        page.getByText("No patient found matching the search criteria."),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Register Patient", exact: true })
        .click();
      await expect(page.getByLabel("Blood Group (Optional)")).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/${group}/register-patient$`));
    });
  }
}
