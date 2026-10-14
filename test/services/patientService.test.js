import { afterEach, describe, expect, it } from "vitest";

import {
  adaptPatientsResponse,
  getPatients,
} from "../../src/services/patientService";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { mswState, resetMswState } from "../msw/handlers";

afterEach(() => {
  store.dispatch(clearSession());
  resetMswState();
});

describe("patientService", () => {
  it("adapts the patient directory and skips records without an id", () => {
    expect(
      adaptPatientsResponse({
        success: true,
        message: "Patients retrieved successfully",
        data: [
          { id: 1, name: "Jane Doe" },
          { id: 2, name: "  " },
          { name: "No id" },
          null,
        ],
      }),
    ).toEqual([
      { id: 1, name: "Jane Doe" },
      { id: 2, name: "Patient 2" },
    ]);

    expect(() =>
      adaptPatientsResponse({ success: true, data: { items: [] } }),
    ).toThrow(/response format/i);
    expect(() => adaptPatientsResponse({ success: false, data: [] })).toThrow(
      /response format/i,
    );
  });

  it("requests the patient directory through the authenticated client", async () => {
    store.dispatch(setSession({ accessToken: "p-access", role: "DOCTOR" }));
    mswState.patientsResponses = [[{ id: 7, name: "Sam Lee" }]];
    const patients = await getPatients();

    expect(patients).toEqual([{ id: 7, name: "Sam Lee" }]);
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
