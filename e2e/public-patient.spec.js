import { test, expect } from "@playwright/test";
import en from "../src/locales/en.json" with { type: "json" };
import ta from "../src/locales/ta.json" with { type: "json" };

const dictionaries = { en, ta };
const date = "2099-06-15";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/doctors", (route) =>
    route.fulfill({
      json: {
        data: [{ id: 7, name: "Dr Example", workingHours: "09:00–17:00" }],
      },
    }),
  );
  await page.route("**/api/doctors/7/available-slots?*", (route) =>
    route.fulfill({ json: ["09:00", "10:00"] }),
  );
  await page.route("**/api/appointments/public", (route) =>
    route.fulfill({ json: { data: { id: 12 } } }),
  );
});
async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width);
}
async function book(page, copy) {
  await page.goto("/appointments");
  await page.locator('[name="doctorId"]').selectOption("7");
  await page.locator('[name="firstName"]').fill("அருள்");
  await page.locator('[name="lastName"]').fill("குமார்");
  await page.locator('[name="phone"]').fill("0771234567");
  await page.locator('[name="dateOfBirth"]').fill("1995-02-20");
  await page.locator('[name="appointmentDate"]').fill(date);
  await page.locator('[name="slot"]').selectOption("09:00");
  await page
    .getByRole("button", { name: copy.booking.submit, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: copy.confirmation.title, exact: true }),
  ).toBeVisible();
}
for (const language of ["en", "ta"]) {
  for (const width of [360, 768, 1280]) {
    test(`${language} patient pages fit ${width}px`, async ({ page }) => {
      const copy = dictionaries[language];
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (lang) => localStorage.setItem("language", lang),
        language,
      );
      await page.goto("/home");
      await expect(
        page.getByRole("heading", { name: copy.publicLanding.welcome }),
      ).toBeVisible();
      const cta = page.getByRole("button", {
        name: copy.publicLanding.book,
        exact: true,
      });
      await expect(cta).toBeInViewport();
      await noOverflow(page);
      await page
        .getByRole("button", { name: copy.publicLanding.chatOpen, exact: true })
        .click();
      await expect(page.locator("onecare-chat-widget .chip")).toHaveCount(4);
      await expect(
        page.locator("onecare-chat-widget .chip").first(),
      ).toHaveText(copy.chatbot.chips[0].label);
      const panel = await page
        .locator("onecare-chat-widget .panel")
        .boundingBox();
      expect(panel.x).toBeGreaterThanOrEqual(0);
      expect(panel.x + panel.width).toBeLessThanOrEqual(width);
      await noOverflow(page);
      await page.goto("/appointments");
      await expect(
        page.getByRole("heading", { name: copy.booking.title, exact: true }),
      ).toBeVisible();
      await noOverflow(page);
      await book(page, copy);
      await noOverflow(page);
      await page.getByRole("link", { name: copy.confirmation.another }).click();
      await expect(page.locator('[name="firstName"]')).toHaveValue("");
      await expect(page.locator('[name="appointmentDate"]')).toHaveValue("");
      await page.goto("/unknown-patient-page");
      await expect(
        page.getByRole("heading", { name: copy.publicError.notFoundTitle }),
      ).toBeVisible();
      await noOverflow(page);
    });
  }
}
test("confirmation refresh and direct visits return to booking with a note", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("language", "en"));
  await book(page, en);
  await page.reload();
  await expect(page).toHaveURL(/\/appointments$/);
  await expect(page.getByText(en.booking.checkMessage)).toBeVisible();
  await page.goto("/appointments/confirmed");
  await expect(page).toHaveURL(/\/appointments$/);
  await expect(page.getByText(en.booking.checkMessage)).toBeVisible();
});
test("Tamil text remains Tamil across a live API failure", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("language", "ta"));
  await page.route("**/api/doctors", (route) =>
    route.fulfill({ status: 503, json: { message: "Raw backend error" } }),
  );
  await page.goto("/home");
  await expect(page.getByText(ta.publicLanding.doctorError)).toBeVisible();
  await expect(
    page.getByRole("button", { name: ta.publicLanding.retry }),
  ).toBeVisible();
  await expect(page.getByText(ta.publicLanding.hoursFallback)).toBeVisible();
  await expect(page.getByText("Raw backend error")).toHaveCount(0);
  await noOverflow(page);
});
