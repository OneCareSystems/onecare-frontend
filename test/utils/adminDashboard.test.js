import { describe, expect, it } from "vitest";
import {
  appointmentCounts,
  pendingInvoiceCount,
} from "../../src/utils/adminDashboard";
import { clinicToday } from "../../src/utils/clinicTime";
import { statusLabel } from "../../src/utils/adminWorkflows";

const date = "2026-10-24";
const row = { appointmentId: 1, appointmentDate: date, status: "SCHEDULED" };
describe("ADM-01 aggregate contracts", () => {
  it("counts all five statuses and discards patient and clinical data", () => {
    const statuses = [
      "SCHEDULED",
      "ARRIVED",
      "COMPLETED",
      "NO_SHOW",
      "CANCELLED",
    ];
    const result = appointmentCounts(
      statuses.map((status, i) => ({
        ...row,
        appointmentId: i + 1,
        status,
        clinicalNotes: "SECRET",
      })),
      date,
    );
    expect(result).toEqual({
      total: 5,
      byStatus: {
        SCHEDULED: 1,
        ARRIVED: 1,
        COMPLETED: 1,
        NO_SHOW: 1,
        CANCELLED: 1,
      },
    });
    expect(JSON.stringify(result)).not.toContain("SECRET");
  });
  it("returns real zeros for an empty response", () => {
    expect(appointmentCounts([], date)).toEqual({
      total: 0,
      byStatus: {
        SCHEDULED: 0,
        ARRIVED: 0,
        COMPLETED: 0,
        NO_SHOW: 0,
        CANCELLED: 0,
      },
    });
    expect(pendingInvoiceCount({ content: [], totalElements: 0 })).toBe(0);
  });
  it.each([
    null,
    {},
    [null],
    [{ ...row, status: "WAITING" }],
    [{ ...row, appointmentDate: "2026-10-23" }],
    [row, row],
    [{ ...row, appointmentId: 0 }],
  ])("rejects malformed, duplicate or wrong-date appointments: %j", (rows) => {
    expect(() => appointmentCounts(rows, date)).toThrow();
  });
  it("uses totalElements across all pages, including partially paid invoices", () => {
    expect(
      pendingInvoiceCount({
        content: [{ status: "UNPAID", amountPaid: 100 }],
        totalElements: 101,
      }),
    ).toBe(101);
    expect(statusLabel("UNPAID")).toBe("Pending");
    expect(statusLabel("NO_SHOW")).toBe("No-show");
  });
  it.each([
    null,
    {},
    { content: [] },
    { content: [], totalElements: -1 },
    { content: [], totalElements: 1.1 },
    { content: [], totalElements: "5" },
    { content: [], totalElements: Number.MAX_SAFE_INTEGER + 1 },
    { content: [{}], totalElements: 0 },
  ])("rejects unreliable invoice totals: %j", (page) => {
    expect(() => pendingInvoiceCount(page)).toThrow();
  });
  it("uses Colombo midnight rather than UTC or browser midnight", () => {
    expect(clinicToday(new Date("2026-10-23T18:29:59Z"))).toBe("2026-10-23");
    expect(clinicToday(new Date("2026-10-23T18:30:00Z"))).toBe(date);
  });
});
