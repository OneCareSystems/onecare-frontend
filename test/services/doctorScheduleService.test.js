import { afterEach, describe, expect, it } from "vitest";

import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import {
  adaptDoctorScheduleResponse,
  extractConflictSlots,
  getDoctorSchedule,
  setDoctorSchedule,
} from "../../src/services/doctorScheduleService";
import { mswState, resetMswState } from "../msw/handlers";

afterEach(() => {
  store.dispatch(clearSession());
  resetMswState();
});

/** The FR009/UC4 spec example, seeded into the mock for doctor 4. */
const SPEC_SCHEDULE = {
  doctorId: 4,
  workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
  timeSlots: [
    { start: "09:00", end: "12:00" },
    { start: "13:00", end: "17:00" },
  ],
};

describe("doctorScheduleService — FR009/UC4 working schedules", () => {
  it("adapts the envelope, uppercases days and pads times", () => {
    expect(
      adaptDoctorScheduleResponse({
        success: true,
        message: "Schedule retrieved successfully",
        data: {
          doctorId: "4",
          workingDays: ["monday", " friday "],
          timeSlots: [{ start: "9:00", end: "12:00" }],
        },
      }),
    ).toEqual({
      doctorId: 4,
      workingDays: ["MONDAY", "FRIDAY"],
      timeSlots: [{ start: "09:00", end: "12:00" }],
    });

    expect(() =>
      adaptDoctorScheduleResponse({ success: true, data: { doctorId: 4 } }),
    ).toThrow(/response format/i);
    expect(() =>
      adaptDoctorScheduleResponse({
        success: true,
        data: { doctorId: 4, workingDays: ["MONDAY"], timeSlots: [{}] },
      }),
    ).toThrow(/response format/i);
    expect(() =>
      adaptDoctorScheduleResponse({
        success: false,
        data: { doctorId: 4, workingDays: [], timeSlots: [] },
      }),
    ).toThrow(/response format/i);
  });

  it("reads a configured schedule through the authenticated client", async () => {
    store.dispatch(
      setSession({ accessToken: "s-access", role: "SUPER_ADMIN" }),
    );

    const schedule = await getDoctorSchedule(4);

    expect(schedule).toEqual(SPEC_SCHEDULE);
    expect(mswState.doctorScheduleHits[0]).toMatchObject({
      id: "4",
      authorization: "Bearer s-access",
    });
  });

  it("returns empty sets for a doctor without a schedule", async () => {
    expect(await getDoctorSchedule(5)).toEqual({
      doctorId: 5,
      workingDays: [],
      timeSlots: [],
    });
  });

  it("reports an unknown doctor as 404", async () => {
    const error = await getDoctorSchedule(999).catch((caught) => caught);

    expect(error.status).toBe(404);
  });

  it("replaces the schedule and persists it in the mock backend", async () => {
    const payload = {
      workingDays: ["TUESDAY", "THURSDAY"],
      timeSlots: [{ start: "08:00", end: "11:30" }],
    };

    const saved = await setDoctorSchedule(4, payload);

    expect(saved).toEqual({ doctorId: 4, ...payload });
    expect(mswState.doctorScheduleWriteHits[0]).toMatchObject({
      id: "4",
      body: payload,
    });

    const reread = await getDoctorSchedule(4);
    expect(reread).toEqual({ doctorId: 4, ...payload });
  });

  it("surfaces slot conflicts with the overlapping pair and saves nothing", async () => {
    const before = JSON.stringify(mswState.doctorSchedules["4"]);

    const error = await setDoctorSchedule(4, {
      workingDays: ["MONDAY"],
      timeSlots: [
        { start: "09:00", end: "12:00" },
        { start: "11:00", end: "13:00" },
      ],
    }).catch((caught) => caught);

    expect(error.status).toBe(400);
    expect(error.userMessage).toMatch(/Time slot conflict/);
    expect(extractConflictSlots(error)).toEqual([
      { start: "09:00", end: "12:00" },
      { start: "11:00", end: "13:00" },
    ]);
    expect(JSON.stringify(mswState.doctorSchedules["4"])).toBe(before);
  });

  it("enforces the backend's validation rules without persisting", async () => {
    // Empty day or slot sets.
    const empty = await setDoctorSchedule(4, {
      workingDays: [],
      timeSlots: [{ start: "09:00", end: "10:00" }],
    }).catch((caught) => caught);
    expect(empty.status).toBe(400);

    // end ≤ start.
    const reversed = await setDoctorSchedule(4, {
      workingDays: ["MONDAY"],
      timeSlots: [{ start: "12:00", end: "09:00" }],
    }).catch((caught) => caught);
    expect(reversed.status).toBe(400);

    // Unknown doctor id.
    const unknown = await setDoctorSchedule(999, {
      workingDays: ["MONDAY"],
      timeSlots: [{ start: "09:00", end: "10:00" }],
    }).catch((caught) => caught);
    expect(unknown.status).toBe(404);
  });

  it("rejects malformed payloads before any request", async () => {
    const hits = mswState.doctorScheduleWriteHits.length;

    await expect(
      setDoctorSchedule(4, { workingDays: "MONDAY", timeSlots: [] }),
    ).rejects.toThrow(/must be arrays/i);
    await expect(
      setDoctorSchedule(4, {
        workingDays: ["MONDAY"],
        timeSlots: [{ start: "9am", end: "10:00" }],
      }),
    ).rejects.toThrow(/HH:mm/i);

    expect(mswState.doctorScheduleWriteHits.length).toBe(hits);
  });
});
