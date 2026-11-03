/**
 * Utility functions for system maintenance, backup timing, and formatting.
 */

export const ordinal = (n) => {
  const v = Number(n) % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const last = Number(n) % 10;
  return `${n}${last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th"}`;
};

export const relTime = (iso) => {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  return `${day}d ago`;
};

export const relFuture = (iso) => {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const diffMs = then - Date.now();
  if (diffMs <= 0) return "due now";
  const min = Math.ceil(diffMs / 60000);
  const hr = Math.ceil(min / 60);
  const day = Math.ceil(hr / 24);
  if (min < 60) return `in ${min}m`;
  if (hr < 48) return `in ${hr}h`;
  return `in ${day}d`;
};

export const fmtSize = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

export const addMonths = (date, n) => {
  const year = date.getFullYear();
  const month = date.getMonth() + n;
  return new Date(year, month, 1);
};

export const backupAgeDays = (latestBackupAt) => {
  if (!latestBackupAt) return null;
  const timestamp = new Date(latestBackupAt).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
};

/**
 * Compute the next N backup runs from day-of-month and execution time.
 */
export const computeUpcomingRuns = (dayOfMonth, executionTime, count = 3) => {
  if (!dayOfMonth) return [];
  const [hh, mm] = String(executionTime ?? "23:59")
    .split(":")
    .map((x) => Number(x) || 0);

  const runs = [];
  let cursor = new Date();
  for (let i = 0; i < count + 2 && runs.length < count; i++) {
    const base = addMonths(cursor, i);
    const y = base.getFullYear();
    const m = base.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const day = Math.min(dayOfMonth, lastDay);
    const run = new Date(y, m, day, hh, mm, 0, 0);
    if (run.getTime() > Date.now()) runs.push(run);
  }
  return runs.slice(0, count);
};
