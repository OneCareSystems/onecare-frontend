import { describe, expect, it } from "vitest";
import {
  normalizePatientSearch,
  patientErrorMessage,
  validatePatientSearch,
} from "../../src/utils/patientSearch";
import {
  patientChanges,
  patientEditValues,
  validatePatientEdit,
} from "../../src/utils/patientValidation";
const original = {
  full_name: "Example",
  contactNo: "raw-phone",
  email: "",
  address: "",
  gender: "OTHER",
};
describe("ADM-03 utilities", () => {
  it.each([
    "Sarah Johnson",
    "O’Connor",
    "Anne-Marie",
    "Dr. Perera",
    "தமிழ் பெயர்",
    "José García",
  ])("accepts the name %s", (name) => {
    expect(validatePatientSearch(name, "name")).toBe("");
  });
  it.each(["0771234567", "+94 (771) 234-567", "+1 555 123 4567"])(
    "accepts appropriate phone syntax %s",
    (phone) => {
      expect(validatePatientSearch(phone, "phone")).toBe("");
    },
  );
  it.each([
    "Sarah",
    "077abc1234",
    "123",
    "1234567890123456",
    "++94771234567",
    "077/1234567",
    "(0771234567",
  ])("rejects invalid phone %s", (phone) => {
    expect(validatePatientSearch(phone, "phone")).toMatch(/phone number/);
  });
  it.each(["101", "771234567", "9223372036854775807"])(
    "accepts canonical backend Long ID %s",
    (id) => {
      expect(validatePatientSearch(id, "id")).toBe("");
    },
  );
  it.each([
    "Sarah",
    "P-101",
    "0",
    "00101",
    "-1",
    "1.2",
    "9223372036854775808",
    "99999999999999999999",
  ])("rejects invalid clinic ID %s", (id) => {
    expect(validatePatientSearch(id, "id")).toMatch(/numeric clinic ID/);
  });
  it("keeps initial empty queries neutral and rejects numeric names", () => {
    for (const mode of ["name", "phone", "id"])
      expect(validatePatientSearch("  ", mode)).toBe("");
    expect(validatePatientSearch("101", "name")).toMatch(/patient name/);
    expect(validatePatientSearch("Sarah123", "name")).toMatch(/patient name/);
  });
  it.each([
    "0771234567",
    "+94771234567",
    "0094771234567",
    "94771234567",
    "+94 (771) 234-567",
    "771234567",
  ])("normalizes %s like the backend", (phone) =>
    expect(normalizePatientSearch(phone)).toBe("+94 771 234 567"),
  );
  it.each(["Example Patient", "101", "example-phone", "+1 555 123", ""])(
    "preserves literal name or ID %s",
    (value) => expect(normalizePatientSearch(` ${value} `)).toBe(value),
  );
  it("disambiguates numeric clinic IDs and explicit name searches", () => {
    expect(normalizePatientSearch("0771234567", "id")).toBe("0771234567");
    expect(normalizePatientSearch("771234567", "name")).toBe("771234567");
  });
  it("maps all failures to safe messages", () => {
    for (const status of [400, 401, 403, 404, 409, 500, null]) {
      const message = patientErrorMessage(
        { status, message: "CLINICAL_SECRET" },
        "search",
      );
      expect(message).not.toContain("CLINICAL_SECRET");
      expect(message.length).toBeGreaterThan(10);
    }
    expect(
      patientErrorMessage({ config: { _isRefresh: true } }, "update"),
    ).toMatch(/refresh/);
  });
  it("validates only permitted editable fields", () => {
    expect(validatePatientEdit(original, original)).toEqual({});
    expect(
      validatePatientEdit(
        {
          ...original,
          full_name: " ",
          contactNo: "",
          email: "bad",
          gender: "",
        },
        original,
      ),
    ).toMatchObject({
      full_name: expect.any(String),
      contactNo: expect.any(String),
      email: expect.any(String),
      gender: expect.any(String),
    });
    expect(
      validatePatientEdit(
        { ...original, gender: "" },
        { ...original, gender: "" },
      ),
    ).toEqual({});
  });
  it("maps edit values and only includes changed allowlisted keys", () => {
    expect(
      patientEditValues({
        fullName: "Example",
        contactNo: "raw-phone",
        email: "",
        address: "",
        gender: "OTHER",
        bloodGroup: "secret",
      }),
    ).toEqual(original);
    expect(
      patientChanges(
        {
          ...original,
          address: "New",
          bloodGroup: "secret",
          dateOfBirth: "2001-01-01",
        },
        original,
      ),
    ).toEqual({ address: "New" });
    expect(patientChanges(original, original)).toEqual({});
  });
});
