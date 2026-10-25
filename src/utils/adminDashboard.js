import { APPOINTMENT_STATUSES, positiveId } from "./adminWorkflows";

// Only aggregate counters leave this function.
export function appointmentCounts(rows, date) {
  if (!Array.isArray(rows)) throw new Error("Unexpected appointment list");
  const byStatus = Object.fromEntries(APPOINTMENT_STATUSES.map((s) => [s, 0]));
  const seen = new Set();
  for (const row of rows) {
    const id = positiveId(row?.appointmentId);
    if (
      seen.has(id) ||
      !Object.hasOwn(byStatus, row.status) ||
      row.appointmentDate !== date
    )
      throw new Error("Unexpected dashboard appointment data");
    seen.add(id);
    byStatus[row.status]++;
  }
  return { total: rows.length, byStatus };
}

export function pendingInvoiceCount(page) {
  if (
    !Array.isArray(page?.content) ||
    !Number.isSafeInteger(page.totalElements) ||
    page.totalElements < 0 ||
    page.content.length > page.totalElements
  )
    throw new Error("Unexpected invoice count response");
  return page.totalElements;
}
