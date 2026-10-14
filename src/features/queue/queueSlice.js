import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

/** The date a request was made for; `null` means "today" (no argument). */
const requestedDateOf = (arg) => arg?.date ?? null;

/**
 * Fetch the doctor's queue for a local calendar date (`YYYY-MM-DD`), or
 * today's queue when no date is given.
 *
 * The slice keeps the previous rows visible while a refresh is in flight
 * (non-destructive pending) and discards responses whose request date no
 * longer matches the most recently requested one (stale-response guard), so
 * a slow response for a previously selected date can never overwrite the
 * queue of the date the doctor is now viewing.
 */
export const fetchQueue = createAsyncThunk(
  "queue/fetchQueue",
  async ({ date } = {}, { signal }) => {
    // Dynamic import keeps the apiClient ↔ store ↔ slice cycle lazy.
    const { getQueue } = await import("../../services/queueService");
    const records = await getQueue({ date, signal });
    return { date: requestedDateOf({ date }), records };
  },
  {
    // One in-flight request per date. A request for a *different* date is
    // still allowed to start; the reducer guard drops whichever response
    // arrives for the out-of-date request.
    condition: (arg, { getState }) => {
      const queue = getState().queue;
      return !(
        queue.status === "loading" && queue.requestDate === requestedDateOf(arg)
      );
    },
  },
);

/** Backwards-compatible alias used by the doctor dashboard. */
export const fetchTodayQueue = () => fetchQueue();

const initialState = {
  records: [],
  status: "idle",
  error: null,
  requestDate: null,
};

const queueSlice = createSlice({
  name: "queue",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchQueue.pending, (state, action) => {
        // Keep existing rows on screen while refreshing — the queue order
        // must never blank out mid-consultation.
        state.status = "loading";
        state.error = null;
        state.requestDate = requestedDateOf(action.meta.arg);
      })
      .addCase(fetchQueue.fulfilled, (state, action) => {
        // Stale response: the doctor switched dates while this was in flight.
        if (action.payload.date !== state.requestDate) return;
        state.records = action.payload.records;
        state.status = "succeeded";
      })
      .addCase(fetchQueue.rejected, (state, action) => {
        // Unmount aborts and out-of-date responses must not surface errors.
        if (action.meta.aborted) return;
        if (requestedDateOf(action.meta.arg) !== state.requestDate) return;
        state.status = "failed";
        state.error = action.error.message ?? "Unable to load queue.";
      });
  },
});

export const selectQueueRecords = (state) => state.queue.records;
export const selectQueueStatus = (state) => state.queue.status;
export const selectQueueError = (state) => state.queue.error;
export const selectQueueRequestDate = (state) => state.queue.requestDate;

export default queueSlice.reducer;
