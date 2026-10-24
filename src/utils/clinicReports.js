import { workflowError } from "./adminWorkflows";

export const CLINIC_STATUS_FIELDS = [
  ["Scheduled", "scheduled"],
  ["Arrived", "arrived"],
  ["Completed", "completed"],
  ["Cancelled", "cancelled"],
  ["No-show", "noShow"],
];

export function clinicReportError(error) {
  const status = error?.status ?? error?.response?.status;
  if (
    ["ECONNABORTED", "ETIMEDOUT"].includes(error?.code) ||
    [408, 504].includes(status)
  )
    return "Report generation took too long. Please narrow the date range and try again.";
  if (status === 422)
    return "The report range is too large. Please narrow the date range and try again.";
  if (status === 429)
    return "Too many requests. Please wait a moment, then retry the report.";
  return workflowError(error, "generate the clinic report");
}

export function csvCell(value) {
  const text = String(value);
  const safe =
    /^[\s\u0000-\u001f]*[=+\-@\t\r\n]/.test(text) || /^[\t\r\n]/.test(text)
      ? `'${text}`
      : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

// Explicit allowlist: no patient-level fields or unrecognised response keys.
export function clinicReportCsv(report, doctorLabel) {
  const rows = [
    [
      "From",
      "To",
      "Doctor ID",
      "Doctor",
      "Total appointments",
      "Unique patients",
      "Consultations",
      ...CLINIC_STATUS_FIELDS.map(([label]) => label),
      "Generated at",
    ],
    [
      report.from,
      report.to,
      report.doctorId ?? "ALL",
      doctorLabel,
      report.totalAppointments,
      report.uniquePatients,
      report.consultationCount,
      ...CLINIC_STATUS_FIELDS.map(([, key]) => report[key]),
      report.generatedAt,
    ],
  ];
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
