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

/** An all-days-off week in the wire shape. */
const emptyWeek = () =>
  [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ].map((dayOfWeek) => ({ dayOfWeek, timeSlots: [] }));

/** The FR009/UC4 spec example, seeded into the mock for doctor 4. */
const SPEC_SCHEDULE = {
  doctorId: 4,
  days: emptyWeek().map((day) =>
    ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(
      day.dayOfWeek,
    )
      ? {
          ...day,
          timeSlots: [
            { start: "09:00", end: "12:00" },
            { start: "13:00", end: "17:00" },
          ],
        }
      : day,
  ),
};

describe("doctorScheduleService — FR009/UC4 working schedules", () => {
  it("adapts the envelope, uppercases day names and normalises times", () => {
    expect(
      adaptDoctorScheduleResponse({
        success: true,
        message: "Schedule retrieved successfully",
        data: {
          doctorId: "4",
          days: [
            {
              dayOfWeek: " monday ",
              timeSlots: [{ start: "09:00", end: "12:00" }],
            },
            ...emptyWeek().slice(1),
          ],
        },
      }),
    ).toEqual({
      doctorId: 4,
      days: [
        {
          dayOfWeek: "MONDAY",
          timeSlots: [{ start: "09:00", end: "12:00" }],
        },
        ...emptyWeek().slice(1),
      ],
    });

    // Missing days array.
    expect(() =>
      adaptDoctorScheduleResponse({ success: true, data: { doctorId: 4 } }),
    ).toThrow(/response format/i);
    // Wrong number of weekdays.
    expect(() =>
      adaptDoctorScheduleResponse({
        success: true,
        data: { doctorId: 4, days: [{ dayOfWeek: "MONDAY", timeSlots: [] }] },
      }),
    ).toThrow(/response format/i);
    // Unpadded time on the wire — the adapter validates before padding.
    expect(() =>
      adaptDoctorScheduleResponse({
        success: true,
        data: {
          doctorId: 4,
          days: [
            {
              dayOfWeek: "MONDAY",
              timeSlots: [{ start: "9:00", end: "10:00" }],
            },
            ...emptyWeek().slice(1),
          ],
        },
      }),
    ).toThrow(/response format/i);
    // Malformed time slot.
    expect(() =>
      adaptDoctorScheduleResponse({
        success: true,
        data: {
          doctorId: 4,
          days: [
            {
              dayOfWeek: "MONDAY",
              timeSlots: [{ start: "9am", end: "10:00" }],
            },
            ...emptyWeek().slice(1),
          ],
        },
      }),
    ).toThrow(/response format/i);
    // Duplicate weekday.
    expect(() =>
      adaptDoctorScheduleResponse({
        success: true,
        data: {
          doctorId: 4,
          days: [
            { dayOfWeek: "MONDAY", timeSlots: [] },
            { dayOfWeek: "MONDAY", timeSlots: [] },
            ...emptyWeek().slice(2),
          ],
        },
      }),
    ).toThrow(/response format/i);
    // Failure envelope.
    expect(() =>
      adaptDoctorScheduleResponse({
        success: false,
        data: { doctorId: 4, days: emptyWeek() },
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

  it("returns an empty week for a doctor without a schedule", async () => {
    expect(await getDoctorSchedule(5)).toEqual({
      doctorId: 5,
      days: emptyWeek(),
    });
  });

  it("reports an unknown doctor as 404", async () => {
    const error = await getDoctorSchedule(999).catch((caught) => caught);

    expect(error.status).toBe(404);
  });

  it("replaces the schedule and persists it in the mock backend", async () => {
    const days = emptyWeek().map((day) =>
      ["TUESDAY", "THURSDAY"].includes(day.dayOfWeek)
        ? { ...day, timeSlots: [{ start: "08:00", end: "11:30" }] }
        : day,
    );

    const saved = await setDoctorSchedule(4, { days });

    expect(saved).toEqual({ doctorId: 4, days });
    expect(mswState.doctorScheduleWriteHits[0]).toMatchObject({
      id: "4",
      body: { days },
    });

    const reread = await getDoctorSchedule(4);
    expect(reread).toEqual({ doctorId: 4, days });
  });

  it("surfaces slot conflicts with the overlapping pair and saves nothing", async () => {
    const before = JSON.stringify(mswState.doctorSchedules["4"]);

    const error = await setDoctorSchedule(4, {
      days: emptyWeek().map((day) =>
        day.dayOfWeek === "MONDAY"
          ? {
              ...day,
              timeSlots: [
                { start: "09:00", end: "12:00" },
                { start: "11:00", end: "13:00" },
              ],
            }
          : day,
      ),
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
    // An all-days-off week — valid on the client, refused by the backend.
    const empty = await setDoctorSchedule(4, { days: emptyWeek() }).catch(
      (caught) => caught,
    );
    expect(empty.status).toBe(400);

    // Unknown doctor id.
    const unknown = await setDoctorSchedule(999, {
      days: emptyWeek().map((day) =>
        day.dayOfWeek === "MONDAY"
          ? { ...day, timeSlots: [{ start: "09:00", end: "10:00" }] }
          : day,
      ),
    }).catch((caught) => caught);
    expect(unknown.status).toBe(404);
  });

  it("rejects reversed slots locally, before any request", async () => {
    const hits = mswState.doctorScheduleWriteHits.length;

    await expect(
      setDoctorSchedule(4, {
        days: emptyWeek().map((day) =>
          day.dayOfWeek === "MONDAY"
            ? { ...day, timeSlots: [{ start: "12:00", end: "09:00" }] }
            : day,
        ),
      }),
    ).rejects.toThrow(/HH:mm|end after/i);

    expect(mswState.doctorScheduleWriteHits.length).toBe(hits);
  });

  it("rejects malformed payloads before any request", async () => {
    const hits = mswState.doctorScheduleWriteHits.length;

    await expect(
      setDoctorSchedule(4, { days: "MONDAY" }),
    ).rejects.toThrow(/every weekday/i);
    await expect(
      setDoctorSchedule(4, {
        days: emptyWeek().map((day) =>
          day.dayOfWeek === "MONDAY"
            ? { ...day, timeSlots: [{ start: "9am", end: "10:00" }] }
            : day,
        ),
      }),
    ).rejects.toThrow(/HH:mm/i);
    await expect(
      setDoctorSchedule(4, {
        days: emptyWeek().map((day, index) =>
          index === 1 ? { ...day, dayOfWeek: "MONDAY" } : day,
        ),
      }),
    ).rejects.toThrow(/exactly once/i);

    expect(mswState.doctorScheduleWriteHits.length).toBe(hits);
  });
});
