import apiClient from "./apiClient";
import { parseContentDisposition } from "./systemBackupService";
import { validDate } from "../utils/adminWorkflows";

export const CLINIC_REPORT_TIMEOUT_MS = 10500;

/** Export/report types accepted by GET /reports/pharmacy (dash form). */
export const PHARMACY_REPORT_TYPES = Object.freeze([
  Object.freeze({ value: "stock-usage", label: "Stock usage" }),
  Object.freeze({ value: "expiry", label: "Expiry" }),
  Object.freeze({ value: "dispensing-history", label: "Dispensing history" }),
]);

/** Maximum elapsed-day difference; allows 366 inclusive calendar dates. */
export const MAX_REPORT_RANGE_DAYS = 365;

/** Client-side mirror of the backend date rules; "" when the range is valid. */
export function reportRangeError(from, to) {
  if (!from || !to) return "Both from and to dates are required.";
  if (!validDate(from) || !validDate(to)) return "Enter valid dates.";
  if (from > to) return "From date must not be after To date.";
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  if (days > MAX_REPORT_RANGE_DAYS)
    return "Date range too large. Choose dates at most 365 days apart.";
  return "";
}

const asArray = (value) => (Array.isArray(value) ? value : []);
const asCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : 0;
};
const asString = (value) => (typeof value === "string" ? value : "");

const assertEnvelope = (payload, label) => {
  if (
    payload?.success !== true ||
    payload.data == null ||
    typeof payload.data !== "object"
  )
    throw new Error(`Unexpected ${label} response format`);
};

/** Normalise one ClinicReportResponse into the shape the UI renders. */
export function adaptClinicReport(payload) {
  assertEnvelope(payload, "clinic report");
  const data = payload.data;
  const fields = [
    "totalAppointments",
    "consultationCount",
    "scheduled",
    "arrived",
    "completed",
    "cancelled",
    "noShow",
    "uniquePatients",
  ];
  if (
    !validDate(data.from) ||
    !validDate(data.to) ||
    data.from > data.to ||
    fields.some(
      (field) => !Number.isSafeInteger(data[field]) || data[field] < 0,
    )
  )
    throw new Error("Unexpected clinic report response format");
  if (data.doctorId != null && !Number.isSafeInteger(data.doctorId))
    throw new Error("Unexpected clinic report doctor ID");
  return {
    from: asString(data.from),
    to: asString(data.to),
    doctorId: data.doctorId ?? null,
    totalAppointments: asCount(data.totalAppointments),
    consultationCount: asCount(data.consultationCount),
    scheduled: asCount(data.scheduled),
    arrived: asCount(data.arrived),
    completed: asCount(data.completed),
    cancelled: asCount(data.cancelled),
    noShow: asCount(data.noShow),
    uniquePatients: asCount(data.uniquePatients),
    generatedAt: asString(data.generatedAt),
  };
}

const stockUsageRow = (row) => ({
  medicineId: row?.medicineId ?? null,
  medicineName: asString(row?.medicineName),
  unitsDispensed: asCount(row?.unitsDispensed),
});

const expiryRow = (row) => ({
  medicineId: row?.medicineId ?? null,
  medicineName: asString(row?.medicineName),
  expiryDate: asString(row?.expiryDate),
  stockQuantity: asCount(row?.stockQuantity),
  quarantined: row?.quarantined === true,
});

const dispensingRow = (row) => ({
  referenceId: row?.referenceId ?? null,
  source: asString(row?.source),
  dispenseDate: asString(row?.dispenseDate),
  patientId: row?.patientId ?? null,
  patientName: asString(row?.patientName),
  // Contact values arrive partially masked (SDS §2.5.3, AC6) and stay that
  // way on screen and in the export — the UI never unmasks them.
  patientContactNo: asString(row?.patientContactNo),
  medicineName: asString(row?.medicineName),
  quantity: asCount(row?.quantity),
});

/** Normalise one PharmacyReportResponse (sections kept separate). */
export function adaptPharmacyReport(payload) {
  assertEnvelope(payload, "pharmacy report");
  const data = payload.data;
  return {
    type: asString(data.type),
    from: asString(data.from),
    to: asString(data.to),
    stockUsage: asArray(data.stockUsage).map(stockUsageRow),
    expiry: asArray(data.expiry).map(expiryRow),
    dispensingHistory: asArray(data.dispensingHistory).map(dispensingRow),
  };
}

const clinicParams = ({ from, to, doctorId } = {}) => ({
  from,
  to,
  ...(doctorId !== null && doctorId !== undefined && doctorId !== "" ? { doctorId } : {}),
});

const pharmacyParams = ({ type, from, to } = {}) => ({ type, from, to });

export async function getClinicReport({ from, to, doctorId, signal } = {}) {
  const response = await apiClient.get("/reports/clinic", {
    params: clinicParams({ from, to, doctorId }),
    signal,
    timeout: CLINIC_REPORT_TIMEOUT_MS,
  });
  const report = adaptClinicReport(response.data);
  if (
    report.from !== from ||
    report.to !== to ||
    String(report.doctorId ?? "") !== String(doctorId ?? "")
  )
    throw new Error(
      "The clinic report scope does not match the requested filters",
    );
  return report;
}

export async function getPharmacyReport({ type, from, to, signal } = {}) {
  const response = await apiClient.get("/reports/pharmacy", {
    params: pharmacyParams({ type, from, to }),
    signal,
  });
  return adaptPharmacyReport(response.data);
}

/** GET the same query with `format=csv|pdf`; answers with the file bytes. */
async function downloadReport(path, params, fallbackName) {
  const response = await apiClient.get(path, {
    params,
    responseType: "blob",
  });
  return {
    blob: response.data,
    filename:
      parseContentDisposition(response.headers?.["content-disposition"]) ??
      fallbackName,
  };
}

export const downloadClinicReport = ({ from, to, doctorId, format = "csv" }) =>
  downloadReport(
    "/reports/clinic",
    { ...clinicParams({ from, to, doctorId }), format },
    `onecare-clinic-report-${from}-to-${to}.${format}`,
  );

export const downloadPharmacyReport = ({ type, from, to, format = "csv" }) =>
  downloadReport(
    "/reports/pharmacy",
    { ...pharmacyParams({ type, from, to }), format },
    `onecare-pharmacy-report-${type}-${from}-to-${to}.${format}`,
  );
