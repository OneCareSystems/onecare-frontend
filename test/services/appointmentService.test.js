import { afterEach, describe, expect, it } from "vitest";

import {
  adaptAppointmentsResponse,
  adaptClinicalNotesResponse,
  adaptPatientHistoryResponse,
  findAppointment,
  getAppointments,
  getClinicalNotes,
  getPatientHistory,
  saveClinicalNotes,
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

describe("appointmentService — clinical notes (fix/44 contract)", () => {
  it("adapts the clinical-notes response and rejects malformed payloads", () => {
    expect(
      adaptClinicalNotesResponse({
        success: true,
        message: "Clinical notes retrieved successfully",
        data: {
          appointmentId: 101,
          patientId: 7,
          doctorId: 3,
          clinicalNotes: "Note",
        },
      }),
    ).toEqual({
      appointmentId: 101,
      patientId: 7,
      doctorId: 3,
      clinicalNotes: "Note",
    });

    // Null notes come back as an empty string, not null.
    expect(
      adaptClinicalNotesResponse({
        success: true,
        data: { appointmentId: 1, clinicalNotes: null },
      }).clinicalNotes,
    ).toBe("");

    expect(() =>
      adaptClinicalNotesResponse({ success: true, data: {} }),
    ).toThrow(/response format/i);
  });

  it("reads notes via GET /appointments/{id}/clinical-notes", async () => {
    mswState.clinicalNotesResponses = [
      { appointmentId: 101, patientId: 7, doctorId: 3, clinicalNotes: "A" },
    ];
    const notes = await getClinicalNotes(101);
    expect(notes.clinicalNotes).toBe("A");
    expect(mswState.clinicalNotesHits[0].id).toBe("101");
  });

  it("saves notes via PUT /appointments/{id} with only clinicalNotes", async () => {
    store.dispatch(setSession({ accessToken: "a-access", role: "DOCTOR" }));
    await saveClinicalNotes(101, "Started antibiotics.");

    expect(mswState.appointmentUpdateHits).toHaveLength(1);
    expect(mswState.appointmentUpdateHits[0]).toMatchObject({
      id: "101",
      body: { clinicalNotes: "Started antibiotics." },
      authorization: "Bearer a-access",
    });
  });

  it("surfaces the backend's cancelled-appointment rejection", async () => {
    mswState.appointmentUpdateErrorMode = "cancelled";
    await expect(saveClinicalNotes(101, "x")).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it("adapts and fetches the patient history", () => {
    expect(
      adaptPatientHistoryResponse({
        success: true,
        data: { patientId: 7, appointments: null, prescriptions: null },
      }),
    ).toEqual({ patientId: 7, appointments: [], prescriptions: [] });
    expect(() =>
      adaptPatientHistoryResponse({ success: true, data: {} }),
    ).toThrow(/response format/i);
  });

  it("fetches history via GET /appointments/patient/{id}/history", async () => {
    mswState.historyResponses = [
      { patientId: 7, appointments: [], prescriptions: [] },
    ];
    const history = await getPatientHistory(7);
    expect(history.patientId).toBe(7);
    expect(mswState.historyHits[0].patientId).toBe("7");
  });
});
