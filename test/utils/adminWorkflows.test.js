import { describe, expect, it } from "vitest";
import {
  bookingError,
  dateRangeError,
  decimalMoney,
  displayMoney,
  moneyCents,
  parseInvoiceJson,
  paymentError,
  positiveId,
  statusLabel,
  validDate,
  workflowError,
} from "../../src/utils/adminWorkflows";

describe("Admin validation and exact money", () => {
  it.each(["1", "9223372036854775807", 123])(
    "accepts valid identifiers %s",
    (id) => expect(positiveId(id)).toBe(String(id)),
  );
  it.each([
    "",
    "0",
    "-1",
    "01",
    "1/notes",
    "9223372036854775808",
    "123456789012345678901",
    9007199254740992,
  ])("rejects invalid identifiers %s", (id) =>
    expect(() => positiveId(id)).toThrow(),
  );
  it.each([
    ["2028-02-29", true],
    ["2027-02-29", false],
    ["2026-1-01", false],
    ["2090-99-99", false],
    ["", false],
  ])("validates ISO dates %s", (date, expected) =>
    expect(validDate(date)).toBe(expected),
  );
  it("validates ranges without making up date filters", () => {
    expect(dateRangeError("", "")).toBe("");
    expect(dateRangeError("2090-01-15", "2090-01-15")).toBe("");
    expect(dateRangeError("2090-01-16", "2090-01-15")).toMatch(/before/);
    expect(dateRangeError("bad", "")).toMatch(/valid/);
    expect(dateRangeError("", "bad")).toMatch(/valid/);
  });
  it("validates patient, doctor, date and future available time", () => {
    const now = new Date("2089-01-15T12:00:00"),
      values = {
        patientId: 101,
        doctorId: 301,
        date: "2090-01-15",
        slot: "16:00",
      };
    expect(bookingError(values, now)).toBe("");
    for (const [key, value, message] of [
      ["patientId", null, /patient/],
      ["doctorId", "", /doctor/],
      ["date", "bad", /valid/],
      ["date", "2088-01-01", /past/],
      ["slot", "25:00", /slot/],
      ["slot", "", /slot/],
    ])
      expect(bookingError({ ...values, [key]: value }, now)).toMatch(message);
    expect(
      bookingError({ ...values, date: "2089-01-15", slot: "11:30" }, now),
    ).toMatch(/future/);
  });
  it("formats arbitrary precision money without floating point operations", () => {
    expect(moneyCents("9007199254740993.27")).toBe(900719925474099327n);
    expect(decimalMoney("12.3")).toBe("12.30");
    expect(displayMoney("0")).toBe("LKR 0.00");
    expect(displayMoney("9007199254740993.27")).toBe("LKR 9007199254740993.27");
    expect(() => moneyCents("0.001")).toThrow();
    expect(() => moneyCents("-1")).toThrow();
  });
  it.each(["", "-1", "0.001", "1e3", "100000000", "1,000", "abc"])(
    "rejects invalid cash amounts %s",
    (value) => expect(paymentError(value, "99999999.99")).toMatch(/Enter/),
  );
  it("validates full/partial/zero and excessive payments exactly", () => {
    expect(paymentError("0", "0.01")).toMatch(/greater/);
    expect(paymentError("0.02", "0.01")).toMatch(/exceed/);
    expect(paymentError("99999999.99", "99999999.99")).toBe("");
    expect(paymentError("0.01", "0.02")).toBe("");
  });
  it("preserves decimal number tokens without rewriting quoted text", () => {
    // A separately encoded escaped string exercises the scanner safely.
    const escaped = JSON.stringify({
      message: 'fake "total":12',
      total: "0.10",
    });
    expect(parseInvoiceJson(escaped)).toEqual({
      message: 'fake "total":12',
      total: "0.10",
    });
    expect(
      parseInvoiceJson(
        '{"total":9007199254740993.27,"amount":0.10,"unitPrice":1e2}',
      ),
    ).toEqual({
      total: "9007199254740993.27",
      amount: "0.10",
      unitPrice: "1e2",
    });
    expect(parseInvoiceJson({ total: "1.00" })).toEqual({ total: "1.00" });
  });
  it("uses explicit labels and safe errors rather than sensitive messages", () => {
    expect(statusLabel("NO_SHOW")).toBe("No-show");
    expect(statusLabel("UNPAID")).toBe("Pending");
    expect(statusLabel("SCHEDULED")).toBe("Scheduled");
    for (const status of [400, 401, 403, 404, 409, 422, 429, 500, null])
      expect(
        workflowError({ status, message: "CLINICAL_SECRET" }),
      ).not.toContain("CLINICAL_SECRET");
    expect(workflowError({ response: { status: 403 } })).toMatch(/permission/);
    expect(workflowError({ config: { _isRefresh: true } })).toMatch(
      /refresh your session/,
    );
  });
});
