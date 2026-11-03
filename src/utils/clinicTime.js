// Appointment API timestamps have no offset. Compare their wall-clock fields
// in the clinic timezone rather than the browser's timezone.
export const CLINIC_TIME_ZONE = "Asia/Colombo";
export function clinicDateTime(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: CLINIC_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}
export const clinicToday = (now) => clinicDateTime(now).slice(0, 10);
export const isFutureClinicSlot = (date, slot, now) =>
  `${date}T${slot}:00` > clinicDateTime(now);
