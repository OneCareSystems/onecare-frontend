// Synthetic aggregates for the explicitly selected report preview only.
// These are not patient records, backend DTOs, or fallback data for live requests.
export const DEMO_REPORT_DOCTORS = [
  { value: "demo-doctor-a", label: "Demo Doctor A" },
  { value: "demo-doctor-b", label: "Demo Doctor B" },
];
const demoRows = Array.from({ length: 7 }, (_, day) =>
  DEMO_REPORT_DOCTORS.map((doctor, index) => {
    const appointments = 10 + day * 2 + index;
    const noShow = 1 + (day % 2);
    return {
      date: `2026-10-${12 + day}`,
      doctorId: doctor.value,
      doctor: doctor.label,
      appointments,
      newPatients: 2 + index + (day % 3),
      arrived: appointments - noShow,
      noShow,
      revenueCents: (appointments - noShow) * 150000,
      queueMinutes: 12 + day + index,
    };
  }),
).flat();

export function buildDemoReport({ from = "", to = "", doctor = "" } = {}) {
  const rows = demoRows.filter(
    (row) =>
      (!from || row.date >= from) &&
      (!to || row.date <= to) &&
      (!doctor || row.doctorId === doctor),
  );
  const totals = rows.reduce(
    (sum, row) => ({
      appointments: sum.appointments + row.appointments,
      newPatients: sum.newPatients + row.newPatients,
      arrived: sum.arrived + row.arrived,
      noShow: sum.noShow + row.noShow,
      revenueCents: sum.revenueCents + row.revenueCents,
    }),
    { appointments: 0, newPatients: 0, arrived: 0, noShow: 0, revenueCents: 0 },
  );
  const trend = [...new Set(rows.map((row) => row.date))].map((date) => ({
    date,
    appointments: rows
      .filter((row) => row.date === date)
      .reduce((sum, row) => sum + row.appointments, 0),
  }));
  return {
    rows,
    totals,
    trend,
    attendance: totals.appointments
      ? `${Math.round((totals.arrived / totals.appointments) * 100)}%`
      : "—",
  };
}

export function csvCell(value) {
  const text = String(value);
  // Quote every cell, escape embedded quotes, and neutralize spreadsheet formulas.
  const safe =
    /^[\s]*[=+\-@\t\r\n]/.test(text) || /^[\t\r\n]/.test(text)
      ? `'${text}`
      : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function demoReportCsv(rows) {
  const values = [
    [
      "Data source",
      "Date",
      "Doctor",
      "Appointments",
      "New patients",
      "Arrived",
      "No-show",
      "Revenue (LKR)",
      "Average queue (minutes)",
    ],
    ...rows.map((row) => [
      "DEMO - synthetic data",
      row.date,
      row.doctor,
      row.appointments,
      row.newPatients,
      row.arrived,
      row.noShow,
      (row.revenueCents / 100).toFixed(2),
      row.queueMinutes,
    ]),
  ];
  return (
    "\uFEFF" + values.map((row) => row.map(csvCell).join(",")).join("\r\n")
  );
}

export function downloadDemoReport(rows, from, to) {
  const url = URL.createObjectURL(
    new Blob([demoReportCsv(rows)], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `onecare-DEMO-clinic-report-${from || "start"}-to-${to || "end"}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Keep the object URL alive until the browser has accepted the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
