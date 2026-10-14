import { afterEach, describe, expect, it } from "vitest";

import {
  adaptPatientResponse,
  adaptPatientsResponse,
  getPatient,
  getPatients,
} from "../../src/services/patientService";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { mswState, resetMswState } from "../msw/handlers";

afterEach(() => {
  store.dispatch(clearSession());
  resetMswState();
});

describe("patientService — verified PatientResponse shape", () => {
  it("adapts a single patient (patientId / fullName)", () => {
    expect(
      adaptPatientResponse({
        success: true,
        message: "Patient retrieved successfully",
        data: { patientId: 42, fullName: "Jane Doe" },
      }),
    ).toEqual({ patientId: 42, fullName: "Jane Doe" });

    // Missing name degrades to a label instead of inventing one.
    expect(
      adaptPatientResponse({ success: true, data: { patientId: 42 } }),
    ).toEqual({ patientId: 42, fullName: "Patient 42" });

    expect(() =>
      adaptPatientResponse({ success: true, data: { fullName: "No id" } }),
    ).toThrow(/response format/i);
    expect(() =>
      adaptPatientResponse({ success: false, data: { patientId: 1 } }),
    ).toThrow(/response format/i);
  });

  it("adapts the directory and skips records without an id", () => {
    expect(
      adaptPatientsResponse({
        success: true,
        message: "Patients retrieved successfully",
        data: [
          { patientId: 1, fullName: "Jane Doe" },
          { patientId: 2, fullName: "  " },
          { fullName: "No id" },
          null,
        ],
      }),
    ).toEqual([
      { patientId: 1, fullName: "Jane Doe" },
      { patientId: 2, fullName: "Patient 2" },
    ]);

    expect(() =>
      adaptPatientsResponse({ success: true, data: { items: [] } }),
    ).toThrow(/response format/i);
  });

  it("fetches one patient through the authenticated client", async () => {
    store.dispatch(setSession({ accessToken: "p-access", role: "DOCTOR" }));
    mswState.tokenValid = true;
    const patient = await getPatient(7);

    expect(patient).toEqual({ patientId: 7, fullName: "Jane Doe" });
    expect(mswState.protectedHits[0].id).toBe("7");
    expect(mswState.protectedHits[0].authorization).toBe("Bearer p-access");
  });

  it("requests the patient directory through the authenticated client", async () => {
    store.dispatch(setSession({ accessToken: "p-access", role: "DOCTOR" }));
    mswState.patientsResponses = [[{ patientId: 7, fullName: "Sam Lee" }]];
    const patients = await getPatients();

    expect(patients).toEqual([{ patientId: 7, fullName: "Sam Lee" }]);
    expect(new URL(mswState.patientsHits[0].url).pathname).toMatch(
      /\/api\/patients$/,
    );
    expect(mswState.patientsHits[0].authorization).toBe("Bearer p-access");
  });

  it("propagates directory failures for callers to swallow", async () => {
    mswState.patientsErrorMode = "server-error";
    await expect(getPatients()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
