export const patientLocale = (language) =>
  language?.startsWith("ta") ? "ta-LK" : "en-LK";
export function formatPatientDate(date, language) {
  return new Intl.DateTimeFormat(patientLocale(language), {
    dateStyle: "long",
    timeZone: "Asia/Colombo",
  }).format(new Date(`${date}T12:00:00+05:30`));
}
export function formatPatientTime(time, language) {
  return new Intl.DateTimeFormat(patientLocale(language), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Colombo",
  }).format(
    new Date(`2000-01-01T${time.length === 5 ? time + ":00" : time}+05:30`),
  );
}
export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
