/**
 * Local-calendar date helpers (no UTC conversion).
 *
 * API dates use the `YYYY-MM-DD` shape. Building that string from
 * `toISOString()` would shift the day for users west of UTC, so every
 * helper here reads the date components with the *local* getters.
 */

/** Format a Date as the local `YYYY-MM-DD` calendar date. */
export const toLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** True when `dateString` equals today's local calendar date. */
export const isToday = (dateString, now = new Date()) =>
  dateString === toLocalDateString(now);

/** Human-readable form of a `YYYY-MM-DD` string; echoes input if invalid. */
export const formatDisplayDate = (dateString) => {
  const [year, month, day] = String(dateString).split("-").map(Number);
  if (!year || !month || !day) return dateString;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
