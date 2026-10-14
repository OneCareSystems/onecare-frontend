import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import Input from "../../components/Input";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import Toast from "../../components/Toast";
import {
  findAppointment,
  getClinicalNotes,
  getPatientHistory,
  saveClinicalNotes,
} from "../../services/appointmentService";
import { getPatient } from "../../services/patientService";
import { createPrescription } from "../../services/prescriptionService";
import { completeAppointment } from "../../services/queueService";
import { formatDisplayDate } from "../../utils/dateUtils";

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

/** `09:00:00` → `09:00`; echoes anything unexpected. */
const formatTimeSlot = (timeSlot) => {
  const value = String(timeSlot ?? "");
  return /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : value || "—";
};

const EMPTY_ITEM = {
  medicineName: "",
  dosage: "",
  frequency: "",
  durationDays: "1",
  quantity: "1",
};

/**
 * DOC-04 — Consultation screen.
 *
 * The doctor's consultation workflow in one place:
 * 1. review the booking and the patient's previous clinical notes,
 * 2. record this encounter's clinical notes (stored on the appointment),
 * 3. issue a prescription if needed,
 * 4. mark the appointment COMPLETED.
 *
 * Completion only ever happens here — the schedule page links into this
 * screen and no longer mutates statuses. Everything shown comes from the
 * verified backend; nothing clinical is invented.
 *
 * Clinical notes / history endpoints depend on the unmerged backend branch
 * `fix/44/align-clinical-notes` (notes moved onto the appointment entity);
 * read failures degrade to "no notes available".
 */
const ConsultationPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [patientName, setPatientName] = useState(null);
  const [loadStatus, setLoadStatus] = useState("loading"); // loading | succeeded | not-found | failed

  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState(null);

  const [history, setHistory] = useState(null); // null = not loaded / unavailable

  const [items, setItems] = useState([]);
  const [itemDraft, setItemDraft] = useState(EMPTY_ITEM);
  const [creatingPrescription, setCreatingPrescription] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState(null);
  const [createdPrescriptions, setCreatedPrescriptions] = useState([]);

  const [completing, setCompleting] = useState(false);
  // Request-level duplicate-click guard: ignores a second click while the
  // completion PATCH is still in flight (state alone cannot guard two
  // same-tick clicks).
  const completingRef = useRef(false);
  const [toast, setToast] = useState(null);

  const isClosed =
    appointment?.status === "COMPLETED" || appointment?.status === "CANCELLED";
  const canComplete = appointment?.status === "SCHEDULED";

  // Promise callbacks keep setState out of the synchronous effect body
  // (react-hooks/set-state-in-effect) while staying retryable.
  const load = useCallback(() => {
    findAppointment(appointmentId)
      .then((found) => {
        if (!found) {
          setAppointment(null);
          setPatientName(null);
          setLoadStatus("not-found");
          return null;
        }
        setAppointment(found);
        setLoadStatus("succeeded");

        // Enrichment is best-effort: booking data must render regardless.
        const patientLoad =
          found.patientId === null || found.patientId === undefined
            ? Promise.resolve(null)
            : getPatient(found.patientId)
                .then((patient) => setPatientName(patient.fullName))
                .catch(() => setPatientName(null));

        const notesLoad = getClinicalNotes(appointmentId)
          .then((response) => setNotes(response.clinicalNotes))
          .catch(() => {
            /* no notes yet, or backend without fix/44 — leave empty */
          });

        const historyLoad =
          found.patientId === null || found.patientId === undefined
            ? Promise.resolve(null)
            : getPatientHistory(found.patientId)
                .then((response) => setHistory(response))
                .catch(() => setHistory(null));

        return Promise.all([patientLoad, notesLoad, historyLoad]);
      })
      .catch(() => setLoadStatus("failed"));
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveNotes = useCallback(() => {
    if (notesSaving) return;
    setNotesSaving(true);
    setNotesError(null);
    saveClinicalNotes(appointmentId, notes)
      .then(() => {
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
      .finally(() => setNotesSaving(false));
  }, [appointmentId, notes, notesSaving]);

  const handleAddItem = useCallback(() => {
    const draft = itemDraft;
    if (
      !draft.medicineName.trim() ||
      !draft.dosage.trim() ||
      !draft.frequency.trim() ||
      !(Number(draft.durationDays) >= 1) ||
      !(Number(draft.quantity) >= 1)
    ) {
      setPrescriptionError(
        "Fill in medicine name, dosage, frequency, duration (days) and quantity.",
      );
      return;
    }
    setPrescriptionError(null);
    setItems((current) => [
      ...current,
      {
        medicineName: draft.medicineName.trim(),
        dosage: draft.dosage.trim(),
        frequency: draft.frequency.trim(),
        durationDays: Number(draft.durationDays),
        quantity: Number(draft.quantity),
      },
    ]);
    setItemDraft(EMPTY_ITEM);
  }, [itemDraft]);

  const handleCreatePrescription = useCallback(() => {
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
        setItems([]);
        setToast({ type: "success", message: PRESCRIPTION_CREATED_MESSAGE });
      })
      .catch((error) => {
        setPrescriptionError(
          error?.userMessage ??
            "Unable to create the prescription. Please try again.",
        );
      })
      .finally(() => setCreatingPrescription(false));
  }, [appointment, creatingPrescription, items]);

  const handleComplete = useCallback(() => {
    // Duplicate-click protection at the request level.
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
          // The queue has been refreshed elsewhere — reload this screen
          // so the doctor sees the current state.
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

  const previousNotes =
    history?.appointments?.filter(
      (record) =>
        String(record.appointmentId) !== String(appointmentId) &&
        typeof record.clinicalNotes === "string" &&
        record.clinicalNotes.trim().length > 0,
    ) ?? [];

  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-6">
      <header>
        <p className="text-sm font-semibold text-primary-700">Consultation</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
          Consultation for appointment {appointmentId}
        </h1>
      </header>

      {toast && (
        <div className="mt-4">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {loadStatus === "loading" ? (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
          <LoadingSpinner label="Loading consultation details" />
        </div>
      ) : loadStatus === "not-found" ? (
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
      ) : loadStatus === "failed" ? (
        <div className="mt-6 space-y-3">
          <ErrorMessage
            title="Unable to load the consultation"
            message="Please check your connection and try again."
          />
          <Button
            onClick={() => {
              setLoadStatus("loading");
              load();
            }}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* Booking summary — only what the backend actually stores. */}
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
                  <dd className="mt-1 text-neutral-900">
                    {appointment.reason}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          {/* Clinical notes for this encounter (fix/44 contract). */}
          <section
            aria-label="Clinical notes"
            className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-neutral-900">
              Clinical notes
            </h2>
            {isClosed ? (
              <p className="mt-2 text-sm text-neutral-600">
                {appointment.status === "CANCELLED"
                  ? "Clinical notes cannot be added to a cancelled appointment."
                  : "This consultation is completed; its clinical notes are read-only."}
              </p>
            ) : (
              <>
                <label
                  htmlFor="clinical-notes"
                  className="mt-3 block text-sm font-medium text-neutral-800"
                >
                  Notes for this encounter
                </label>
                <textarea
                  id="clinical-notes"
                  rows={5}
                  maxLength={CLINICAL_NOTES_MAX_LENGTH}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Diagnosis, advice, follow-up…"
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-neutral-500">
                    {notes.length}/{CLINICAL_NOTES_MAX_LENGTH} characters
                  </p>
                  <Button
                    onClick={handleSaveNotes}
                    loading={notesSaving}
                    disabled={notesSaving}
                  >
                    Save notes
                  </Button>
                </div>
              </>
            )}
            {notesError && (
              <div className="mt-3">
                <ErrorMessage message={notesError} />
              </div>
            )}
          </section>

          {/* Previous encounters — clinical continuity (fix/44 contract). */}
          <section
            aria-label="Previous clinical notes"
            className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-neutral-900">
              Previous clinical notes
            </h2>
            {previousNotes.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-600">
                No previous clinical notes for this patient.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {previousNotes.map((record) => (
                  <li
                    key={record.appointmentId}
                    className="rounded-md border border-neutral-200 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-900">
                        {formatDisplayDate(
                          String(record.appointmentDate ?? "").slice(0, 10),
                        )}
                      </p>
                      <StatusBadge status={record.status} />
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
                      {record.clinicalNotes}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Prescription (optional step before completing). */}
          <section
            aria-label="Prescriptions"
            className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-neutral-900">
              Prescriptions
            </h2>

            {createdPrescriptions.length > 0 && (
              <ul className="mt-3 space-y-2">
                {createdPrescriptions.map((prescription) => (
                  <li
                    key={prescription.prescriptionId}
                    className="rounded-md border border-neutral-200 p-3 text-sm text-neutral-800"
                  >
                    Prescription #{prescription.prescriptionId} —{" "}
                    {prescription.items.length}{" "}
                    {prescription.items.length === 1 ? "item" : "items"} (
                    {prescription.status})
                  </li>
                ))}
              </ul>
            )}

            {isClosed ? (
              <p className="mt-2 text-sm text-neutral-600">
                This consultation is closed; no further prescriptions can be
                issued here.
              </p>
            ) : (
              <>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input
                    id="rx-medicine"
                    label="Medicine name"
                    value={itemDraft.medicineName}
                    onChange={(event) =>
                      setItemDraft((draft) => ({
                        ...draft,
                        medicineName: event.target.value,
                      }))
                    }
                  />
                  <Input
                    id="rx-dosage"
                    label="Dosage"
                    placeholder="1 tablet"
                    value={itemDraft.dosage}
                    onChange={(event) =>
                      setItemDraft((draft) => ({
                        ...draft,
                        dosage: event.target.value,
                      }))
                    }
                  />
                  <Input
                    id="rx-frequency"
                    label="Frequency"
                    placeholder="Twice daily"
                    value={itemDraft.frequency}
                    onChange={(event) =>
                      setItemDraft((draft) => ({
                        ...draft,
                        frequency: event.target.value,
                      }))
                    }
                  />
                  <Input
                    id="rx-duration"
                    label="Duration (days)"
                    type="number"
                    min="1"
                    value={itemDraft.durationDays}
                    onChange={(event) =>
                      setItemDraft((draft) => ({
                        ...draft,
                        durationDays: event.target.value,
                      }))
                    }
                  />
                  <Input
                    id="rx-quantity"
                    label="Quantity"
                    type="number"
                    min="1"
                    value={itemDraft.quantity}
                    onChange={(event) =>
                      setItemDraft((draft) => ({
                        ...draft,
                        quantity: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleAddItem}>
                    Add medicine
                  </Button>
                  <Button
                    onClick={handleCreatePrescription}
                    loading={creatingPrescription}
                    disabled={items.length === 0 || creatingPrescription}
                  >
                    Create prescription
                  </Button>
                </div>
              </>
            )}

            {items.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  title="No medicines added yet."
                  message="Add a medicine above to build this prescription."
                />
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-neutral-200 rounded-md border border-neutral-200">
                {items.map((item, index) => (
                  <li
                    key={`${item.medicineName}-${index}`}
                    className="flex items-center justify-between gap-3 p-3 text-sm text-neutral-800"
                  >
                    <span>
                      {item.medicineName} — {item.dosage}, {item.frequency},{" "}
                      {item.durationDays} day
                      {item.durationDays === 1 ? "" : "s"}, qty {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setItems((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                      className="rounded px-2 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {prescriptionError && (
              <div className="mt-3">
                <ErrorMessage message={prescriptionError} />
              </div>
            )}
          </section>

          {/* Completion — happens here and only here. */}
          <section
            aria-label="Complete consultation"
            className="mt-6 flex flex-wrap items-center gap-3"
          >
            {canComplete ? (
              <Button
                onClick={handleComplete}
                loading={completing}
                disabled={completing}
              >
                Complete consultation
              </Button>
            ) : (
              <p className="text-sm text-neutral-600">
                {appointment.status === "COMPLETED"
                  ? "This consultation has been completed."
                  : "This appointment is cancelled; it cannot be completed."}
              </p>
            )}
            <Button
              variant="outline"
              onClick={() => navigate("/doctor/today-schedule")}
            >
              Back to today’s schedule
            </Button>
          </section>
        </>
      )}
    </div>
  );
};

export default ConsultationPage;
