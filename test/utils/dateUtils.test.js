import { describe, expect, it } from "vitest";

import {
  formatDisplayDate,
  isToday,
  toLocalDateString,
} from "../../src/utils/dateUtils";

describe("dateUtils — local calendar dates (no UTC shift)", () => {
  it("formats a Date with local getters, not toISOString", () => {
    // A local evening just after UTC midnight would show as the *next*
    // day through toISOString(); the helper must keep the local day.
    const localEvening = new Date(2026, 0, 14, 23, 30, 0);
    expect(toLocalDateString(localEvening)).toBe("2026-01-14");
  });

  it("pads month and day to two digits", () => {
    expect(toLocalDateString(new Date(2026, 2, 5))).toBe("2026-03-05");
  });

  it("defaults to the current local date", () => {
    const now = new Date();
    expect(toLocalDateString()).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    );
  });

  it("isToday compares against the local calendar day", () => {
    const now = new Date();
    expect(isToday(toLocalDateString(now), now)).toBe(true);
    expect(isToday("1999-12-31", now)).toBe(false);
  });

  it("formats a YYYY-MM-DD string for display without a timezone shift", () => {
    expect(formatDisplayDate("2026-01-14")).toMatch(/2026/);
    expect(formatDisplayDate("2026-01-14")).toMatch(/14/);
  });

  it("echoes invalid input instead of producing Invalid Date", () => {
    expect(formatDisplayDate("not-a-date")).toBe("not-a-date");
    expect(formatDisplayDate("")).toBe("");
    expect(formatDisplayDate(undefined)).toBeUndefined();
  });
});
