import { useState } from "react";

import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Input from "../../components/Input";
import Select from "../../components/Select";
import StatCard from "../../components/StatCard";
import Table from "../../components/Table";
import { SuperAdminPageHeader } from "../../features/superAdmin/SuperAdminPageHeader";
import useWorkflowResource from "../../hooks/useWorkflowResource";
import { listDoctors } from "../../services/adminWorkflowService";
import {
  downloadClinicReport,
  getClinicReport,
  reportRangeError,
} from "../../services/reportService";
import downloadBlob from "../../utils/downloadBlob";
import { workflowError } from "../../utils/adminWorkflows";

/**
 * Super-admin clinic report screen (FR039, UC24 — governance read-only).
 *
 * Deliberately its own page: the admin module owns `components/admin/
 * ClinicReports.jsx` for admin staff, while this screen lives in the
 * super-admin area with its own governance header, stat tiles and status
 * ledger. Both call the same `GET /reports/clinic` endpoint and the same
 * CSV/PDF export (`format=` on the same query).
 */
const SUMMARY_TILES = [
  ["Total appointments", "totalAppointments", "calendar"],
  ["Consultations", "consultationCount", "stethoscope"],
  ["Unique patients", "uniquePatients", "users"],
  ["Completed", "completed", "list-checks"],
];

const STATUS_ROWS = [
  ["Scheduled", "scheduled"],
  ["Arrived", "arrived"],
  ["Completed", "completed"],
  ["Cancelled", "cancelled"],
  ["No-show", "noShow"],
];

export default function ClinicReportsPage() {
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [doctor, setDoctor] = useState(""),
    [rangeError, setRangeError] = useState(""),
    [error, setError] = useState(""),
    [report, setReport] = useState(null),
    [applied, setApplied] = useState(null),
    [loading, setLoading] = useState(false),
    [exporting, setExporting] = useState(null);
  const doctors = useWorkflowResource(listDoctors);

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
    const filters = { from, to, doctorId: doctor || null };
    setLoading(true);
    try {
      setApplied(filters);
      setReport(await getClinicReport(filters));
    } catch (requestError) {
      setReport(null);
      setError(
        workflowError(requestError, "generate the clinic report") ||
          "Could not generate the clinic report.",
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
      const file = await downloadClinicReport({ ...applied, format });
      downloadBlob(file.blob, file.filename);
    } catch (requestError) {
      setError(
        workflowError(requestError, "export the clinic report") ||
          "Could not export the clinic report.",
      );
    } finally {
      setExporting(null);
    }
  };

  const doctorsError = doctors.error
    ? workflowError(doctors.error, "load doctors")
    : "";

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* ---- Header ---- */}
      <SuperAdminPageHeader
        icon="stethoscope"
        badgeText="Clinic analytics · Read-only"
        title="Clinic Reports"
        description="Appointment, consultation and patient aggregates straight from the live clinic data for any date range."
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
          <Select
            name="report-doctor"
            label="Report doctor"
            placeholder="All doctors"
            selectClassName="rounded-xl border-slate-200 bg-slate-50/70 py-3.5 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
            value={doctor}
            onChange={(event) => setDoctor(event.target.value)}
            options={(doctors.data ?? []).map((row) => ({
              value: String(row.userId),
              label: row.username ?? `Doctor #${row.userId}`,
            }))}
          />
          <Button type="submit" loading={loading}>
            Generate report
          </Button>
        </form>

        {rangeError || error ? (
          <div className="mt-3">
            <ErrorMessage message={rangeError || error} />
          </div>
        ) : null}

        {doctorsError ? (
          <div className="mt-3">
            <ErrorMessage
              title="Could not load doctors"
              message={doctorsError}
            />
          </div>
        ) : null}
      </section>

      {/* ---- Results ---- */}
      {loading ? (
        <ReportSkeleton />
      ) : report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {SUMMARY_TILES.map(([label, key, icon]) => (
              <StatCard
                key={key}
                label={label}
                value={report[key] ?? 0}
                icon={icon}
                iconClass="bg-primary-50 text-primary-700"
              />
            ))}
          </div>

          <section
            aria-labelledby="clinic-report-breakdown"
            className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2
                id="clinic-report-breakdown"
                className="text-base font-semibold text-neutral-950"
              >
                Status breakdown
              </h2>
              <p role="status" className="text-xs text-neutral-500">
                {report.from} to {report.to}
                {report.doctorId
                  ? ` · doctor #${report.doctorId}`
                  : " · all doctors"}
                {report.generatedAt
                  ? ` · generated ${report.generatedAt}`
                  : ""}
              </p>
            </div>
            <Table
              label="Appointment status breakdown"
              columns={[
                { key: "status", header: "Status" },
                { key: "count", header: "Appointments" },
              ]}
              data={STATUS_ROWS.map(([label, key]) => ({
                status: label,
                count: report[key] ?? 0,
              }))}
              getRowKey={(row) => row.status}
              emptyTitle="No status rows"
              emptyMessage="The report returned no appointment statuses."
            />
          </section>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white py-12 text-center">
          <p role="status" className="text-sm text-neutral-500">
            Choose a date range of up to one year and generate the clinic
            report. Export follows the filters applied here.
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl bg-neutral-100"
          />
        ))}
      </div>
      <div className="space-y-2 pt-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-xl bg-neutral-100"
          />
        ))}
      </div>
    </div>
  );
}
