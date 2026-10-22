import { useState } from "react";
import Button from "../Button";
import Input from "../Input";
import Select from "../Select";
import ErrorMessage from "../ErrorMessage";
import { WorkflowCard, WorkflowPage } from "./WorkflowUI";
import useWorkflowResource from "../../hooks/useWorkflowResource";
import { listDoctors } from "../../services/adminWorkflowService";
import { dateRangeError, workflowError } from "../../utils/adminWorkflows";
import {
  buildDemoReport,
  DEMO_REPORT_DOCTORS,
  downloadDemoReport,
} from "../../utils/demoClinicReports";

const sampleRange = { from: "2026-10-12", to: "2026-10-18", doctor: "" };

export default function ClinicReports() {
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [doctor, setDoctor] = useState(""),
    [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const [applied, setApplied] = useState(sampleRange);
  const report = buildDemoReport(applied);
  const doctors = useWorkflowResource(listDoctors);
  return (
    <WorkflowPage
      title="Clinic Reports"
      subtitle="View clinic analytics and reports"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 p-3">
        <p role="status" className="text-sm text-primary-950">
          {demo
            ? "DEMO — Synthetic data for UI preview only. These are not actual clinic statistics. Sample period: 12–18 October 2026."
            : "Live clinic reporting is unavailable. You can preview a report using clearly labelled sample data."}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setDemo(!demo);
            setFrom(demo ? "" : sampleRange.from);
            setTo(demo ? "" : sampleRange.to);
            setDoctor("");
            setApplied(sampleRange);
            setError("");
          }}
        >
          {demo ? "Exit demo preview" : "Preview demo report"}
        </Button>
      </div>
      <WorkflowCard title="Report filters">
        <form
          className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            const invalid = dateRangeError(from, to);
            setError(invalid);
            if (!invalid) setApplied({ from, to, doctor });
          }}
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
            value={doctor}
            onChange={(event) => setDoctor(event.target.value)}
            options={
              demo
                ? DEMO_REPORT_DOCTORS
                : (doctors.data ?? []).map((row) => ({
                    value: row.userId,
                    label: row.username,
                  }))
            }
          />
          <Button type="submit" variant="outline">
            {demo ? "Apply demo filters" : "Validate date range"}
          </Button>
        </form>
        <ErrorMessage
          message={
            error ||
            (!demo && doctors.error
              ? workflowError(doctors.error, "load doctors")
              : "")
          }
        />
        <Button
          disabled={!demo || !report.rows.length}
          title={
            demo
              ? "Export the displayed synthetic aggregates"
              : "Export requires report data"
          }
          onClick={() =>
            downloadDemoReport(report.rows, applied.from, applied.to)
          }
        >
          {demo ? "Export demo CSV" : "Export CSV"}
        </Button>
      </WorkflowCard>
      {demo ? (
        report.rows.length ? (
          <>
            <div
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Demo report summary"
            >
              {[
                ["Total appointments", report.totals.appointments],
                ["New patients", report.totals.newPatients],
                [
                  "Total revenue",
                  `LKR ${(report.totals.revenueCents / 100).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                ],
                ["Attendance rate", report.attendance],
              ].map(([label, value]) => (
                <WorkflowCard key={label}>
                  <p className="text-sm text-primary-800">{label}</p>
                  <p className="text-2xl font-bold text-primary-950">{value}</p>
                  <p className="text-xs text-neutral-600">Demo data</p>
                </WorkflowCard>
              ))}
            </div>
            <WorkflowCard title="Appointments trend — demo">
              <p role="status" className="text-sm text-neutral-600">
                Synthetic report loaded. Filters apply to the sample period
                only.
              </p>
              <div
                className="flex h-44 items-end gap-2 border-b border-primary-200"
                role="img"
                aria-label={`Demo daily appointments: ${report.trend.map((day) => `${day.date}: ${day.appointments}`).join(", ")}`}
              >
                {report.trend.map((day) => (
                  <div
                    key={day.date}
                    className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"
                  >
                    <span className="text-xs font-semibold text-primary-950">
                      {day.appointments}
                    </span>
                    <div
                      className="mx-auto w-3/4 rounded-t bg-primary-600"
                      style={{
                        height: `${(day.appointments / Math.max(...report.trend.map((row) => row.appointments))) * 75}%`,
                      }}
                    />
                    <span className="mt-1 text-xs text-neutral-600">
                      {day.date.slice(8)}/10
                    </span>
                  </div>
                ))}
              </div>
            </WorkflowCard>
            <WorkflowCard title="Daily clinic summary — demo">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="mb-3 text-left text-neutral-600">
                    Synthetic aggregates only. No patient identifiers. Revenue
                    is sample cash receipts; queue minutes are invented for
                    preview.
                  </caption>
                  <thead className="bg-primary-50">
                    <tr>
                      {[
                        "Date",
                        "Doctor",
                        "Appointments",
                        "New patients",
                        "Arrived",
                        "No-show",
                        "Revenue (LKR)",
                        "Average queue (minutes)",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="whitespace-nowrap px-2 py-2"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr
                        key={`${row.date}-${row.doctorId}`}
                        className="border-b border-primary-100"
                      >
                        {[
                          row.date,
                          row.doctor,
                          row.appointments,
                          row.newPatients,
                          row.arrived,
                          row.noShow,
                          (row.revenueCents / 100).toFixed(2),
                          row.queueMinutes,
                        ].map((value, index) => (
                          <td
                            key={index}
                            className="whitespace-nowrap px-2 py-2"
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </WorkflowCard>
          </>
        ) : (
          <WorkflowCard title="No demo report data">
            <p role="status">
              No sample data matches these filters. Choose dates within 12–18
              October 2026.
            </p>
          </WorkflowCard>
        )
      ) : (
        <WorkflowCard title="Clinic reporting is unavailable">
          <p role="status">
            The backend does not yet provide clinic reports. Report generation
            and CSV export will be available when the reporting service is
            implemented.
          </p>
          <p className="text-sm text-neutral-600">
            Appointment totals, patient registrations, payment-period revenue,
            attendance and queue timing statistics are unavailable. No
            substitute totals are calculated from incomplete records.
          </p>
        </WorkflowCard>
      )}
    </WorkflowPage>
  );
}
