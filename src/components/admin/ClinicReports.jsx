import { useState } from "react";
import Button from "../Button";
import Input from "../Input";
import Select from "../Select";
import ErrorMessage from "../ErrorMessage";
import EmptyState from "../EmptyState";
import Table from "../Table";
import { WorkflowCard, WorkflowPage } from "./WorkflowUI";
import useWorkflowResource from "../../hooks/useWorkflowResource";
import useClinicReport from "../../hooks/useClinicReport";
import { listDoctors } from "../../services/adminWorkflowService";
import { reportRangeError } from "../../services/reportService";
import { workflowError } from "../../utils/adminWorkflows";
import {
  CLINIC_STATUS_FIELDS,
  clinicReportCsv,
  clinicReportError,
} from "../../utils/clinicReports";
import downloadBlob from "../../utils/downloadBlob";

export default function ClinicReports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [doctor, setDoctor] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [doctorRevision, setDoctorRevision] = useState(0);
  const [applied, setApplied] = useState(null);
  const doctors = useWorkflowResource(listDoctors, {}, doctorRevision);
  const { report, loading, error, generate, invalidate } = useClinicReport();
  const change = (setter) => (event) => {
    setter(event.target.value);
    setRangeError("");
    setApplied(null);
    invalidate();
  };
  const submit = (event) => {
    event.preventDefault();
    const invalid = reportRangeError(from, to);
    setRangeError(invalid);
    if (invalid) {
      setApplied(null);
      invalidate();
      return;
    }
    const filters = {
      from,
      to,
      doctorId: doctor || null,
      doctorLabel: doctor
        ? ((doctors.data ?? []).find((row) => String(row.userId) === doctor)
            ?.username ?? `Doctor ${doctor}`)
        : "All doctors",
    };
    setApplied(filters);
    generate(filters);
  };
  const hasData = report && report.totalAppointments > 0;
  const exportCsv = () => {
    if (!hasData || !applied || loading) return;
    downloadBlob(
      new Blob([clinicReportCsv(report, applied.doctorLabel)], {
        type: "text/csv;charset=utf-8;",
      }),
      `onecare-clinic-report-${report.from}-to-${report.to}${report.doctorId == null ? "" : `-doctor-${report.doctorId}`}.csv`,
    );
  };
  return (
    <WorkflowPage
      title="Clinic Reports"
      subtitle="View clinic analytics and reports"
    >
      <WorkflowCard title="Report filters">
        <form
          className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={submit}
          noValidate
        >
          <Input
            name="report-from"
            label="Report from date"
            type="date"
            value={from}
            onChange={change(setFrom)}
          />
          <Input
            name="report-to"
            label="Report to date"
            type="date"
            value={to}
            onChange={change(setTo)}
          />
          <Select
            name="report-doctor"
            label="Report doctor"
            placeholder="All doctors"
            value={doctor}
            onChange={change(setDoctor)}
            options={(doctors.data ?? []).map((row) => ({
              value: String(row.userId),
              label: row.username,
            }))}
          />
          <Button type="submit" variant="outline" loading={loading}>
            Generate report
          </Button>
        </form>
        <p className="text-xs text-neutral-600">
          Both dates are inclusive clinic appointment dates. Choose dates at
          most 365 days apart.
        </p>
        <ErrorMessage
          message={rangeError || (error ? clinicReportError(error) : "")}
        />
        {error && applied ? (
          <Button variant="outline" onClick={() => generate(applied)}>
            Retry report
          </Button>
        ) : null}
        {doctors.error ? (
          <div className="space-y-2">
            <ErrorMessage
              title="Could not load doctors"
              message={workflowError(doctors.error, "load doctors")}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDoctorRevision((n) => n + 1)}
            >
              Retry doctors
            </Button>
          </div>
        ) : null}
        {doctors.loading ? (
          <p role="status" className="text-sm text-neutral-600">
            Loading doctor filters…
          </p>
        ) : null}
        <Button
          disabled={!hasData || loading || !applied}
          title={
            hasData
              ? "Export the currently displayed report"
              : "Generate a report with data to export"
          }
          onClick={exportCsv}
        >
          Export CSV
        </Button>
      </WorkflowCard>
      {loading ? (
        <WorkflowCard title="Generating clinic report">
          <div role="status" aria-live="polite">
            <p>Loading clinic statistics…</p>
            <div
              aria-hidden="true"
              className="mt-3 grid animate-pulse grid-cols-2 gap-3 motion-reduce:animate-none"
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-primary-50" />
              ))}
            </div>
          </div>
        </WorkflowCard>
      ) : report ? (
        <>
          <p role="status" className="text-sm text-primary-800">
            {report.from} to {report.to} · {applied.doctorLabel}
          </p>
          <div
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Clinic report summary"
          >
            {[
              ["Total appointments", report.totalAppointments],
              ["Unique patients", report.uniquePatients],
              ["Consultations", report.consultationCount],
              ["Arrived", report.arrived],
            ].map(([label, value]) => (
              <WorkflowCard key={label}>
                <p className="text-sm text-primary-800">{label}</p>
                <p className="text-2xl font-bold text-primary-950">{value}</p>
              </WorkflowCard>
            ))}
          </div>
          {!hasData ? (
            <WorkflowCard>
              <EmptyState
                title="No clinic activity"
                message="No appointments match the selected dates and doctor. Choose another range to generate a report."
              />
            </WorkflowCard>
          ) : (
            <WorkflowCard title="Appointment status breakdown">
              <div
                className="flex h-44 items-end gap-2 border-b border-primary-200"
                role="img"
                aria-label={`Appointments by status: ${CLINIC_STATUS_FIELDS.map(([label, key]) => `${label}: ${report[key]}`).join(", ")}`}
              >
                {CLINIC_STATUS_FIELDS.map(([label, key]) => (
                  <div
                    key={key}
                    className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"
                  >
                    <span className="text-xs font-semibold text-primary-950">
                      {report[key]}
                    </span>
                    <div
                      className="mx-auto w-3/4 rounded-t bg-primary-600"
                      style={{
                        height: `${(report[key] / Math.max(1, ...CLINIC_STATUS_FIELDS.map(([, field]) => report[field]))) * 75}%`,
                      }}
                    />
                    <span className="mt-1 break-words text-xs text-neutral-700">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </WorkflowCard>
          )}
          <WorkflowCard title="Clinic status summary">
            <Table
              label="Appointment status counts"
              columns={[
                { key: "status", header: "Status" },
                { key: "count", header: "Appointments" },
              ]}
              data={CLINIC_STATUS_FIELDS.map(([label, key]) => ({
                status: label,
                count: report[key],
              }))}
              getRowKey={(row) => row.status}
            />
            <p className="text-xs text-neutral-600">
              Consultations count completed appointments. Unique patients
              include all appointment statuses. Arrived is the current status,
              not a historical attendance total.
            </p>
          </WorkflowCard>
        </>
      ) : !error ? (
        <WorkflowCard title="Generate a clinic report">
          <p role="status">
            Choose dates and an optional doctor, then select Generate report.
          </p>
        </WorkflowCard>
      ) : null}
    </WorkflowPage>
  );
}
