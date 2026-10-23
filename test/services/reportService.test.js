import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  PHARMACY_REPORT_TYPES,
  adaptClinicReport,
  adaptPharmacyReport,
  downloadClinicReport,
  downloadPharmacyReport,
  getClinicReport,
  getPharmacyReport,
  reportRangeError,
} from "../../src/services/reportService";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { mswState, resetMswState } from "../msw/handlers";

beforeEach(() => {
  store.dispatch(
    setSession({ accessToken: "report-token", role: "SUPER_ADMIN" }),
  );
});
afterEach(() => {
  store.dispatch(clearSession());
  resetMswState();
});

describe("reportService — range validation mirror", () => {
  it("requires both dates", () => {
    expect(reportRangeError("", "2026-01-31")).toMatch(/both/i);
    expect(reportRangeError("2026-01-01", "")).toMatch(/both/i);
  });
  it("rejects reversed ranges and impossible dates", () => {
    expect(reportRangeError("2026-02-01", "2026-01-01")).toMatch(/after/i);
    expect(reportRangeError("2026-02-30", "2026-03-01")).toMatch(/valid/i);
  });
  it("rejects ranges wider than one year like the backend 422", () => {
    expect(reportRangeError("2025-01-01", "2026-01-01")).toBe("");
    expect(reportRangeError("2024-01-01", "2026-01-02")).toMatch(/too large/i);
  });
});

describe("reportService — clinic report", () => {
  it("adapts the aggregate envelope", () => {
    const report = adaptClinicReport({
      success: true,
      data: {
        from: "2026-10-01",
        to: "2026-10-18",
        doctorId: null,
        totalAppointments: 42,
        consultationCount: 30,
        scheduled: 5,
        arrived: 3,
        completed: 30,
        cancelled: 4,
        noShow: 6,
        uniquePatients: 25,
        generatedAt: "2026-10-23T09:15:00",
      },
    });
    expect(report).toMatchObject({
      doctorId: null,
      totalAppointments: 42,
      noShow: 6,
      uniquePatients: 25,
    });
  });
  it("rejects a malformed payload", () => {
    expect(() => adaptClinicReport({ success: true, data: null })).toThrow(
      /unexpected/i,
    );
    expect(() => adaptClinicReport({ success: false })).toThrow(/unexpected/i);
  });
  it("GETs /reports/clinic with the filters and the Bearer token", async () => {
    const report = await getClinicReport({
      from: "2026-10-01",
      to: "2026-10-18",
      doctorId: "301",
    });
    expect(report.totalAppointments).toBe(42);
    expect(mswState.clinicReportHits[0]).toMatchObject({
      authorization: "Bearer report-token",
      from: "2026-10-01",
      to: "2026-10-18",
      doctorId: "301",
      format: null,
    });
  });
  it("surfaces the backend 422 message for a wide range", async () => {
    await expect(
      getClinicReport({ from: "2024-01-01", to: "2026-01-02" }),
    ).rejects.toMatchObject({
      status: 422,
      userMessage: "Date range too large, narrow your range",
    });
  });
  it("downloads the CSV with the server filename", async () => {
    const file = await downloadClinicReport({
      from: "2026-10-01",
      to: "2026-10-18",
      format: "csv",
    });
    expect(file.filename).toBe("clinic-report_2026-10-01_to_2026-10-18.csv");
    expect(mswState.clinicReportHits[0]).toMatchObject({ format: "csv" });
  });
});

describe("reportService — pharmacy report", () => {
  it("exposes the three backend report types", () => {
    expect(PHARMACY_REPORT_TYPES.map((entry) => entry.value)).toEqual([
      "stock-usage",
      "expiry",
      "dispensing-history",
    ]);
  });
  it("keeps the sections separate and preserves masked contacts", () => {
    const report = adaptPharmacyReport({
      success: true,
      data: {
        type: "DISPENSING_HISTORY",
        from: "2026-10-01",
        to: "2026-10-18",
        stockUsage: [],
        expiry: [],
        dispensingHistory: [
          {
            referenceId: 901,
            source: "EXTERNAL",
            dispenseDate: "2026-10-10T10:00:00",
            patientId: 401,
            patientName: "Example Patient",
            patientContactNo: "077***4567",
            medicineName: "Amoxicillin 500mg",
            quantity: 20,
          },
        ],
      },
    });
    expect(report.stockUsage).toEqual([]);
    expect(report.dispensingHistory[0].patientContactNo).toBe("077***4567");
  });
  it("GETs /reports/pharmacy with the requested type", async () => {
    const report = await getPharmacyReport({
      type: "stock-usage",
      from: "2026-10-01",
      to: "2026-10-18",
    });
    expect(report.type).toBe("STOCK_USAGE");
    expect(report.stockUsage).toHaveLength(2);
    expect(mswState.pharmacyReportHits[0]).toMatchObject({
      type: "stock-usage",
      format: null,
    });
  });
  it("rejects an unknown type with the backend message", async () => {
    await expect(
      getPharmacyReport({ type: "bogus", from: "2026-10-01", to: "2026-10-18" }),
    ).rejects.toMatchObject({
      status: 400,
      userMessage: "Unknown report type 'bogus'",
    });
  });
  it("downloads the PDF with the server filename", async () => {
    const file = await downloadPharmacyReport({
      type: "expiry",
      from: "2026-10-01",
      to: "2026-10-18",
      format: "pdf",
    });
    expect(file.filename).toBe(
      "pharmacy-report_expiry_2026-10-01_to_2026-10-18.pdf",
    );
  });
});
