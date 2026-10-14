import { afterEach, describe, expect, it } from "vitest";
import {
  adaptQueueResponse,
  completeAppointment,
  getQueue,
  getTodayQueue,
} from "../../src/services/queueService";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { mswState, resetMswState } from "../msw/handlers";
import { toLocalDateString } from "../../src/utils/dateUtils";

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
    ).toEqual([record]);
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

  it("requests today's `/api/queue/today` through the authenticated shared client", async () => {
    store.dispatch(setSession({ accessToken: "queue-access", role: "DOCTOR" }));
    const record = { appointmentId: 9, status: "SCHEDULED" };
    mswState.queueResponses = [[record]];
    const records = await getTodayQueue();

    expect(records).toEqual([record]);
    expect(new URL(mswState.queueHits[0].url).pathname).toMatch(
      /\/api\/queue\/today$/,
    );
    expect(mswState.queueHits[0].authorization).toBe("Bearer queue-access");
  });

  it("returns today's queue unfiltered when no date is passed", async () => {
    const today = toLocalDateString();
    mswState.queueResponses = [
      [
        { appointmentId: 1, status: "SCHEDULED", appointmentDate: today },
        { appointmentId: 2, status: "COMPLETED", appointmentDate: today },
      ],
    ];
    const records = await getQueue();
    expect(records).toHaveLength(2);
  });

  it("filters client-side for other dates (backend has no ?date= support)", async () => {
    mswState.queueResponses = [
      [
        {
          appointmentId: 1,
          status: "SCHEDULED",
          appointmentDate: "2020-05-05",
        },
        {
          appointmentId: 2,
          status: "COMPLETED",
          appointmentDate: "2020-05-06",
        },
      ],
    ];
    const records = await getQueue({ date: "2020-05-05" });
    expect(records.map((record) => record.appointmentId)).toEqual([1]);
    // The request still hits the today endpoint — the documented contract.
    expect(new URL(mswState.queueHits[0].url).pathname).toMatch(
      /\/api\/queue\/today$/,
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
