const DASH = "\u2014";

/** `09:00:00` -> `09:00`; echoes anything unexpected. */
export const formatTimeSlot = (timeSlot) => {
  const value = String(timeSlot ?? "");
  return /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : value || DASH;
};

/** `2026-10-14T09:00:00` -> `2026-10-14`. */
export const toDateOnly = (value) => String(value ?? "").slice(0, 10);

/** 125 -> `02:05`. */
export const formatElapsed = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};
