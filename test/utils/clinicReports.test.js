import { describe, expect, it } from "vitest";
import {
  clinicReportCsv,
  clinicReportError,
  csvCell,
} from "../../src/utils/clinicReports";
import {
  adaptClinicReport,
  reportRangeError,
} from "../../src/services/reportService";

const report = {
  from: "2026-10-01",
  to: "2026-10-24",
  doctorId: null,
  totalAppointments: 9,
  consultationCount: 4,
  scheduled: 2,
  arrived: 1,
  completed: 4,
  cancelled: 1,
  noShow: 1,
  uniquePatients: 2,
  generatedAt: "2026-10-24T10:30:00",
};
describe("clinic report mapping and protected snapshot CSV", () => {
  it("exports only verified fields from the loaded aggregate", () => {
    const csv = clinicReportCsv(
      { ...report, clinicalNotes: "SECRET", patientId: 999 },
      "All doctors",
    );
    expect(csv).toContain(
      '"ALL","All doctors","9","2","4","2","1","4","1","1"',
    );
    expect(csv).toContain('"Generated at"');
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).not.toMatch(/SECRET|patientId|999|DEMO/);
  });
  it("preserves doctor scope and neutralizes formulas and CSV delimiters", () => {
    expect(
      clinicReportCsv({ ...report, doctorId: 301 }, '=HYPERLINK("x")'),
    ).toContain('"301","\'=HYPERLINK(""x"")"');
    expect(csvCell('a,"b"\r\nc')).toBe('"a,""b""\r\nc"');
    for (const value of [
      "=1",
      "+1",
      "-1",
      "@x",
      "  =1",
      "\tvalue",
      "\rtext",
      "\ntext",
      "\u0000=1",
      " \u001f\t+1",
      "\u007f@SUM(A1)",
    ])
      expect(csvCell(value)).toBe(`"'${value}"`);
    expect(csvCell(7)).toBe('"7"');
  });
  it.each([
    null,
    {},
    { ...report, totalAppointments: undefined },
    { ...report, arrived: "1" },
    { ...report, noShow: -1 },
    { ...report, uniquePatients: 0.2 },
    { ...report, completed: Number.MAX_SAFE_INTEGER + 1 },
    { ...report, from: "2026-02-30" },
    { ...report, from: "2026-10-25" },
    { ...report, doctorId: "bad" },
  ])(
    "rejects malformed successes instead of substituting zeros: %j",
    (data) => {
      expect(() => adaptClinicReport({ success: true, data })).toThrow();
    },
  );
  it("mirrors the exact 365 elapsed-day boundary including leap years", () => {
    expect(reportRangeError("2024-01-01", "2024-12-31")).toBe("");
    expect(reportRangeError("2024-01-01", "2025-01-01")).toMatch(/too large/);
    expect(reportRangeError("2026-10-24", "2026-10-24")).toBe("");
  });
  it("distinguishes timeouts, range rejection, throttling and permission failures", () => {
    for (const code of ["ETIMEDOUT", "ECONNABORTED"])
      expect(clinicReportError({ code })).toMatch(/narrow the date range/);
    expect(clinicReportError({ status: 422 })).toMatch(/narrow/);
    expect(clinicReportError({ status: 504 })).toMatch(/narrow/);
    expect(clinicReportError({ response: { status: 429 } })).toMatch(/wait/);
    expect(clinicReportError({ status: 403 })).toMatch(/permission/);
    expect(clinicReportError(null)).toMatch(/Unable/);
  });
});
