import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

for (const width of [360, 768, 1280]) {
  test(`ADM-01 totals, retry, shortcuts and accessibility at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    let invoiceCalls = 0;
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const send = (data) => route.fulfill({ json: { success: true, data } });
      if (url.pathname === "/api/auth/login")
        return send({
          accessToken: "fixture-token",
          role: "ADMIN",
          expiresIn: 1800,
          redirectUrl: "/admin/dashboard",
        });
      if (url.pathname === "/api/appointments") {
        const date = url.searchParams.get("date");
        return send(
          ["SCHEDULED", "ARRIVED", "COMPLETED", "NO_SHOW", "CANCELLED"].map(
            (status, i) => ({
              appointmentId: i + 1,
              patientId: 1,
              doctorId: 2,
              patientFullName: "PRIVATE_NAME",
              reason: "PRIVATE_REASON",
              clinicalNotes: "PRIVATE_NOTES",
              appointmentDate: date,
              timeSlot: "09:00:00",
              status,
            }),
          ),
        );
      }
      if (url.pathname === "/api/invoices") {
        expect(Object.fromEntries(url.searchParams)).toEqual({
          status: "UNPAID",
          page: "0",
          size: "1",
        });
        if (++invoiceCalls === 1)
          return route.fulfill({
            status: 500,
            json: { success: false, message: "Unavailable" },
          });
        return send({ content: [{}], totalElements: 137 });
      }
      if (url.pathname === "/api/users")
        return send({ content: [], totalPages: 0, number: 0 });
      return send([]);
    });
    await page.goto("/admin/dashboard");
    await page.getByLabel(/^Username/).fill("fixture-user");
    await page.getByLabel(/^Password/).fill("fixture-password");
    await page.getByRole("button", { name: /Sign in securely/i }).click();
    const started = Date.now();
    const summary = page.getByRole("region", {
      name: "Today's appointment summary",
    });
    await expect(
      summary.getByRole("heading", { name: "5", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Pending invoices");
    await page.getByRole("button", { name: "Retry pending invoices" }).click();
    await expect(
      page.getByRole("heading", { name: "137", exact: true }),
    ).toBeVisible();
    const elapsed = Date.now() - started;
    await testInfo.attach("mocked-dashboard-load", {
      body: JSON.stringify({
        width,
        millisecondsIncludingFailureAndRetry: elapsed,
        note: "Local browser with intercepted APIs; not live backend SLA evidence",
      }),
      contentType: "application/json",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator("body")).not.toContainText(
      /PRIVATE_NAME|PRIVATE_REASON|PRIVATE_NOTES/,
    );
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () =>
      (
        await window.axe.run(
          document.querySelector('section[aria-label="Admin Dashboard"]'),
          {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          },
        )
      ).violations.map(({ id, description }) => ({ id, description })),
    );
    expect(violations).toEqual([]);
    await page.screenshot({ path: `.playwright/adm01-dashboard-${width}.png`, fullPage: true });
    const actions = page.getByRole("region", { name: "Quick Actions" });
    const booking = actions.getByRole("link", { name: /Book Appointment/ });
    await booking.focus();
    await expect(booking).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/admin\/appointments\?booking=new$/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });
}
