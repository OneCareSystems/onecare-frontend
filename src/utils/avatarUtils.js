/**
 * Shared avatar helpers for the Doctor module.
 *
 * These were previously duplicated across PatientRecordsPage.jsx and
 * PatientDetails.jsx. Centralised here so every patient list/card uses the
 * same stable colour assignment.
 */

/** Tailwind class pairs applied round-robin based on a name hash. */
export const AVATAR_TINTS = [
  "bg-primary-50 text-primary-700 ring-primary-100",
  "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "bg-amber-50 text-amber-700 ring-amber-100",
  "bg-sky-50 text-sky-700 ring-sky-100",
  "bg-violet-50 text-violet-700 ring-violet-100",
  "bg-rose-50 text-rose-700 ring-rose-100",
];

/**
 * Returns a stable Tailwind class string for the given name.
 * The same name always maps to the same colour bucket.
 */
export const tintFor = (name) => {
  const key = String(name ?? "");
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
};

/**
 * Extracts up to two initials from a full name.
 * Falls back to "?" when the name is absent.
 *
 * @param {string | null | undefined} name
 * @returns {string}
 */
export const initialsFor = (name) => {
  const parts = String(name ?? "").trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
