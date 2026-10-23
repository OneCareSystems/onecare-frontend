import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Button from "../../components/Button";
import Icon from "../../components/Icon";
import StatusBadge from "../../components/StatusBadge";
import { PageHeader, PageShell } from "../../components/doctor/PageLayout";
import {
  ErrorPanel,
  Panel,
  SkeletonBlock,
} from "../../components/doctor/Panel";
import { getPatientHistory } from "../../services/appointmentService";
import { tintFor, initialsFor } from "../../utils/avatarUtils";
import { formatDisplayDate } from "../../utils/dateUtils";
import { formatTimeSlot, toDateOnly } from "../../utils/timeUtils";

const RECORDS_PATH = "/doctor/patient-records";

/** Profile fields shown only when the backend actually returns them. */
const PROFILE_FIELDS = [
  ["age", "Age"],
  ["gender", "Gender"],
  ["bloodGroup", "Blood group"],
  ["dateOfBirth", "Date of birth"],
  ["contactNo", "Phone"],
  ["email", "Email"],
  ["address", "Address"],
];

/** Small icon per profile field for faster scanning. */
const PROFILE_ICONS = {
  age: "user",
  gender: "user",
  bloodGroup: "heart",
  dateOfBirth: "calendar",
  contactNo: "phone",
  email: "mail",
  address: "map-pin",
};

const visitSortKey = (visit) =>
  `${visit.appointmentDate ?? ""}${visit.timeSlot ?? ""}`;

const VisitEntry = memo(function VisitEntry({ visit }) {
  const notes =
    typeof visit.clinicalNotes === "string" ? visit.clinicalNotes.trim() : "";

  return (
    <li className="relative space-y-2">
      <span
        aria-hidden="true"
        className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-primary-600 ring-1 ring-primary-200"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
          <Icon
            name="calendar"
            className="h-3.5 w-3.5 text-neutral-400"
          />
          {formatDisplayDate(toDateOnly(visit.appointmentDate))}
          <span className="text-neutral-400">·</span>
          {formatTimeSlot(visit.timeSlot)}
        </p>
        <StatusBadge status={visit.status} />
      </div>
      {visit.reason && (
        <p className="flex items-start gap-1.5 text-sm text-neutral-600">
          <Icon
            name="clipboard"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400"
          />
          {visit.reason}
        </p>
      )}
      {notes && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
            <Icon name="notes" className="h-3 w-3" />
            Clinical notes
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
            {notes}
          </p>
        </div>
      )}
    </li>
  );
});

const PrescriptionEntry = memo(function PrescriptionEntry({ prescription }) {
  const items = Array.isArray(prescription.items) ? prescription.items : [];
  const appointment = prescription.appointment;

  return (
    <li className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-neutral-900">
          <Icon name="pill" className="h-3.5 w-3.5 text-primary-600" />
          Prescription #{prescription.prescriptionId}
        </span>
        {prescription.status && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200">
            {prescription.status}
          </span>
        )}
      </div>
      {appointment && (
        <div className="rounded-lg border border-primary-100 bg-primary-50/50 px-3 py-2">
          <p className="flex items-center gap-1 text-xs font-medium text-primary-700">
            <Icon name="link" className="h-3 w-3" />
            Related appointment
          </p>
          <p className="mt-0.5 text-sm font-medium text-neutral-800">
            {appointment.appointmentDate
              ? formatDisplayDate(toDateOnly(appointment.appointmentDate))
              : `Appointment #${appointment.appointmentId}`}
            {appointment.timeSlot
              ? ` at ${formatTimeSlot(appointment.timeSlot)}`
              : ""}
          </p>
          {appointment.reason && (
            <p className="mt-0.5 text-sm text-neutral-600">
              {appointment.reason}
            </p>
          )}
        </div>
      )}
      {items.length > 0 && (
        <ul className="space-y-1 text-sm text-neutral-700">
          {items.map((item, index) => (
            <li
              key={`${item.medicineName}-${index}`}
              className="flex items-baseline gap-2"
            >
              <Icon
                name="pill"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500"
              />
              <span>
                <span className="font-medium text-neutral-900">
                  {item.medicineName}
                </span>
                {item.dosage ? (
                  <span className="text-neutral-500"> — {item.dosage}</span>
                ) : null}
                {item.frequency ? (
                  <span className="text-neutral-500">, {item.frequency}</span>
                ) : null}
                {item.durationDays ? (
                  <span className="text-neutral-500">
                    {" "}
                    · {item.durationDays}d
                  </span>
                ) : null}
                {item.quantity ? (
                  <span className="text-neutral-500">
                    {" "}
                    · qty {item.quantity}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
});

const StatPill = memo(function StatPill({ icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-xs">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="leading-tight">
        <p className="text-lg font-bold tabular-nums text-neutral-900">
          {value}
        </p>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  );
});

/**
 * The record opened from the patient directory. The patient profile, visit
 * history, and prescriptions are loaded together from the patient history API.
 */
export const PatientDetails = () => {
  const { patientId } = useParams();

  const [outcome, setOutcome] = useState(null);
  const [historyOutcome, setHistoryOutcome] = useState(null);

  useEffect(() => {
    if (!patientId) return undefined;

    let cancelled = false;

    getPatientHistory(patientId)
      .then((data) => {
        if (!cancelled) {
          setOutcome({ id: patientId, patient: data.patient });
          setHistoryOutcome({ id: patientId, history: data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOutcome({ id: patientId, error: true });
          setHistoryOutcome({ id: patientId, error: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const current = outcome && outcome.id === patientId ? outcome : null;
  const failed = !patientId || Boolean(current?.error);
  const loading = !failed && !current;
  const patient = failed ? null : (current?.patient ?? null);

  const historyState =
    historyOutcome && historyOutcome.id === patientId ? historyOutcome : null;
  const history = historyState?.history ?? null;

  const visits = useMemo(
    () =>
      [...(history?.appointments ?? [])].sort((a, b) =>
        visitSortKey(b).localeCompare(visitSortKey(a)),
      ),
    [history],
  );
  const prescriptions = history?.prescriptions ?? [];

  const profileFields = useMemo(
    () =>
      patient
        ? PROFILE_FIELDS.filter(
            ([key]) =>
              patient[key] !== undefined &&
              patient[key] !== null &&
              patient[key] !== "",
          )
        : [],
    [patient],
  );

  const handlePrint = useCallback(() => window.print(), []);

  if (loading) {
    return (
      <PageShell>
        <SkeletonBlock label="Loading patient record" rows={2} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <SkeletonBlock
            label="Loading clinical history"
            rows={6}
            className="lg:col-span-8"
          />
          <SkeletonBlock
            label="Loading patient information"
            rows={4}
            className="lg:col-span-4"
          />
        </div>
      </PageShell>
    );
  }

  if (failed || !patient) {
    return (
      <PageShell>
        <ErrorPanel
          title="Unable to load this patient record"
          message="The record may have moved, or you may not have access to it."
        >
          <Link
            to={RECORDS_PATH}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 transition-colors hover:text-primary-800"
          >
            <Icon name="arrow-left" className="h-4 w-4" />
            <span>Back to all patients</span>
          </Link>
        </ErrorPanel>
      </PageShell>
    );
  }

  const tint = tintFor(patient.fullName);

  return (
    <PageShell>
      <PageHeader
        back={{ to: RECORDS_PATH, label: "All patients" }}
        title={
          <span className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1 ring-inset ${tint}`}
            >
              {initialsFor(patient.fullName)}
            </span>
            <span className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-neutral-950">
                {patient.fullName}
              </span>
              <span className="mt-0.5 font-mono text-xs font-medium text-neutral-500">
                #{patient.patientId}
              </span>
            </span>
          </span>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="inline-flex items-center gap-2"
          >
            <Icon name="print" className="h-4 w-4" />
            Print record
          </Button>
        }
      />

      {/* Quick-glance summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill
          icon="calendar"
          label="Total visits"
          value={visits.length}
          accent="bg-primary-50 text-primary-700"
        />
        <StatPill
          icon="pill"
          label="Prescriptions"
          value={prescriptions.length}
          accent="bg-emerald-50 text-emerald-700"
        />
        <StatPill
          icon="clock"
          label="Last seen"
          value={
            visits[0]?.appointmentDate
              ? formatDisplayDate(toDateOnly(visits[0].appointmentDate))
              : "—"
          }
          accent="bg-amber-50 text-amber-700"
        />
        <StatPill
          icon="clipboard"
          label="Notes on file"
          value={visits.filter((v) => v.clinicalNotes?.trim()).length}
          accent="bg-sky-50 text-sky-700"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel
            icon="clock"
            title="Visit history"
            aside={
              visits.length > 0 ? (
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-neutral-600">
                  {visits.length}{" "}
                  {visits.length === 1 ? "visit" : "visits"}
                </span>
              ) : null
            }
          >
            {!historyState ? (
              <p role="status" className="text-sm text-neutral-500">
                Loading visit history...
              </p>
            ) : historyState.error ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <Icon
                  name="alert-circle"
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                />
                <p className="text-sm text-amber-800">
                  Visit history is unavailable right now. Reload the page to
                  try again.
                </p>
              </div>
            ) : visits.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 py-8 text-center">
                <Icon
                  name="calendar"
                  className="h-6 w-6 text-neutral-300"
                />
                <p className="text-sm text-neutral-500">
                  No visits are on record for this patient yet.
                </p>
              </div>
            ) : (
              <ol className="relative space-y-6 border-l border-neutral-200 pl-6">
                {visits.map((visit) => (
                  <VisitEntry key={visit.appointmentId} visit={visit} />
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Panel icon="user" title="Patient information">
            {profileFields.length === 0 ? (
              <p className="text-sm text-neutral-600">
                No additional details are on file.
              </p>
            ) : (
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {profileFields.map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-start gap-2 rounded-lg border border-neutral-100 bg-neutral-50/50 p-2.5"
                  >
                    {PROFILE_ICONS[key] && (
                      <Icon
                        name={PROFILE_ICONS[key]}
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400"
                      />
                    )}
                    <div className="min-w-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                        {label}
                      </dt>
                      <dd className="mt-0.5 truncate text-sm font-medium text-neutral-800">
                        {String(patient[key])}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            )}
          </Panel>

          <Panel
            icon="pill"
            title="Prescriptions"
            aside={
              prescriptions.length > 0 ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium tabular-nums text-emerald-700 ring-1 ring-emerald-100">
                  {prescriptions.length}
                </span>
              ) : null
            }
          >
            {!historyState ? (
              <p className="text-sm text-neutral-500">
                Loading prescriptions...
              </p>
            ) : prescriptions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 py-6 text-center">
                <Icon name="pill" className="h-5 w-5 text-neutral-300" />
                <p className="text-sm text-neutral-500">
                  No prescriptions on record.
                </p>
              </div>
            ) : (
              <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {prescriptions.map((prescription, index) => (
                  <PrescriptionEntry
                    key={prescription.prescriptionId ?? index}
                    prescription={prescription}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </PageShell>
  );
};

export default PatientDetails;
