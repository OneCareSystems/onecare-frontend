import { toLocalDateString } from "./dateUtils";

export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "ARRIVED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];
export const statusLabel = (value) =>
  ({ NO_SHOW: "No-show", UNPAID: "Pending" })[value] ??
  String(value)
    .toLowerCase()
    .replace(/^./, (s) => s.toUpperCase());
export function positiveId(value) {
  const text = String(value);
  if (
    !/^[1-9]\d*$/.test(text) ||
    text.length > 19 ||
    BigInt(text) > 9223372036854775807n ||
    (typeof value === "number" && !Number.isSafeInteger(value))
  )
    throw new Error("Invalid identifier");
  return text;
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function dateRangeError(from, to) {
  if ((from && !validDate(from)) || (to && !validDate(to)))
    return "Enter valid dates.";
  return from && to && from > to
    ? "From date must be on or before To date."
    : "";
}
export function bookingError(
  { patientId, doctorId, date, slot },
  now = new Date(),
) {
  if (!patientId) return "Select a patient.";
  if (!doctorId) return "Select a doctor.";
  if (!validDate(date)) return "Select a valid appointment date.";
  if (date < toLocalDateString(now))
    return "Appointment date cannot be in the past.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot))
    return "Select an available time slot.";
  if (new Date(`${date}T${slot}:00`).getTime() <= now.getTime())
    return "Select a future appointment time.";
  return "";
}
export function workflowError(error, action = "complete this request") {
  const status = error?.status ?? error?.response?.status;
  if (error?.config?._isRefresh)
    return "Unable to refresh your session. Please try again shortly.";
  if (status === 401)
    return "Your session could not be verified. Please sign in again.";
  if (status === 403)
    return "You do not have permission to perform this action.";
  if (status === 404)
    return "The selected record is no longer available. Refresh and select again.";
  if (status === 409)
    return "The record changed or the slot is unavailable. Review the refreshed data before trying again.";
  if (status === 422 || status === 400)
    return "The request was not accepted. Review your selections; your input has been kept.";
  if (status === 429)
    return "Too many requests. Refresh will resume after a short pause.";
  return `Unable to ${action}. Your input has been kept. Please try again.`;
}

// Integer arithmetic only. No floating-point totals or balances are calculated.
export function moneyCents(value) {
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text))
    throw new Error("Invalid monetary value");
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
export function decimalMoney(value) {
  const cents = moneyCents(value);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}
export const displayMoney = (value) => `LKR ${decimalMoney(value)}`;
export function paymentError(amount, balance) {
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(amount))
    return "Enter an amount with at most 8 integer digits and 2 decimal places.";
  if (moneyCents(amount) <= 0n) return "Amount must be greater than zero.";
  return moneyCents(amount) > moneyCents(balance)
    ? "Amount cannot exceed the outstanding balance."
    : "";
}

// Preserve monetary JSON number tokens before JSON.parse can round them.
// This scans JSON strings (including escapes), so text containing fake keys is untouched.
export function parseInvoiceJson(raw) {
  if (
    typeof raw !== "string" ||
    (!raw.trimStart().startsWith("{") && !raw.trimStart().startsWith("["))
  )
    return raw;
  const moneyKeys = new Set([
    "total",
    "amountPaid",
    "outstandingBalance",
    "unitPrice",
    "lineTotal",
    "amount",
  ]);
  let out = "",
    index = 0;
  while (index < raw.length) {
    if (raw[index] !== '"') {
      out += raw[index++];
      continue;
    }
    const start = index++;
    while (index < raw.length) {
      if (raw[index] === "\\") {
        index += 2;
        continue;
      }
      if (raw[index++] === '"') break;
    }
    const token = raw.slice(start, index);
    out += token;
    const colon = raw.slice(index).match(/^\s*:\s*/);
    if (!colon || !moneyKeys.has(JSON.parse(token))) continue;
    out += colon[0];
    index += colon[0].length;
    const number = raw.slice(index).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (number) {
      out += JSON.stringify(number[0]);
      index += number[0].length;
    }
  }
  return JSON.parse(out);
}
