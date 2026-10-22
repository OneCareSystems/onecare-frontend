import { describe, expect, it } from "vitest";
import {
  clinicDateTime,
  clinicToday,
  isFutureClinicSlot,
} from "../../src/utils/clinicTime";
import { bookingError } from "../../src/utils/adminWorkflows";

describe("appointment clinic wall-clock time", () => {
  it("uses Colombo's date at UTC day boundaries regardless of browser timezone", () => {
    const now = new Date("2026-10-22T19:00:00Z");
    expect(clinicDateTime(now)).toBe("2026-10-23T00:30:00");
    expect(clinicToday(now)).toBe("2026-10-23");
    expect(isFutureClinicSlot("2026-10-23", "00:30", now)).toBe(false);
    expect(isFutureClinicSlot("2026-10-23", "00:31", now)).toBe(true);
    const values = {
      patientId: 101,
      doctorId: 301,
      date: "2026-10-22",
      slot: "23:30",
    };
    expect(bookingError(values, now)).toMatch(/past/);
    expect(
      bookingError({ ...values, date: "2026-10-23", slot: "00:30" }, now),
    ).toMatch(/future/);
    expect(
      bookingError({ ...values, date: "2026-10-23", slot: "00:31" }, now),
    ).toBe("");
    expect(clinicToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
