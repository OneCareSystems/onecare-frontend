import apiClient from "./apiClient";

/**
 * Queue API adapter for the `{ success, message, data }` envelope, where
 * `data` contains appointment records with an `appointmentId` and `status`.
 */
export const adaptQueueResponse = (payload) => {
  if (payload?.success !== true || !Array.isArray(payload.data)) {
    throw new Error("Unexpected queue response format");
  }

  return payload.data.map((record) => {
    if (
      !record ||
      (typeof record.appointmentId !== "string" &&
        typeof record.appointmentId !== "number") ||
      String(record.appointmentId).length === 0 ||
      typeof record.status !== "string" ||
      record.status.trim().length === 0
    ) {
      throw new Error("Unexpected queue record format");
    }
    return record;
  });
};

export const getTodayQueue = async ({ signal } = {}) => {
  // API_BASE_URL already includes the `/api` prefix.
  const response = await apiClient.get("/queue/today", { signal });
  return adaptQueueResponse(response.data);
};

export default { getTodayQueue };
