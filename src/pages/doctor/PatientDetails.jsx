import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Button from "../../components/Button";
import Icon from "../../components/Icon";
import StatusBadge from "../../components/StatusBadge";
import { PageHeader, PageShell } from "../../components/doctor/PageLayout";
import {
  DetailTile,
  ErrorPanel,
  Panel,
  SkeletonBlock,
} from "../../components/doctor/Panel";
import { getPatientHistory } from "../../services/appointmentService";
import { getPatient } from "../../services/patientService";
import { formatDisplayDate } from "../../utils/dateUtils";
import { formatTimeSlot, toDateOnly } from "../../utils/timeUtils";

const RECORDS_PATH = "/doctor/patient-records";

/** Profile fields shown only when the backend actually returns them. */
const PROFILE_FIELDS = [
  ["age", "Age"],
  ["gender", "Gender"],
  ["bloodGroup", "Blood group"],
  ["dateOfBirth", "Date of birth"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["address", "Address"],
];

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
        <p className="text-sm font-semibold text-neutral-900">
          {formatDisplayDate(toDateOnly(visit.appointmentDate))} at{" "}
          {formatTimeSlot(visit.timeSlot)}
        </p>
        <StatusBadge status={visit.status} />
      </div>
      {visit.reason && <p className="text-sm text-neutral-600">{visit.reason}</p>}
      {notes && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <p className="mb-1 text-xs font-medium text-neutral-500">Clinical notes</p>
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

  return (
    <li className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-neutral-900">
          Prescription #{prescription.prescriptionId}
        </span>
        {prescription.status && (
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
            {prescription.status}
          </span>
        )}
      </div>
      {items.length > 0 && (
        <ul className="space-y-1 text-sm text-neutral-700">
          {items.map((item, index) => (
            <li key={`${item.medicineName}-${index}`} className="flex items-center gap-2">
              <Icon name="pill" className="h-3.5 w-3.5 shrink-0 text-primary-600" />
              <span>
                {item.medicineName}
                {item.dosage ? ` (${item.dosage})` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
});

/**
 * The record opened from the patient directory. Everything shown comes from
 * the backend: the patient profile and the visit / prescription history.
 * The history loads in parallel with the profile and never blocks it.
 */
export const PatientDetails = () => {
  const { patientId } = useParams();

  const [outcome, setOutcome] = useState(null);
  const [historyOutcome, setHistoryOutcome] = useState(null);

  useEffect(() => {
    if (!patientId) return undefined;

    let cancelled = false;

    getPatient(patientId)
      .then((data) => {
        if (!cancelled) setOutcome({ id: patientId, patient: data });
      })
      .catch(() => {
        if (!cancelled) setOutcome({ id: patientId, error: true });
      });

    getPatientHistory(patientId)
      .then((data) => {
        if (!cancelled) setHistoryOutcome({ id: patientId, history: data });
      })
      .catch(() => {
        if (!cancelled) setHistoryOutcome({ id: patientId, error: true });
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
            ([key]) => patient[key] !== undefined && patient[key] !== null && patient[key] !== "",
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
          <SkeletonBlock label="Loading clinical history" rows={6} className="lg:col-span-8" />
          <SkeletonBlock label="Loading patient information" rows={4} className="lg:col-span-4" />
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

  return (
    <PageShell>
      <PageHeader
        back={{ to: RECORDS_PATH, label: "All patients" }}
        title={patient.fullName}
        meta={
          <span className="rounded-lg bg-neutral-100 px-2.5 py-0.5 font-mono text-sm font-semibold text-neutral-800">
            #{patient.patientId}
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

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel icon="clock" title="Visit history">
            {!historyState ? (
              <p role="status" className="text-sm text-neutral-500">
                Loading visit history...
              </p>
            ) : historyState.error ? (
              <p className="text-sm text-neutral-600">
                Visit history is unavailable right now. Reload the page to try again.
              </p>
            ) : visits.length === 0 ? (
              <p className="text-sm text-neutral-600">
                No visits are on record for this patient yet.
              </p>
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
              <dl className="grid grid-cols-2 gap-3">
                {profileFields.map(([key, label]) => (
                  <DetailTile key={key} label={label}>
                    {String(patient[key])}
                  </DetailTile>
                ))}
              </dl>
            )}
          </Panel>

          <Panel icon="pill" title="Prescriptions">
            {!historyState ? (
              <p className="text-sm text-neutral-500">Loading prescriptions...</p>
            ) : prescriptions.length === 0 ? (
              <p className="text-sm text-neutral-600">
                No prescriptions on record.
              </p>
            ) : (
              <ul className="space-y-2">
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