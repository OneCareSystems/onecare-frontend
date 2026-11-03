import { afterEach, describe, expect, it } from "vitest";

import {
  adaptPrescriptionResponse,
  createPrescription,
} from "../../src/services/prescriptionService";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { mswState, resetMswState } from "../msw/handlers";

afterEach(() => {
  store.dispatch(clearSession());
  resetMswState();
});

describe("prescriptionService — verified POST /api/prescriptions contract", () => {
  it("adapts the prescription response and rejects malformed payloads", () => {
    expect(
      adaptPrescriptionResponse({
        success: true,
        message: "Prescription created successfully",
        data: {
          prescriptionId: 9001,
          patientId: 7,
          appointmentId: 101,
          date: "2026-10-14",
          status: "ISSUED",
          items: [{ medicineName: "Amoxicillin" }],
          createdAt: "2026-10-14T09:00:00",
        },
      }),
    ).toMatchObject({ prescriptionId: 9001, status: "ISSUED" });

    expect(() =>
      adaptPrescriptionResponse({ success: true, data: {} }),
    ).toThrow(/response format/i);
  });

  it("creates a prescription with free-text EXTERNAL_PURCHASE items", async () => {
    store.dispatch(setSession({ accessToken: "rx-access", role: "DOCTOR" }));
    const prescription = await createPrescription({
      patientId: 7,
      appointmentId: 101,
      items: [
        {
          medicineName: "Amoxicillin",
          dosage: "1 capsule",
          frequency: "Three times daily",
          durationDays: 7,
          quantity: 21,
        },
      ],
    });

    expect(prescription.prescriptionId).toBe(9001);
    expect(mswState.prescriptionCreateHits).toHaveLength(1);
    const { body, authorization } = mswState.prescriptionCreateHits[0];
    expect(authorization).toBe("Bearer rx-access");
    expect(body).toMatchObject({
      patientId: 7,
      appointmentId: 101,
      items: [
        {
          itemType: "EXTERNAL_PURCHASE",
          medicineName: "Amoxicillin",
          dosage: "1 capsule",
          frequency: "Three times daily",
          durationDays: 7,
          quantity: 21,
        },
      ],
    });
    // Clinical notes live on the appointment — never on the prescription.
    expect(body.clinicalNotes).toBeUndefined();
    // No medicineId: doctors hold no MEDICINE_READ permission.
    expect(body.items[0].medicineId).toBeUndefined();
  });

  it("surfaces backend rejections for callers to display", async () => {
    mswState.prescriptionCreateErrorMode = "validation";
    await expect(
      createPrescription({ patientId: 7, appointmentId: 101, items: [] }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});
