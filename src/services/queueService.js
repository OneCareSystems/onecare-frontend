import apiClient from "./apiClient";
import { isToday, toLocalDateString } from "../utils/dateUtils";

/** A name is only trusted when it is a non-empty string. */
const cleanName = (value) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

/** Last-resort label, matching the patient directory's convention. */
const fallbackName = (record) =>
  record.patientId === null || record.patientId === undefined
    ? null
    : `Patient ${record.patientId}`;

/**
 * Queue API adapter for the `{ success, message, data }` envelope, where
 * `data` contains appointment records with an `appointmentId` and `status`.
 *
 * `AppointmentResponse` / `QueueResponse` now carry the patient's full name,
 * so pages read `patientFullName` directly instead of issuing a second
 * `GET /patients` lookup per row. A record without a name degrades to a
 * `Patient <id>` label — never to an invented name, and never to a blank.
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
    return {
      ...record,
      patientFullName:
        cleanName(record.patientFullName) ?? fallbackName(record),
    };
  });
};

/** Local calendar date of a record (`YYYY-MM-DD` prefix, no UTC shift). */
const recordDate = (record) =>
  String(record?.appointmentDate ?? "").slice(0, 10);

/**
 * Fetch the doctor's queue for a local calendar date (`YYYY-MM-DD`).
 *
 * Verified backend contract: `GET /api/queue/today` is server-side scoped to
 * the signed-in doctor and always returns *today's* queue — it does not
 * accept a `?date=` parameter (documented discrepancy). For any other date we
 * still hit the same endpoint and filter client-side against each record's
 * `appointmentDate`, which the backend populates from the local calendar
 * date. Passing no `date` means "today" and skips the filter.
 */
export const getQueue = async ({ date, signal } = {}) => {
  // API_BASE_URL already includes the `/api` prefix.
  const response = await apiClient.get("/queue/today", { signal });
  const records = adaptQueueResponse(response.data);

  const requestedDate = date ?? toLocalDateString();
  if (isToday(requestedDate)) return records;

  return records.filter((record) => recordDate(record) === requestedDate);
};

/** Backwards-compatible alias used by the doctor dashboard. */
export const getTodayQueue = (options) => getQueue(options);

/**
 * Mark an appointment's consultation as completed.
 *
 * Verified backend contract: there is no `POST /api/queue/{id}/complete`;
 * the completion call is `PATCH /api/queue/{appointmentId}/status` with
 * `{ status: "COMPLETED" }` (documented discrepancy). Conflicting status
 * transitions surface as HTTP 409 per the ticket, while this backend
 * currently reports them as HTTP 400 — callers should treat both as
 * "the appointment changed elsewhere".
 */
export const completeAppointment = async (appointmentId, { signal } = {}) => {
  const response = await apiClient.patch(
    `/queue/${appointmentId}/status`,
    { status: "COMPLETED" },
    { signal },
  );

  const payload = response.data;
  if (
    payload?.success !== true ||
    payload.data === null ||
    typeof payload.data !== "object"
  ) {
    throw new Error("Unexpected appointment status response format");
  }
  return payload.data;
};

export default { getQueue, getTodayQueue, completeAppointment };
