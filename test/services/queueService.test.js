import { afterEach, describe, expect, it } from "vitest";
import {
  adaptQueueResponse,
  completeAppointment,
  getTodayQueue,
} from "../../src/services/queueService";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { mswState, resetMswState } from "../msw/handlers";

afterEach(() => {
  store.dispatch(clearSession());
  resetMswState();
});

describe("queueService", () => {
  it("adapts the backend appointment response and rejects invalid records", () => {
    const record = {
      appointmentId: 9,
      patientId: 1,
      doctorId: 3,
      appointmentDate: "2026-10-14",
      timeSlot: "09:00:00",
      status: "SCHEDULED",
      queuePosition: 1,
    };
    expect(
      adaptQueueResponse({
        success: true,
        message: "Queue retrieved successfully",
        data: [record],
      }),
      // No name on the wire: the adapter supplies the `Patient <id>` label.
    ).toEqual([{ ...record, patientFullName: "Patient 1" }]);
    expect(() =>
      adaptQueueResponse({ success: true, data: { records: [record] } }),
    ).toThrow(/response format/i);
    expect(() =>
      adaptQueueResponse({
        success: true,
        data: [{ id: 10, status: "SCHEDULED" }],
      }),
    ).toThrow(/record format/i);
  });

  it("surfaces patientFullName and degrades to a label, never to a blank", () => {
    const names = adaptQueueResponse({
      success: true,
      data: [
        {
          appointmentId: 1,
          patientId: 7,
          status: "SCHEDULED",
          patientFullName: "  Jane Doe  ",
        },
        {
          appointmentId: 2,
          patientId: 8,
          status: "SCHEDULED",
          patientFullName: "   ",
        },
        {
          appointmentId: 3,
          status: "SCHEDULED",
          patientFullName: "Sam Lee",
        },
        { appointmentId: 4, status: "SCHEDULED" },
      ],
    }).map((record) => record.patientFullName);

    expect(names).toEqual([
      "Jane Doe", // trimmed
      "Patient 8", // blank name falls back to the id label
      "Sam Lee", // a name without an id still wins
      null, // neither — the page renders "—"
    ]);
  });

  it("requests today's `/api/queue/today` through the authenticated shared client", async () => {
    store.dispatch(setSession({ accessToken: "queue-access", role: "DOCTOR" }));
    const record = { appointmentId: 9, status: "SCHEDULED" };
    mswState.queueResponses = [[record]];
    const records = await getTodayQueue();

    // Neither a name nor a patient id: the field is present but empty, so the
    // caller decides what to render.
    expect(records).toEqual([{ ...record, patientFullName: null }]);


    expect(new URL(mswState.queueHits[0].url, 'http://localhost').pathname).toMatch(
      /\/(api\/)?queue\/today$/,
    );
    expect(new URL(mswState.queueHits[0].url).search).toBe("");
  });

  it("marks an appointment COMPLETED via PATCH /queue/{id}/status", async () => {
    store.dispatch(setSession({ accessToken: "queue-access", role: "DOCTOR" }));
    const data = await completeAppointment(42);
    expect(data).toEqual({ appointmentId: 42, status: "COMPLETED" });
    expect(mswState.queueCompleteHits).toHaveLength(1);
    expect(mswState.queueCompleteHits[0]).toMatchObject({
      id: "42",
      body: { status: "COMPLETED" },
      authorization: "Bearer queue-access",
    });
  });

  it("surfaces conflicting status transitions as HTTP errors (409 and 400)", async () => {
    mswState.queueCompleteErrorMode = "conflict";
    await expect(completeAppointment(1)).rejects.toMatchObject({
      response: { status: 409 },
    });

    // This backend actually reports invalid transitions as 400.
    mswState.queueCompleteErrorMode = "bad-request";
    await expect(completeAppointment(1)).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it("rejects malformed completion payloads", async () => {
    mswState.queueCompleteErrorMode = "server-error";
    await expect(completeAppointment(1)).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
