import { describe, expect, it } from "vitest";
import {
  emptyPatient,
  validatePatient,
} from "../../src/utils/patientRegistration";
const valid = {
  ...emptyPatient,
  full_name: "Example Patient",
  contactNo: "raw-phone",
  dateOfBirth: "2090-01-15",
};
describe("ADM-02 contract validation", () => {
  it("allows optional blanks, future dates and nonstandard phone strings", () => {
    expect(validatePatient(valid)).toEqual({});
  });
  it.each([
    ["full_name", 100],
    ["contactNo", 20],
    ["address", 255],
    ["email", 100],
  ])("enforces %s length", (field, limit) => {
    expect(
      validatePatient({ ...valid, [field]: "x".repeat(limit + 1) })[field],
    ).toBeTruthy();
  });
  it.each(["2025-02-29", "2026-13-01", "garbage"])(
    "rejects invalid date %s",
    (dateOfBirth) => {
      expect(
        validatePatient({ ...valid, dateOfBirth }).dateOfBirth,
      ).toBeTruthy();
    },
  );
  it("validates email and gender and accepts leap dates", () => {
    expect(
      validatePatient({ ...valid, email: "invalid", gender: "UNKNOWN" }),
    ).toMatchObject({ email: expect.any(String), gender: expect.any(String) });
    expect(
      validatePatient({
        ...valid,
        dateOfBirth: "2000-02-29",
        gender: "OTHER",
        email: "patient@example.invalid",
      }),
    ).toEqual({});
  });
});
