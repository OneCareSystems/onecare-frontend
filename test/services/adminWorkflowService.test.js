import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../../src/services/apiClient";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import * as api from "../../src/services/adminWorkflowService";
import {
  appointment,
  doctorPage,
  invoice,
  pageOf,
} from "../fixtures/adminWorkflows";
const ok = (data) => HttpResponse.json({ success: true, data });
beforeEach(() =>
  store.dispatch(setSession({ accessToken: "fixture-token", role: "ADMIN" })),
);
afterEach(() => {
  store.dispatch(clearSession());
  vi.restoreAllMocks();
});

describe("Admin contract adapters", () => {
  it("cancels both queue reads on one failure and respects an already aborted caller", async () => {
    const signals = [];
    vi.spyOn(apiClient, "get").mockImplementation((path, config) => {
      signals.push(config.signal);
      return path === "/queue/today"
        ? Promise.reject({ status: 429 })
        : new Promise(() => {});
    });
    await expect(api.adminQueue()).rejects.toMatchObject({ status: 429 });
    expect(signals).toHaveLength(2);
    expect(signals[0]).toBe(signals[1]);
    expect(signals[1].aborted).toBe(true);
    const controller = new AbortController();
    controller.abort();
    await expect(
      api.adminQueue({ signal: controller.signal }),
    ).rejects.toMatchObject({ status: 429 });
    expect(signals[2].aborted).toBe(true);
  });
  it("reads every doctor page and excludes inactive/non-doctor records and private fields", async () => {
    const calls = [];
    server.use(
      http.get("*/users", ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        calls.push(page);
        return ok(
          pageOf(
            page === 0
              ? [
                  ...doctorPage().content,
                  {
                    userId: 302,
                    username: "Other",
                    role: "ADMIN",
                    isActive: true,
                  },
                ]
              : [
                  { userId: 303, role: "DOCTOR", isActive: false },
                  { userId: 304, role: "DOCTOR", isActive: true },
                ],
            { number: page, totalPages: 2, last: page === 1 },
          ),
        );
      }),
    );
    expect(await api.listDoctors()).toEqual([
      { userId: "301", username: "Example Doctor" },
      { userId: "304", username: "Doctor 304" },
    ]);
    expect(calls).toEqual([0, 1]);
  });
  it("uses actual availability and appointment methods and exact create fields", async () => {
    const calls = [];
    server.use(
      http.get("*/appointments/available-slots", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("doctorId")).toBe("301");
        expect(url.searchParams.get("date")).toBe("2090-01-15");
        return ok(["16:00", "16:00", "16:30"]);
      }),
      http.post("*/appointments", async ({ request }) => {
        calls.push(await request.json());
        expect(request.headers.get("authorization")).toBe(
          "Bearer fixture-token",
        );
        return ok(appointment());
      }),
      http.put("*/appointments/201", async ({ request }) => {
        calls.push(await request.json());
        return ok(appointment({ timeSlot: "16:30:00" }));
      }),
      http.patch("*/appointments/201/cancel", () =>
        ok(appointment({ status: "CANCELLED" })),
      ),
    );
    expect(await api.availableSlots(301, "2090-01-15")).toEqual([
      "16:00",
      "16:30",
    ]);
    const result = await api.bookAppointment({
      patientId: 101,
      doctorId: 301,
      date: "2090-01-15",
      slot: "16:00",
      reason: "Visit",
      clinicalNotes: "CLINICAL_SECRET",
    });
    expect(result).not.toHaveProperty("clinicalNotes");
    expect(result).not.toHaveProperty("reason");
    await api.rescheduleAppointment(201, "2090-01-15", "16:30");
    expect((await api.cancelAppointment(201)).status).toBe("CANCELLED");
    expect(calls).toEqual([
      {
        doctorId: 301,
        patientId: 101,
        appointmentDateTime: "2090-01-15T16:00:00",
        reason: "Visit",
      },
      { appointmentDateTime: "2090-01-15T16:30:00" },
    ]);
  });
  it("filters appointment request fields and excludes clinical payloads", async () => {
    server.use(
      http.get("*/appointments", ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(Object.fromEntries(params)).toEqual({
          from: "2090-01-01",
          to: "2090-01-31",
          search: "Example",
        });
        return ok([appointment()]);
      }),
    );
    expect(
      (
        await api.listAdminAppointments({
          from: "2090-01-01",
          to: "2090-01-31",
          search: "Example",
          doctorId: 301,
          status: "ARRIVED",
        })
      )[0],
    ).not.toHaveProperty("clinicalNotes");
  });
  it("supplements today’s queue with no-shows but never makes up positions", async () => {
    server.use(
      http.get("*/queue/today", () => ok([appointment()])),
      http.get("*/appointments/today", () =>
        ok([
          appointment(),
          appointment({
            appointmentId: 202,
            status: "NO_SHOW",
            queuePosition: undefined,
          }),
        ]),
      ),
      http.patch("*/queue/201/status", async ({ request }) => {
        expect(await request.json()).toEqual({ status: "ARRIVED" });
        return ok(appointment({ status: "ARRIVED" }));
      }),
    );
    const rows = await api.adminQueue();
    expect(rows.map((a) => a.status)).toEqual(["SCHEDULED", "NO_SHOW"]);
    expect(rows[1].queuePosition).toBeNull();
    expect(rows[0]).not.toHaveProperty("reason");
    expect((await api.updateAdminQueue(201, "ARRIVED")).status).toBe("ARRIVED");
    await expect(api.updateAdminQueue(201, "COMPLETED")).rejects.toThrow();
  });
  it("preserves monetary JSON and allows only supported invoice filters", async () => {
    server.use(
      http.get("*/invoices", ({ request }) => {
        expect(new URL(request.url).searchParams.has("appointmentId")).toBe(
          false,
        );
        return new HttpResponse(
          '{"success":true,"data":{"content":[{"invoiceId":401,"invoiceNumber":"INV-TEST","patientId":null,"status":"UNPAID","total":9007199254740993.27,"amountPaid":0,"outstandingBalance":9007199254740993.27}],"number":0,"totalPages":1}}',
          { headers: { "Content-Type": "application/json" } },
        );
      }),
    );
    const page = await api.listInvoices({
      status: "UNPAID",
      page: 0,
      size: 20,
      appointmentId: 201,
    });
    expect(page.content[0].total).toBe("9007199254740993.27");
    expect(page.content[0].patientId).toBeNull();
  });
  it("uses complete medicine-line sets and exact cash decimal tokens, never a status update", async () => {
    let lineBody, paymentText;
    server.use(
      http.get("*/invoices/401", () => ok(invoice())),
      http.put("*/invoices/401", async ({ request }) => {
        lineBody = await request.json();
        return ok(invoice());
      }),
      http.post("*/invoices/401/payments", async ({ request }) => {
        paymentText = await request.text();
        return ok(
          invoice({ amountPaid: "0.10", outstandingBalance: "999.90" }),
        );
      }),
    );
    const detail = await api.getInvoice(401);
    expect(detail).not.toHaveProperty("clinicalNotes");
    await api.correctInvoice(401, [
      { invoiceItemId: 502, quantity: 2, unitPrice: "0.00", status: "PAID" },
    ]);
    expect(lineBody).toEqual({ items: [{ invoiceItemId: 502, quantity: 2 }] });
    expect((await api.payInvoice(401, "0.10")).amountPaid).toBe("0.10");
    expect(paymentText).toBe('{"amount":0.10,"paymentMethod":"CASH"}');
  });
  it("opens an existing automatic invoice across pages without generating another", async () => {
    let creates = 0;
    server.use(
      http.get("*/invoices", ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        return ok(
          pageOf(page === 0 ? [invoice({ appointmentId: 999 })] : [invoice()], {
            number: page,
            totalPages: 2,
          }),
        );
      }),
      http.get("*/invoices/401", () => ok(invoice())),
      http.post("*/invoices", () => {
        creates++;
        return ok(invoice());
      }),
    );
    expect(
      (
        await api.generateConsultationInvoice(
          appointment({ status: "COMPLETED" }),
        )
      ).invoiceId,
    ).toBe(401);
    expect(creates).toBe(0);
    await expect(
      api.generateConsultationInvoice(appointment()),
    ).rejects.toThrow(/completed/);
  });
  it("generates only a missing completed consultation invoice", async () => {
    server.use(
      http.get("*/invoices", () => ok(pageOf([], { totalPages: 0 }))),
      http.post("*/invoices", async ({ request }) => {
        expect(await request.json()).toEqual({ appointmentId: 201 });
        return ok(invoice());
      }),
    );
    expect(
      (
        await api.generateConsultationInvoice(
          appointment({ status: "COMPLETED" }),
        )
      ).status,
    ).toBe("UNPAID");
  });
  it("rejects malformed envelopes and shapes instead of rendering raw records", async () => {
    server.use(
      http.get("*/users", () => ok([])),
      http.get("*/appointments/available-slots", () => ok(["bad"])),
      http.get("*/appointments", () => ok({ records: [] })),
      http.get("*/invoices", () => ok([])),
    );
    await expect(api.listDoctors()).rejects.toThrow();
    await expect(api.availableSlots(301, "2090-01-15")).rejects.toThrow();
    await expect(api.listAdminAppointments()).rejects.toThrow();
    await expect(api.listInvoices()).rejects.toThrow();
    expect(() =>
      api.appointmentView(appointment({ status: "WAITING" })),
    ).toThrow();
    expect(() => api.invoiceView(invoice({ status: "PENDING" }))).toThrow();
    expect(() => api.invoiceView(invoice({ items: null }), true)).toThrow();
    server.use(
      http.get("*/invoices/401", () =>
        HttpResponse.json({ success: false, data: null }),
      ),
    );
    await expect(api.getInvoice(401)).rejects.toThrow();
  });
  it.each([400, 403, 404, 409, 422, 500])(
    "surfaces HTTP %s without replacing the session",
    async (status) => {
      server.use(
        http.post("*/appointments", () => new HttpResponse(null, { status })),
      );
      await expect(
        api.bookAppointment({
          patientId: 101,
          doctorId: 301,
          date: "2090-01-15",
          slot: "16:00",
        }),
      ).rejects.toMatchObject({ status });
      expect(store.getState().auth.role).toBe("ADMIN");
    },
  );
});
