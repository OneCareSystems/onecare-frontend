import { afterEach, describe, expect, it } from "vitest";

import { setupStore } from "../../../src/app/store";
import {
  fetchQueue,
  fetchTodayQueue,
  selectQueueError,
  selectQueueRecords,
  selectQueueRequestDate,
  selectQueueStatus,
} from "../../../src/features/queue/queueSlice";
import { toLocalDateString } from "../../../src/utils/dateUtils";
import { mswState, resetMswState } from "../../msw/handlers";

const authState = {
  auth: {
    accessToken: "slice-token",
    role: "DOCTOR",
    authStatus: "authenticated",
  },
};

const queueState = (store) => ({
  records: selectQueueRecords(store.getState()),
  status: selectQueueStatus(store.getState()),
  error: selectQueueError(store.getState()),
  requestDate: selectQueueRequestDate(store.getState()),
});

afterEach(resetMswState);

describe("queueSlice — date-aware doctor queue", () => {
  it("fetches today's queue when no date is given and keeps server order", async () => {
    mswState.queueResponses = [
      [
        { appointmentId: 2, status: "SCHEDULED" },
        { appointmentId: 1, status: "COMPLETED" },
      ],
    ];
    const store = setupStore(authState);
    await store.dispatch(fetchTodayQueue());

    const state = queueState(store);
    expect(state.status).toBe("succeeded");
    expect(state.requestDate).toBeNull();
    // Server-authoritative order — no client-side re-sorting.
    expect(state.records.map((record) => record.appointmentId)).toEqual([2, 1]);
  });

  it("records the requested date on the state", async () => {
    mswState.queueResponses = [[]];
    const store = setupStore(authState);
    await store.dispatch(fetchQueue({ date: "2020-05-05" }));
    expect(queueState(store).requestDate).toBe("2020-05-05");
  });

  it("keeps previous rows visible while a refresh is pending (non-destructive)", async () => {
    mswState.queueResponses = [
      [
        {
          appointmentId: 5,
          status: "SCHEDULED",
          appointmentDate: "2020-05-05",
        },
      ],
    ];
    const store = setupStore(authState);
    await store.dispatch(fetchQueue({ date: "2020-05-05" }));
    expect(queueState(store).records).toHaveLength(1);

    mswState.queueErrorMode = "delay";
    const pending = store.dispatch(fetchQueue({ date: "2020-05-05" }));
    // Rows stay on screen during the refresh instead of blanking out.
    expect(queueState(store).records).toHaveLength(1);
    expect(queueState(store).status).toBe("loading");

    mswState.queueErrorMode = null;
    mswState.queueResponses = [[]];
    await pending;
    expect(queueState(store).records).toHaveLength(0);
  });

  it("drops a stale response when the date changed while in flight", async () => {
    const store = setupStore(authState);

    mswState.queueErrorMode = "delay";
    const slow = store.dispatch(fetchQueue({ date: "2020-05-05" }));
    // Let the slow request actually start its delay before flipping the mode,
    // otherwise the handler would miss "delay" and race the faster request.
    await new Promise((resolve) => setTimeout(resolve, 20));

    mswState.queueErrorMode = null;
    mswState.queueResponses = [
      [
        {
          appointmentId: 9,
          status: "SCHEDULED",
          appointmentDate: "2020-05-06",
        },
      ],
    ];
    await store.dispatch(fetchQueue({ date: "2020-05-06" }));
    expect(
      queueState(store).records.map((record) => record.appointmentId),
    ).toEqual([9]);

    // The old date's response arrives later and must be discarded.
    mswState.queueResponses = [];
    await slow;
    const state = queueState(store);
    expect(state.records.map((record) => record.appointmentId)).toEqual([9]);
    expect(state.status).toBe("succeeded");
    expect(state.requestDate).toBe("2020-05-06");
  });

  it("blocks a duplicate in-flight request for the same date only", async () => {
    const store = setupStore(authState);
    mswState.queueErrorMode = "delay";
    const first = store.dispatch(fetchQueue({ date: "2020-05-05" }));

    // Same date → condition blocks the duplicate before any network call.
    const duplicate = store.dispatch(fetchQueue({ date: "2020-05-05" }));
    duplicate?.catch?.(() => {});

    // A different date may still start.
    const otherDate = store.dispatch(fetchQueue({ date: "2020-05-06" }));

    mswState.queueErrorMode = null;
    await Promise.allSettled([first, duplicate, otherDate]);
    // Only the first and the different-date request reached the network.
    expect(mswState.queueHits).toHaveLength(2);
  });

  it("surfaces fetch failures as a retryable failed state", async () => {
    mswState.queueErrorMode = "server-error";
    const store = setupStore(authState);
    await store.dispatch(fetchQueue({ date: toLocalDateString() }));

    const state = queueState(store);
    expect(state.status).toBe("failed");
    expect(state.error).toBeTruthy();
  });
});
