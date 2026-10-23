import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../../components/Button";
import Icon from "../../components/Icon";
import StatusBadge from "../../components/StatusBadge";
import Toast from "../../components/Toast";
import { PageHeader, PageShell } from "../../components/doctor/PageLayout";
import {
  DetailTile,
  ErrorPanel,
  Panel,
  SkeletonBlock,
} from "../../components/doctor/Panel";
import ClinicalNotesPanel from "../../features/doctor/ClinicalNotesPanel";
import PrescriptionBuilder from "../../features/doctor/PrescriptionBuilder";
import {
  getAppointmentById,
  getPatientHistory,
  saveClinicalNotes,
} from "../../services/appointmentService";
import { getPatient } from "../../services/patientService";
import {
  createPrescription,
  getPrescriptionById,
} from "../../services/prescriptionService";
import { completeAppointment } from "../../services/queueService";
import { formatDisplayDate } from "../../utils/dateUtils";
import {
  formatElapsed,
  formatTimeSlot,
  toDateOnly,
} from "../../utils/timeUtils";

/** Backend limit: clinical notes are capped at 2000 characters. */
export const CLINICAL_NOTES_MAX_LENGTH = 2000;

/**
 * Shown when the appointment changed status between render and the Complete
 * request (another staff member acted on it). Both 409 (per ticket) and 400
 * (what this backend returns for conflicting transitions) map here.
 */
export const CONCURRENT_CHANGE_MESSAGE =
  "This appointment's status has changed. The queue has been refreshed.";

const SAVED_NOTES_MESSAGE = "Clinical notes saved.";
const COMPLETED_TOAST_MESSAGE = "Consultation marked as completed.";
const COMPLETE_FAILED_MESSAGE =
  "Unable to complete the consultation. Please try again.";
const PRESCRIPTION_CREATED_MESSAGE = "Prescription issued.";

/**
 * The elapsed-time clock lives in its own component so its once-a-second
 * state update re-renders only this badge, never the whole consultation form.
 * It runs only while the appointment is still open.
 */
const ConsultationTimer = memo(function ConsultationTimer({ running }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return undefined;

    const id = setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => clearInterval(id);
  }, [running]);

  return (
    <span
      role="timer"
      aria-label="Elapsed time"
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-gradient-to-r from-amber-50 to-amber-100/60 px-3 py-1 font-mono text-xs font-semibold tabular-nums text-amber-900 shadow-sm"
    >
      <Icon
        name="clock"
        className={`h-3.5 w-3.5 text-amber-600 ${
          running ? "motion-safe:animate-pulse" : ""
        }`}
      />
      {formatElapsed(seconds)}
    </span>
  );
});

const PreviousNote = memo(function PreviousNote({ record }) {
  return (
    <li className="relative space-y-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm">
      <span className="absolute inset-y-4 left-0 w-0.5 rounded-full bg-primary-300" />
      <div className="flex items-center justify-between gap-2 pl-2">
        <span className="font-semibold text-neutral-800">
          {formatDisplayDate(toDateOnly(record.appointmentDate))}
        </span>
        <StatusBadge status={record.status} />
      </div>

      <p className="whitespace-pre-wrap pl-2 leading-relaxed text-neutral-700">
        {record.clinicalNotes}
      </p>
    </li>
  );
});

/**
 * DOC-04 - Consultation screen.
 *
 * 1. Review the booking and the patient's previous clinical notes.
 * 2. Record this encounter's clinical notes.
 * 3. Issue a prescription if needed.
 * 4. Mark the appointment COMPLETED.
 */
const ConsultationPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [patientName, setPatientName] = useState(null);
  const [loadStatus, setLoadStatus] = useState("loading");

  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState(null);
  const [notesDirty, setNotesDirty] = useState(false);
  const notesDirtyRef = useRef(false);

  const [history, setHistory] = useState(null);

  const [creatingPrescription, setCreatingPrescription] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState(null);
  const [createdPrescriptions, setCreatedPrescriptions] = useState([]);
  const [relatedPrescriptions, setRelatedPrescriptions] = useState(null);

  const [completing, setCompleting] = useState(false);
  const completingRef = useRef(false);
  const [toast, setToast] = useState(null);

  const loadIdRef = useRef(0);

  const isClosed =
    appointment?.status === "COMPLETED" || appointment?.status === "CANCELLED";

  const isCompleted = appointment?.status === "COMPLETED";
  const canComplete = appointment?.status === "SCHEDULED";

  const load = useCallback(() => {
    const loadId = ++loadIdRef.current;
    const isStale = () => loadId !== loadIdRef.current;

    getAppointmentById(appointmentId)
      .then((found) => {
        if (isStale()) return;

        setRelatedPrescriptions(null);
        setAppointment(found);

        if (!notesDirtyRef.current) {
          setNotes(
            typeof found.clinicalNotes === "string" ? found.clinicalNotes : "",
          );
        }

        setLoadStatus("succeeded");

        if (found.patientId === null || found.patientId === undefined) {
          setPatientName(null);
          setHistory(null);
          setRelatedPrescriptions([]);
          return;
        }

        getPatient(found.patientId)
          .then((patient) => {
            if (!isStale()) {
              setPatientName(patient.fullName);
            }
          })
          .catch(() => {
            if (!isStale()) {
              setPatientName(null);
            }
          });

        getPatientHistory(found.patientId)
          .then((response) => {
            if (isStale()) return;

            setHistory(response);

            if (found.status !== "COMPLETED") {
              setRelatedPrescriptions([]);
              return;
            }

            const ids = response.prescriptions
              .filter(
                (prescription) =>
                  String(
                    prescription.appointmentId ??
                      prescription.appointment?.appointmentId,
                  ) === String(found.appointmentId),
              )
              .map((prescription) => prescription.prescriptionId)
              .filter((id) => id !== undefined && id !== null);

            Promise.all(ids.map((id) => getPrescriptionById(id)))
              .then((prescriptions) => {
                if (!isStale()) {
                  setRelatedPrescriptions(prescriptions);
                }
              })
              .catch(() => {
                if (!isStale()) {
                  setRelatedPrescriptions("failed");
                }
              });
          })
          .catch(() => {
            if (!isStale()) {
              setHistory(null);
              setRelatedPrescriptions("failed");
            }
          });
      })
      .catch(() => {
        if (!isStale()) {
          setLoadStatus("failed");
        }
      });
  }, [appointmentId]);

  useEffect(() => {
    load();

    return () => {
      loadIdRef.current += 1;
    };
  }, [load]);

  const handleNotesChange = useCallback((event) => {
    notesDirtyRef.current = true;
    setNotesDirty(true);
    setNotes(event.target.value);
    setNotesError(null);
  }, []);

  const handleSaveNotes = useCallback(() => {
    if (notesSaving) return;

    setNotesSaving(true);
    setNotesError(null);

    saveClinicalNotes(appointmentId, notes)
      .then(() => {
        notesDirtyRef.current = false;
        setNotesDirty(false);
        setToast({ type: "success", message: SAVED_NOTES_MESSAGE });
      })
      .catch((error) => {
        const status = error?.response?.status;

        setNotesError(
          status === 400
            ? (error?.userMessage ??
              "Clinical notes cannot be added to this appointment.")
            : "Unable to save the clinical notes. Please try again.",
        );
      })
      .finally(() => {
        setNotesSaving(false);
      });
  }, [appointmentId, notes, notesSaving]);

  /**
   * Called by PrescriptionBuilder when the user clicks "Transmit Prescription".
   * `onClearItems` is a callback provided by the builder to reset its local state.
   */
  const handleCreatePrescription = useCallback(
    (items, onClearItems) => {
      if (creatingPrescription || items.length === 0) return;

      setCreatingPrescription(true);
      setPrescriptionError(null);

      createPrescription({
        patientId: appointment.patientId,
        appointmentId: appointment.appointmentId,
        items,
      })
        .then((prescription) => {
          setCreatedPrescriptions((current) => [...current, prescription]);

          setRelatedPrescriptions((current) =>
            Array.isArray(current) ? [...current, prescription] : [prescription],
          );

          onClearItems();
          setToast({ type: "success", message: PRESCRIPTION_CREATED_MESSAGE });
        })
        .catch((error) => {
          setPrescriptionError(
            error?.userMessage ??
              "Unable to create the prescription. Please try again.",
          );
        })
        .finally(() => {
          setCreatingPrescription(false);
        });
    },
    [appointment, creatingPrescription],
  );

  const handleComplete = useCallback(() => {
    if (completingRef.current) return;

    completingRef.current = true;
    setCompleting(true);

    completeAppointment(appointmentId)
      .then((updated) => {
        setAppointment((current) => ({
          ...current,
          status: updated?.status ?? "COMPLETED",
        }));

        setToast({ type: "success", message: COMPLETED_TOAST_MESSAGE });
      })
      .catch((error) => {
        const status = error?.response?.status;

        if (status === 409 || status === 400) {
          setToast({ type: "warning", message: CONCURRENT_CHANGE_MESSAGE });
          load();
        } else {
          setToast({ type: "error", message: COMPLETE_FAILED_MESSAGE });
        }
      })
      .finally(() => {
        completingRef.current = false;
        setCompleting(false);
      });
  }, [appointmentId, load]);

  const goToSchedule = useCallback(
    () => navigate("/doctor/today-schedule"),
    [navigate],
  );

  const retryLoad = useCallback(() => {
    setLoadStatus("loading");
    load();
  }, [load]);

  const previousNotes = useMemo(
    () =>
      history?.appointments?.filter(
        (record) =>
          String(record.appointmentId) !== String(appointmentId) &&
          typeof record.clinicalNotes === "string" &&
          record.clinicalNotes.trim().length > 0,
      ) ?? [],
    [history, appointmentId],
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow={isCompleted ? "Completed Appointment" : "Active Consultation"}
        title={isCompleted ? "Consultation Details" : "Consultation Room"}
        description={
          isCompleted
            ? "Review the completed visit, clinical notes and linked prescriptions."
            : "Review the booking, record clinical notes, issue prescriptions and complete the visit."
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 ring-1 ring-primary-100">
              <Icon name="hash" className="h-3 w-3" />
              {appointmentId}
            </span>
            <ConsultationTimer running={canComplete} />
          </>
        }
        actions={
          canComplete ? (
            <Button
              onClick={handleComplete}
              loading={completing}
              disabled={completing}
              size="sm"
              className="inline-flex items-center gap-2 shadow-sm"
            >
              <Icon name="circle-check" className="h-4 w-4" />
              Complete Consultation
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={goToSchedule}>
              Back to Schedule
            </Button>
          )
        }
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {loadStatus === "loading" ? (
        <SkeletonBlock label="Loading consultation details" rows={6} />
      ) : loadStatus === "not-found" ? (
        <ErrorPanel
          title="Appointment not available"
          message="This appointment is not part of your schedule. It may have been removed or assigned to another doctor."
        />
      ) : loadStatus === "failed" ? (
        <ErrorPanel
          title="Unable to load the consultation"
          message="Please check your connection and try again."
          actionLabel="Retry"
          onAction={retryLoad}
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* LEFT: Clinical workspace */}
          <div className="space-y-6 lg:col-span-7">
            <Panel
              icon="user"
              title="Patient Details"
              aside={<StatusBadge status={appointment.status} />}
            >
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DetailTile label="Patient name">
                  {patientName ?? `Patient ${appointment.patientId ?? "\u2014"}`}
                </DetailTile>

                <DetailTile label="Date and time">
                  {formatDisplayDate(toDateOnly(appointment.appointmentDate))}{" "}
                  at {formatTimeSlot(appointment.timeSlot)}
                </DetailTile>

                <DetailTile label="Reason">
                  {appointment.reason || "None specified"}
                </DetailTile>
              </dl>
            </Panel>

            <ClinicalNotesPanel
              notes={notes}
              isClosed={isClosed}
              appointmentStatus={appointment.status}
              notesSaving={notesSaving}
              notesDirty={notesDirty}
              notesError={notesError}
              onNotesChange={handleNotesChange}
              onSaveNotes={handleSaveNotes}
            />

            <Panel icon="history" title="Previous Clinical Notes">
              {previousNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 py-8 text-center">
                  <Icon
                    name="history"
                    className="h-6 w-6 text-neutral-300"
                  />
                  <p className="text-sm text-neutral-500">
                    No previous clinical notes for this patient.
                  </p>
                </div>
              ) : (
                <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {previousNotes.map((record) => (
                    <PreviousNote key={record.appointmentId} record={record} />
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* RIGHT: Prescription builder */}
          <div className="lg:col-span-5">
            <PrescriptionBuilder
              isClosed={isClosed}
              creatingPrescription={creatingPrescription}
              prescriptionError={prescriptionError}
              createdPrescriptions={createdPrescriptions}
              relatedPrescriptions={relatedPrescriptions}
              onCreatePrescription={handleCreatePrescription}
              onPrescriptionError={setPrescriptionError}
            />
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default ConsultationPage;
