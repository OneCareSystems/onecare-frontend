import { afterEach, describe, expect, it } from "vitest";

import {
  adaptAppointmentsResponse,
  findAppointment,
  getAppointments,
} from "../../src/services/appointmentService";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { mswState, resetMswState } from "../msw/handlers";

const appointment = (overrides = {}) => ({
  appointmentId: 101,
  patientId: 1,
  doctorId: 3,
  appointmentDate: "2026-10-14",
  timeSlot: "09:00:00",
  status: "SCHEDULED",
  reason: "Follow-up visit",
  ...overrides,
});

afterEach(() => {
  store.dispatch(clearSession());
  resetMswState();
});

describe("appointmentService", () => {
  it("adapts the appointments envelope and drops records without an id", () => {
    expect(
      adaptAppointmentsResponse({
        success: true,
        message: "ok",
        data: [appointment(), { status: "SCHEDULED" }, null],
      }),
    ).toEqual([appointment()]);

    expect(() =>
      adaptAppointmentsResponse({ success: true, data: { items: [] } }),
    ).toThrow(/response format/i);
    expect(() =>
      adaptAppointmentsResponse({ success: false, data: [] }),
    ).toThrow(/response format/i);
  });

  it("requests GET /api/appointments through the authenticated client", async () => {
    store.dispatch(setSession({ accessToken: "a-access", role: "DOCTOR" }));
    mswState.appointmentsResponses = [[appointment()]];
    const appointments = await getAppointments();

    expect(appointments).toHaveLength(1);
    expect(new URL(mswState.appointmentsHits[0].url).pathname).toMatch(
      /\/api\/appointments$/,
    );
    expect(mswState.appointmentsHits[0].authorization).toBe("Bearer a-access");
  });

  it("resolves a single appointment via client-side lookup", async () => {
    // Verified contract: no GET /appointments/{id} — lookup goes through
    // the doctor-scoped list.
    mswState.appointmentsResponses = [
      [
        appointment({ appointmentId: 101 }),
        appointment({ appointmentId: 102 }),
      ],
    ];
    const found = await findAppointment("102");

    expect(found?.appointmentId).toBe(102);
    expect(mswState.appointmentsHits).toHaveLength(1);
    // The lookup does not add a ?date= or /{id} query the backend lacks.
    expect(new URL(mswState.appointmentsHits[0].url).search).toBe("");
  });

  it("returns null for appointments outside the doctor's list", async () => {
    mswState.appointmentsResponses = [[appointment()]];
    await expect(findAppointment(999)).resolves.toBeNull();
  });

  it("propagates fetch failures for callers to surface", async () => {
    mswState.appointmentsErrorMode = "server-error";
    await expect(getAppointments()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
