import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import { findAppointment } from "../../services/appointmentService";
import { getPatient } from "../../services/patientService";
import { formatDisplayDate } from "../../utils/dateUtils";

/** `09:00:00` → `09:00`; echoes anything unexpected. */
const formatTimeSlot = (timeSlot) => {
  const value = String(timeSlot ?? "");
  return /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : value || "—";
};

/**
 * DOC-04 — Consultation screen.
 *
 * Loads the appointment the doctor started from the schedule and the
 * patient's real name (doctors hold PATIENT_READ), then shows only what the
 * backend actually returns — appointment id, patient, date, time slot,
 * status and booking reason. The clinical workspace around it (vitals,
 * notes, ...) is out of scope for this ticket, so nothing clinical is
 * invented here.
 */
const ConsultationPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [patientName, setPatientName] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | succeeded | not-found | failed

  // Promise callbacks keep setState out of the synchronous effect body
  // (react-hooks/set-state-in-effect) while staying retryable.
  const load = useCallback(() => {
    findAppointment(appointmentId)
      .then((found) => {
        if (!found) {
          // Not in this doctor's list — wrong id or not their appointment.
          setAppointment(null);
          setPatientName(null);
          setStatus("not-found");
          return null;
        }
        setAppointment(found);
        setStatus("succeeded");
        if (found.patientId === null || found.patientId === undefined) {
          setPatientName(null);
          return null;
        }
        // Name enrichment is best-effort; falls back to the id label.
        return getPatient(found.patientId)
          .then((patient) => setPatientName(patient.fullName))
          .catch(() => setPatientName(null));
      })
      .catch(() => setStatus("failed"));
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-6">
      <p className="text-sm font-semibold text-primary-700">Consultation</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
        Consultation for appointment {appointmentId}
      </h1>

      {status === "loading" ? (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
          <LoadingSpinner label="Loading consultation details" />
        </div>
      ) : status === "not-found" ? (
        <div className="mt-6 space-y-3">
          <ErrorMessage
            title="Appointment not available"
            message="This appointment is not part of your schedule. It may have been removed or assigned to another doctor."
          />
          <Button
            variant="outline"
            onClick={() => navigate("/doctor/today-schedule")}
          >
            Back to today’s schedule
          </Button>
        </div>
      ) : status === "failed" ? (
        <div className="mt-6 space-y-3">
          <ErrorMessage
            title="Unable to load the consultation"
            message="Please check your connection and try again."
          />
          <Button
            onClick={() => {
              setStatus("loading");
              load();
            }}
          >
            Retry
          </Button>
        </div>
      ) : (
        <section
          aria-label="Consultation details"
          className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-neutral-600">Patient</dt>
              <dd className="mt-1 font-semibold text-neutral-900">
                {patientName ?? `Patient ${appointment.patientId ?? "—"}`}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={appointment.status} />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Date</dt>
              <dd className="mt-1 font-medium text-neutral-900">
                {formatDisplayDate(
                  String(appointment.appointmentDate ?? "").slice(0, 10),
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Time slot</dt>
              <dd className="mt-1 font-medium text-neutral-900">
                {formatTimeSlot(appointment.timeSlot)}
              </dd>
            </div>
            {appointment.reason ? (
              <div className="sm:col-span-2">
                <dt className="text-sm text-neutral-600">Reason</dt>
                <dd className="mt-1 text-neutral-900">{appointment.reason}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      )}

      <p className="mt-6 text-sm text-neutral-600">
        The full clinical workspace for this consultation is being built. No
        clinical details beyond the booking information are available yet.
      </p>
      <div className="mt-4">
        <Button
          variant="outline"
          onClick={() => navigate("/doctor/today-schedule")}
        >
          Back to today’s schedule
        </Button>
      </div>
    </div>
  );
};

export default ConsultationPage;
