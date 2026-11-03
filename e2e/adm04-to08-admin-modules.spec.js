import { test, expect } from "@playwright/test";
import {
  appointment,
  doctorPage,
  invoice,
  pageOf,
} from "../test/fixtures/adminWorkflows.js";

test.use({ trace: "off", screenshot: "off", video: "off" });
for (const width of [360, 768, 1280]) {
  test(`Admin booking, hub, queue, cash billing and live report mapping at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 360 ? 640 : 900 });
    await page.addInitScript(() => {
      window.print = () => {
        window.__invoicePrinted = true;
      };
    });
    let appointments = [
      appointment(),
      appointment({ appointmentId: 202, status: "COMPLETED" }),
      appointment({ appointmentId: 203, status: "NO_SHOW" }),
      appointment({ appointmentId: 205 }),
    ];
    let available = ["16:00", "16:30"],
      bookings = 0,
      payments = 0,
      reports = 0;
    let bill = invoice();
    await page.route("**/api/**", async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        path = url.pathname,
        method = request.method();
      const send = (data, status = 200) =>
        route.fulfill({ status, json: { success: true, data } });
      if (path === "/api/auth/login")
        return send({
          accessToken: "fixture-access",
          refreshToken: "fixture-refresh",
          role: "ADMIN",
          expiresIn: 1800,
          redirectUrl: "/admin/dashboard",
        });
      if (path === "/api/users") return send(doctorPage());
      if (path === "/api/patients")
        return send(
          [101, 102].map((patientId) => ({
            patientId,
            fullName: `Example ${patientId}`,
            contactNo: "+94 771 234 567",
            dateOfBirth: "1990-01-15",
          })),
        );
      if (path === "/api/appointments/available-slots") return send(available);
      if (path === "/api/appointments" && method === "POST") {
        const body = request.postDataJSON();
        expect(body.patientId).toBe(102);
        expect(body.doctorId).toBe(301);
        expect(Object.hasOwn(body, "clinicalNotes")).toBe(false);
        bookings++;
        if (bookings === 1) {
          available = ["17:00"];
          return route.fulfill({
            status: 409,
            json: {
              success: false,
              data: { alternativeSlots: ["2090-01-15T17:00"] },
            },
          });
        }
        expect(body.appointmentDateTime).toBe("2090-01-15T17:00:00");
        const result = appointment({
          appointmentId: 204,
          patientId: 102,
          timeSlot: "17:00:00",
        });
        appointments.push(result);
        available = ["18:00"];
        return send(result, 201);
      }
      if (path === "/api/appointments" || path === "/api/appointments/today")
        return send(appointments);
      if (path === "/api/appointments/204" && method === "PUT") {
        expect(request.postDataJSON()).toEqual({
          appointmentDateTime: "2090-01-15T18:00:00",
        });
        appointments = appointments.map((a) =>
          a.appointmentId === 204 ? { ...a, timeSlot: "18:30:00" } : a,
        );
        return send(appointments.find((a) => a.appointmentId === 204));
      }
      if (path === "/api/appointments/201/cancel" && method === "PATCH") {
        appointments = appointments.map((a) =>
          a.appointmentId === 201 ? { ...a, status: "CANCELLED" } : a,
        );
        return send(appointments[0]);
      }
      if (path === "/api/queue/today")
        return send(
          appointments
            .filter((a) => !["CANCELLED", "NO_SHOW"].includes(a.status))
            .map((a, index) => ({ ...a, queuePosition: index + 1 })),
        );
      if (/^\/api\/queue\/\d+\/status$/.test(path) && method === "PATCH") {
        const id = Number(path.split("/")[3]),
          body = request.postDataJSON();
        expect(["ARRIVED", "NO_SHOW"]).toContain(body.status);
        appointments = appointments.map((a) =>
          a.appointmentId === id ? { ...a, status: body.status } : a,
        );
        return send(appointments.find((a) => a.appointmentId === id));
      }
      if (path === "/api/invoices") return send(pageOf([bill]));
      if (path === "/api/invoices/401") return send(bill);
      if (path === "/api/invoices/401/payments" && method === "POST") {
        payments++;
        expect(request.postDataJSON()).toEqual({
          amount: payments === 1 ? 200 : 800,
          paymentMethod: "CASH",
        });
        bill = invoice(
          payments === 1
            ? { amountPaid: "200.00", outstandingBalance: "800.00" }
            : {
                status: "PAID",
                amountPaid: "1000.00",
                outstandingBalance: "0.00",
              },
        );
        bill.payments = [
          {
            paymentId: 701,
            amount: "200.00",
            paymentMethod: "CASH",
            paidAt: "2090-01-15T16:01:00",
          },
        ];
        if (payments === 2)
          bill.payments.push({
            paymentId: 702,
            amount: "800.00",
            paymentMethod: "CASH",
            paidAt: "2090-01-15T16:02:00",
          });
        return send(bill, 201);
      }
      if (path === "/api/reports/clinic") {
        reports++;
        return send({
          from: url.searchParams.get("from"),
          to: url.searchParams.get("to"),
          doctorId: url.searchParams.has("doctorId")
            ? Number(url.searchParams.get("doctorId"))
            : null,
          totalAppointments: 9,
          consultationCount: 4,
          scheduled: 2,
          arrived: 1,
          completed: 4,
          cancelled: 1,
          noShow: 1,
          uniquePatients: 2,
          generatedAt: "2026-10-24T10:30:00",
        });
      }
      return send([]);
    });
    const noOverflow = async () =>
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await page.goto("/admin/book-appointment");
    await page.getByLabel(/^Username/).fill("fixture-user");
    await page.getByLabel(/^Password/).fill("fixture-password");
    await page.getByRole("button", { name: "Sign in securely" }).click();
    await expect(page).toHaveURL(/\/admin\/appointments\?booking=new/);
    await expect(
      nav.getByRole("link", { name: "Book Appointment", exact: true }),
    ).toHaveCount(0);
    const booking = page.getByRole("dialog", {
      name: "Book Appointment",
      exact: true,
    });
    const bookingButton = page.getByRole("button", {
      name: "+ Book Appointment",
      exact: true,
    });
    const close = booking.getByRole("button", { name: "Close booking" });
    await expect(
      booking.getByRole("combobox", { name: "Doctor", exact: true }),
    ).toHaveValue("Example Doctor");
    const modalBounds = await booking.boundingBox();
    expect(modalBounds.x).toBeGreaterThanOrEqual(0);
    expect(modalBounds.y).toBeGreaterThanOrEqual(0);
    expect(modalBounds.y + modalBounds.height).toBeLessThanOrEqual(
      page.viewportSize().height,
    );
    await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    const violations = await booking.evaluate(async (dialog) => {
      const results = await window.axe.run(dialog, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      });
      return results.violations.map(({ id, impact }) => ({ id, impact }));
    });
    expect(violations).toEqual([]);
    await close.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(
      booking.getByRole("button", { name: "Book Appointment", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(booking).toHaveCount(0);
    await expect(bookingButton).toBeFocused();
    expect(bookings).toBe(0);
    await bookingButton.click();
    await booking
      .getByRole("combobox", { name: "Patient", exact: true })
      .click();
    await booking
      .getByRole("combobox", { name: "Patient", exact: true })
      .fill("Example");
    await expect(booking.getByRole("option")).toHaveCount(2);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(
      booking.getByRole("combobox", { name: "Patient", exact: true }),
    ).toHaveValue(/Clinic ID: 102/);
    await expect(
      booking.getByRole("combobox", { name: "Doctor", exact: true }),
    ).toHaveValue("Example Doctor");
    await page.getByLabel(/^Appointment Date/).fill("2090-01-15");
    await page.getByRole("button", { name: "16:00", exact: true }).click();
    await page.getByLabel("Reason for visit (optional)").fill("Visit");
    await noOverflow();
    if (width === 1280)
      await page.screenshot({ path: testInfo.outputPath("booking.png") });
    await page
      .getByRole("button", { name: "Book Appointment", exact: true })
      .click();
    await expect(page.getByText(/Previously selected: 16:00/)).toBeVisible();
    await expect(page.getByLabel("Reason for visit (optional)")).toHaveValue(
      "Visit",
    );
    await page.getByRole("button", { name: "17:00", exact: true }).click();
    await page
      .getByRole("button", { name: "Book Appointment", exact: true })
      .click();
    await expect(page.getByText(/Appointment 204 booked/)).toBeVisible();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(bookingButton).toBeFocused();
    await page
      .getByRole("button", { name: "Reschedule appointment 204" })
      .click();
    await page.getByRole("button", { name: "18:00", exact: true }).click();
    await page.getByRole("button", { name: "Review reschedule" }).click();
    await page
      .getByRole("button", { name: "Confirm reschedule", exact: true })
      .click();
    await expect(page.getByText(/18:30:00 — Scheduled/)).toBeVisible();
    await page.getByRole("button", { name: "Cancel appointment 201" }).click();
    await page.getByRole("button", { name: "Confirm cancellation" }).click();
    await expect(page.getByText(/— Cancelled/)).toBeVisible();
    await noOverflow();
    if (width === 1280)
      await page.screenshot({ path: testInfo.outputPath("hub.png") });
    await nav.getByRole("link", { name: "Queue", exact: true }).click();
    await page
      .getByRole("button", { name: "Check in appointment 204" })
      .click();
    await expect(page.getByText("Appointment 204: Arrived.")).toBeVisible();
    appointments = appointments.map((a) =>
      a.appointmentId === 204 ? { ...a, status: "COMPLETED" } : a,
    );
    const changedRow = page
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: "204", exact: true }) });
    await expect(
      changedRow.getByText("Completed", { exact: true }),
    ).toBeVisible({ timeout: 8000 });
    await page
      .getByRole("button", { name: "Mark appointment 205 no-show" })
      .click();
    await page.getByRole("button", { name: "Confirm no-show" }).click();
    await expect(page.getByText("Appointment 205: No-show.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Complete appointment/ }),
    ).toHaveCount(0);
    await noOverflow();
    if (width === 1280)
      await page.screenshot({ path: testInfo.outputPath("queue.png") });
    await nav.getByRole("link", { name: "Billing", exact: true }).click();
    await page
      .getByRole("button", { name: "View invoice INV-2090-000401" })
      .click();
    await page.getByLabel("Cash amount (LKR)").fill("200.00");
    await page.getByRole("button", { name: "Review cash payment" }).click();
    await page
      .getByRole("button", { name: "Record cash payment", exact: true })
      .click();
    await expect(page.getByText("Amount due: LKR 800.00")).toBeVisible();
    await page.getByLabel("Cash amount (LKR)").fill("800.00");
    await page.getByRole("button", { name: "Review cash payment" }).click();
    await page
      .getByRole("button", { name: "Record cash payment", exact: true })
      .click();
    await expect(
      page.getByText(/Paid invoice: line items and payments are locked/),
    ).toBeVisible();
    expect(payments).toBe(2);
    await expect(
      page.getByRole("cell", { name: "LKR 200.00", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "LKR 800.00", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Cash amount (LKR)")).toHaveCount(0);
    await expect(page.getByText("CLINICAL_SECRET")).toHaveCount(0);
    await noOverflow();
    await page.getByRole("button", { name: "Print invoice" }).click();
    expect(await page.evaluate(() => window.__invoicePrinted)).toBe(true);
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("banner")).toBeHidden();
    await page.emulateMedia({ media: "screen" });
    if (width === 1280)
      await page.screenshot({ path: testInfo.outputPath("billing.png") });
    await nav
      .getByRole("link", { name: "Clinic Reports", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Export CSV" }),
    ).toBeDisabled();
    expect(reports).toBe(0);
    await page.getByLabel("Report from date").fill("2026-10-01");
    await page.getByLabel("Report to date").fill("2026-10-24");
    await page.getByLabel("Report doctor").selectOption("301");
    await page.getByRole("button", { name: "Generate report" }).click();
    await expect(
      page.getByRole("img", { name: /Appointments by status/ }),
    ).toBeVisible();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(6);
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe(
      "onecare-clinic-report-2026-10-01-to-2026-10-24-doctor-301.csv",
    );
    expect(reports).toBe(1);
    await noOverflow();
    if (width === 1280)
      await page.screenshot({ path: testInfo.outputPath("reports.png") });
  });
}
