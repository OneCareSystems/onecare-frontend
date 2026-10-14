import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const fetchTodayQueue = createAsyncThunk(
  "queue/fetchTodayQueue",
  async (_, { signal }) => {
    const { getTodayQueue } = await import("../../services/queueService");
    return getTodayQueue({ signal });
  },
  {
    condition: (_, { getState }) => getState().queue.status !== "loading",
  },
);

const initialState = {
  records: [],
  status: "idle",
  error: null,
};

const queueSlice = createSlice({
  name: "queue",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodayQueue.pending, (state) => {
        state.records = [];
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTodayQueue.fulfilled, (state, action) => {
        state.records = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchTodayQueue.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Unable to load queue.";
      });
  },
});

export const selectQueueRecords = (state) => state.queue.records;
export const selectQueueStatus = (state) => state.queue.status;
export const selectQueueError = (state) => state.queue.error;

export default queueSlice.reducer;
