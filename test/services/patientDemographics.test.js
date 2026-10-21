import { afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import {
  adaptPatientDemographics,
  getPatientDemographics,
  searchPatients,
  updatePatientDemographics,
} from "../../src/services/patientService";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
const patient = {
  patientId: 101,
  fullName: "Example",
  contactNo: "raw",
  dateOfBirth: "1990-01-15",
  gender: "OTHER",
  isActive: true,
  bloodGroup: "A+",
  clinicalNotes: "CLINICAL_SECRET",
};
afterEach(() => store.dispatch(clearSession()));
describe("ADM-03 demographic API", () => {
  it("requests backend paging with minimal search results and bearer auth", async () => {
    store.dispatch(setSession({ accessToken: "fixture-token", role: "ADMIN" }));
    server.use(
      http.get("*/patients", ({ request }) => {
        const url = new URL(request.url);
        expect(Object.fromEntries(url.searchParams)).toEqual({
          search: "+94 771 234 567",
          page: "1",
          size: "10",
          sort: "fullName,asc",
        });
        expect(
          request.headers.get("authorization") === "Bearer fixture-token",
        ).toBe(true);
        return HttpResponse.json({
          success: true,
          data: [patient, { ...patient, patientId: 102 }],
        });
      }),
    );
    expect(
      await searchPatients({ search: "+94 771 234 567", page: 1 }),
    ).toEqual(
      [101, 102].map((patientId) => ({
        patientId,
        fullName: "Example",
        contactNo: "raw",
        dateOfBirth: "1990-01-15",
      })),
    );
  });
  it("reads safe demographics and prevents clinical updates including nulls/server fields", async () => {
    let stored = { ...patient };
    server.use(
      http.get("*/patients/101", () =>
        HttpResponse.json({ success: true, data: stored }),
      ),
      http.put("*/patients/101", async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ full_name: "Updated", address: "", email: "" });
        stored = {
          ...stored,
          fullName: body.full_name,
          address: body.address,
          email: body.email,
        };
        return HttpResponse.json({ success: true, data: stored });
      }),
    );
    expect(await getPatientDemographics(101)).not.toHaveProperty("bloodGroup");
    const result = await updatePatientDemographics(101, {
      full_name: "Updated",
      address: "",
      email: "",
      bloodGroup: "B+",
      dateOfBirth: "2000-01-01",
      patientId: 1,
      isActive: false,
      contactNo: null,
      gender: "",
    });
    expect(result.fullName).toBe("Updated");
    expect(result).not.toHaveProperty("clinicalNotes");
    expect(stored.bloodGroup).toBe("A+");
  });
  it("uses valid defaults for missing optional response fields", () => {
    expect(
      adaptPatientDemographics({ success: true, data: { patientId: "101" } }),
    ).toMatchObject({
      fullName: "Patient 101",
      address: "",
      email: "",
      gender: "",
      isActive: false,
    });
  });
  it("rejects invalid IDs and malformed envelopes", async () => {
    for (const id of ["abc", "../101", 0, Number.MAX_SAFE_INTEGER + 1])
      await expect(getPatientDemographics(id)).rejects.toThrow(/ID/);
    server.use(
      http.get("*/patients", () =>
        HttpResponse.json({ success: true, data: { total: 1 } }),
      ),
    );
    await expect(searchPatients({ search: "Example" })).rejects.toThrow(
      /format/,
    );
    expect(() => adaptPatientDemographics({ success: false })).toThrow(
      /format/,
    );
  });
});
