import { afterEach, describe, expect, it } from "vitest";
import {
  adaptQueueResponse,
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


    expect(new URL(mswState.queueHits[0].url, 'http://localhost').pathname).toMatch(
      /\/(api\/)?queue\/today$/,
    );
    expect(mswState.queueHits[0].authorization).toBe("Bearer queue-access");
  });
});
