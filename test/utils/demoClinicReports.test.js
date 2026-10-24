import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDemoReport,
  csvCell,
  demoReportCsv,
  downloadDemoReport,
} from "../../src/utils/demoClinicReports";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("explicit synthetic clinic report preview", () => {
  it("filters aggregate samples by inclusive dates and synthetic doctor IDs", () => {
    const all = buildDemoReport();
    expect(all.rows).toHaveLength(14);
    expect(all.trend).toHaveLength(7);
    expect(all.totals.arrived + all.totals.noShow).toBe(
      all.totals.appointments,
    );
    const selected = buildDemoReport({
      from: "2026-10-12",
      to: "2026-10-12",
      doctor: "demo-doctor-a",
    });
    expect(selected.rows).toHaveLength(1);
    expect(selected.totals).toEqual({
      appointments: 10,
      newPatients: 2,
      arrived: 9,
      noShow: 1,
      revenueCents: 1350000,
    });
    expect(selected.attendance).toBe("90%");
    expect(buildDemoReport({ doctor: "301" }).rows).toEqual([]);
    expect(buildDemoReport({ from: "2090-01-01" }).attendance).toBe("—");
  });
  it("escapes every CSV cell and neutralizes spreadsheet formulas", () => {
    expect(csvCell('a,"b"\r\nc')).toBe('"a,""b""\r\nc"');
    for (const value of [
      "=SUM(A1)",
      "+1",
      "-1",
      "@x",
      "  =1",
      "\tvalue",
      "\rtext",
      "\ntext",
    ])
      expect(csvCell(value)).toBe(`"'${value}"`);
    const csv = demoReportCsv(buildDemoReport().rows);
    expect(csv).toContain('"DEMO - synthetic data"');
    expect(csv.split("\r\n")).toHaveLength(15);
    expect(csv).toContain('"13500.00"');
    expect(csv).not.toMatch(/patientId|clinicalNotes|bloodGroup/);
  });
  it("downloads a labelled CSV and releases its object URL", () => {
    vi.useFakeTimers();
    const create = vi.fn(() => "blob:demo-report");
    const revoke = vi.fn();
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = create;
        static revokeObjectURL = revoke;
      },
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function () {
        expect(this.download).toBe(
          "onecare-DEMO-clinic-report-start-to-end.csv",
        );
        expect(this.href).toBe("blob:demo-report");
      });
    downloadDemoReport([], "", "");
    expect(click).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(document.querySelector("a")).toBeNull();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith("blob:demo-report");
    vi.unstubAllGlobals();
  });
});
