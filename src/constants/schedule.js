/**
 * Doctor working schedules (FR009, UC4).
 *
 * Day enum order and time helpers shared by the clinic-configuration
 * screen, the schedule service and the MSW mock so validation never
 * drifts between them. Times are zero-padded 24h `HH:mm` strings — the
 * wire format of /api/doctors/{doctorId}/schedule.
 */

/** Day enum in declaration order (used to keep selections sorted). */
export const WORKING_DAYS = Object.freeze([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

/** Short display labels keyed by enum name. */
export const DAY_LABELS = Object.freeze({
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
});

/** Zero-padded 24h clock time, e.g. 09:00 or 17:30. */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidTime = (value) => TIME_PATTERN.test(String(value ?? ""));

/** Pad a single-digit hour ("9:00" → "09:00"); other input passes through. */
export const normalizeTime = (value) => {
  const text = String(value ?? "").trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (!match) return text;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
};

/**
 * The first overlapping pair (UC4 alt flow), e.g. 09:00–12:00 vs
 * 11:00–13:00. Adjacent slots (…–12:00 and 12:00–…) do not overlap.
 * Expects zero-padded HH:mm strings (normalizeTime first).
 */
export const findConflictingSlots = (timeSlots) => {
  for (let i = 0; i < timeSlots.length; i += 1) {
    for (let j = i + 1; j < timeSlots.length; j += 1) {
      const first = timeSlots[i];
      const second = timeSlots[j];
      if (first.start < second.end && second.start < first.end) {
        return [first, second];
      }
    }
  }
  return [];
};
