import { useState } from "react";

import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Input from "../../components/Input";
import Select from "../../components/Select";
import StatCard from "../../components/StatCard";
import Table from "../../components/Table";
import { SuperAdminPageHeader } from "../../features/superAdmin/SuperAdminPageHeader";
import downloadBlob from "../../utils/downloadBlob";
import { workflowError } from "../../utils/adminWorkflows";
import {
  PHARMACY_REPORT_TYPES,
  downloadPharmacyReport,
  getPharmacyReport,
  reportRangeError,
} from "../../services/reportService";

/* Normalize the report type returned by the API so the section lookup is
   case-insensitive and tolerant of enum casing differences. */
const normalizeType = (raw) =>
  String(raw ?? "").toUpperCase().replace(/\s+/g, "_");

export default function PharmacyReportsPage() {
  const [type, setType] = useState(PHARMACY_REPORT_TYPES[0].value),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [rangeError, setRangeError] = useState(""),
    [error, setError] = useState(""),
    [report, setReport] = useState(null),
    [applied, setApplied] = useState(null),
    [loading, setLoading] = useState(false),
    [exporting, setExporting] = useState(null);

  const generate = async (event) => {
    event.preventDefault();
    const invalid = reportRangeError(from, to);
    setRangeError(invalid);
    setError("");
    if (invalid) {
      setReport(null);
      setApplied(null);
      return;
    }
    const filters = { type, from, to };
    setLoading(true);
    try {
      setApplied(filters);
      setReport(await getPharmacyReport(filters));
    } catch (requestError) {
      setReport(null);
      setError(
        workflowError(requestError, "generate the pharmacy report") ||
          "Could not generate the pharmacy report.",
      );
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format) => {
    if (!applied || exporting !== null) return;
    setExporting(format);
    setError("");
    try {
      const file = await downloadPharmacyReport({ ...applied, format });
      downloadBlob(file.blob, file.filename);
    } catch (requestError) {
      setError(
        workflowError(requestError, "export the pharmacy report") ||
          "Could not export the pharmacy report.",
      );
    } finally {
      setExporting(null);
    }
  };

  const section = sectionFor(normalizeType(report?.type));
  const summaryValues = report ? summaryFor(section, report) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* ---- Header (mirrors Clinic Reports) ---- */}
      <SuperAdminPageHeader
        icon="pill"
        badgeText="Pharmacy analytics · Read-only"
        title="Pharmacy Reports"
        description="Stock usage, expiry and dispensing history straight from the live pharmacy data for any date range."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-1.5 bg-white"
              disabled={loading || !report || exporting !== null}
              loading={exporting === "csv"}
              title={
                report
                  ? "Download the displayed report as CSV"
                  : "Generate a report first"
              }
              onClick={() => exportReport("csv")}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-1.5 bg-white"
              disabled={loading || !report || exporting !== null}
              loading={exporting === "pdf"}
              title={
                report
                  ? "Download the displayed report as PDF"
                  : "Generate a report first"
              }
              onClick={() => exportReport("pdf")}
            >
              Export PDF
            </Button>
          </>
        }
      />

      {/* ---- Filters ---- */}
      <section
        aria-label="Report filters"
        className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5"
      >
        <form
          className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={generate}
        >
          <Select
            name="report-type"
            label="Report type"
            selectClassName="rounded-xl border-slate-200 bg-slate-50/70 py-3.5 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
            value={type}
            onChange={(event) => setType(event.target.value)}
            options={PHARMACY_REPORT_TYPES}
            showPlaceholder={false}
          />
          <Input
            name="report-from"
            label="Report from date"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <Input
            name="report-to"
            label="Report to date"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <Button type="submit" loading={loading}>
            Generate report
          </Button>
        </form>
        {(rangeError || error) && (
          <div className="mt-3">
            <ErrorMessage message={rangeError || error} />
          </div>
        )}
      </section>

      {/* ---- Results ---- */}
      {loading ? (
        <ReportSkeleton />
      ) : report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryValues.map(([label, value, icon]) => (
              <StatCard
                key={label}
                label={label}
                value={value}
                icon={icon}
                iconClass="bg-primary-50 text-primary-700"
              />
            ))}
          </div>

          <section
            aria-labelledby="pharmacy-report-breakdown"
            className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2
                id="pharmacy-report-breakdown"
                className="text-base font-semibold text-neutral-950"
              >
                {section.title}
              </h2>
              <p role="status" className="text-xs text-neutral-500">
                {report.from} to {report.to}
                {report.type === "DISPENSING_HISTORY"
                  ? " · contact numbers are partially masked"
                  : ""}
              </p>
            </div>

            <Table
              columns={section.columns}
              data={section.rows(report)}
              getRowKey={(row, index) => section.rowKey(row, index)}
              label={`${section.title} report`}
              emptyTitle={`No ${section.title.toLowerCase()} entries`}
              emptyMessage="No entries match this range."
            />
          </section>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white py-12 text-center">
          <p role="status" className="text-sm text-neutral-500">
            Choose a report type and a date range of up to one year, then
            generate the pharmacy report. Export follows the filters applied
            here.
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeleton (parity with backup page)                          */
/* ------------------------------------------------------------------ */

function ReportSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
      <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Summary tiles per report type                                       */
/* ------------------------------------------------------------------ */

function summaryFor(section, report) {
  const rows = section.rows(report) ?? [];
  const total = rows.length;

  if (section.key === "EXPIRY") {
    const quarantined = rows.filter((r) => r.quarantined).length;
    const units = rows.reduce(
      (sum, r) => sum + (Number(r.stockQuantity) || 0),
      0,
    );
    return [
      ["Expiring items", total, "pill"],
      ["Quarantined", quarantined, "shield-alert"],
      ["Units in stock", units, "package"],
      ["Report rows", total, "list"],
    ];
  }

  if (section.key === "DISPENSING_HISTORY") {
    const units = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const uniquePatients = new Set(
      rows
        .filter((r) => r.patientId != null)
        .map((r) => String(r.patientId)),
    ).size;
    return [
      ["Dispense events", total, "clipboard-list"],
      ["Units dispensed", units, "package"],
      ["Unique patients", uniquePatients, "users"],
      ["Report rows", total, "list"],
    ];
  }

  // STOCK_USAGE
  const units = rows.reduce(
    (sum, r) => sum + (Number(r.unitsDispensed) || 0),
    0,
  );
  return [
    ["Medicines tracked", total, "pill"],
    ["Units dispensed", units, "package"],
    ["Report rows", total, "list"],
    ["Range", report ? `${report.from} → ${report.to}` : "—", "calendar"],
  ];
}

/* ------------------------------------------------------------------ */
/* Section definitions — mirrors PharmacyReportResponse sections      */
/* ------------------------------------------------------------------ */

function sectionFor(type) {
  if (type === "EXPIRY")
    return {
      key: "EXPIRY",
      title: "Expiring stock",
      columns: [
        { key: "medicineName", header: "Medicine" },
        { key: "expiryDate", header: "Expiry date" },
        { key: "stockQuantity", header: "Stock quantity" },
        {
          key: "quarantined",
          header: "Quarantined",
          render: (row) => (row.quarantined ? "Yes" : "No"),
        },
      ],
      rows: (report) => report.expiry ?? [],
      rowKey: (row, index) => `${row.medicineId ?? "row"}-${index}`,
    };

  if (type === "DISPENSING_HISTORY")
    return {
      key: "DISPENSING_HISTORY",
      title: "Dispensing history",
      columns: [
        { key: "dispenseDate", header: "Dispensed" },
        { key: "source", header: "Source" },
        { key: "patientName", header: "Patient" },
        { key: "patientContactNo", header: "Contact (masked)" },
        { key: "medicineName", header: "Medicine" },
        { key: "quantity", header: "Quantity" },
      ],
      rows: (report) => report.dispensingHistory ?? [],
      rowKey: (row, index) =>
        `${row.referenceId ?? row.medicineId ?? "row"}-${index}`,
    };

  return {
    key: "STOCK_USAGE",
    title: "Stock usage",
    columns: [
      { key: "medicineName", header: "Medicine" },
      { key: "unitsDispensed", header: "Units dispensed" },
    ],
    rows: (report) => report.stockUsage ?? [],
    rowKey: (row, index) => `${row.medicineId ?? "row"}-${index}`,
  };
}
