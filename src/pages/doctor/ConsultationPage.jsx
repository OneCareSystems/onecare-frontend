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
import Icon from "../../components/Icon";
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
  const completingRef = useRef(false);
  const [toast, setToast] = useState(null);

  // Active duration timer (UI display)
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isClosed =
    appointment?.status === "COMPLETED" || appointment?.status === "CANCELLED";
  const canComplete = appointment?.status === "SCHEDULED";

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

  const previousNotes =
    history?.appointments?.filter(
      (record) =>
        String(record.appointmentId) !== String(appointmentId) &&
        typeof record.clinicalNotes === "string" &&
        record.clinicalNotes.trim().length > 0,
    ) ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-6 sm:px-6">
      {/* Top Banner with Active Timer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-md shadow-primary-600/20">
            <Icon name="stethoscope" className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700">
                ACTIVE CONSULTATION
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                Appt #{appointmentId}
              </span>
            </div>
            <h1 className="text-base font-bold text-neutral-900">
              Consultation Room
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-mono font-bold text-xs">
            <Icon name="clock" className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>{formatTimer(timerSeconds)}</span>
          </div>

          {canComplete ? (
            <Button
              onClick={handleComplete}
              loading={completing}
              disabled={completing}
              size="sm"
            >
              <Icon name="circle-check" className="w-4 h-4 mr-1.5" />
              Complete Consultation
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/doctor/today-schedule")}
            >
              Back to Schedule
            </Button>
          )}
        </div>
      </div>

      {toast && (
        <div className="my-2">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {loadStatus === "loading" ? (
        <div className="flex justify-center rounded-3xl border border-neutral-200 bg-white p-12 shadow-xs">
          <LoadingSpinner label="Loading consultation details" />
        </div>
      ) : loadStatus === "not-found" ? (
        <div className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
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
        <div className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Patient Profile & Clinical Notes */}
          <div className="lg:col-span-7 space-y-6">
            {/* Patient Card */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="user" className="w-4 h-4 text-primary-600" />
                  <h2 className="text-sm font-bold text-neutral-900">Patient Details</h2>
                </div>
                <StatusBadge status={appointment.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Patient Name
                  </span>
                  <span className="text-xs font-bold text-neutral-900 truncate block mt-0.5">
                    {patientName ?? `Patient ${appointment.patientId ?? "—"}`}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Date & Time
                  </span>
                  <span className="text-xs font-bold text-neutral-900 block mt-0.5">
                    {formatDisplayDate(
                      String(appointment.appointmentDate ?? "").slice(0, 10)
                    )}{" "}
                    • {formatTimeSlot(appointment.timeSlot)}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Reason
                  </span>
                  <span className="text-xs font-bold text-neutral-900 truncate block mt-0.5">
                    {appointment.reason || "None specified"}
                  </span>
                </div>
              </div>
            </div>

            {/* Encounter Clinical Notes */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="clipboard" className="w-4 h-4 text-primary-600" />
                  <h2 className="text-sm font-bold text-neutral-900">
                    Clinical Examination & Notes
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-neutral-400">
                  {notes.length}/{CLINICAL_NOTES_MAX_LENGTH}
                </span>
              </div>

              {isClosed ? (
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
                  {appointment.status === "CANCELLED"
                    ? "Clinical notes cannot be added to a cancelled appointment."
                    : "This consultation is completed; its clinical notes are read-only."}
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    id="clinical-notes"
                    rows={6}
                    maxLength={CLINICAL_NOTES_MAX_LENGTH}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="w-full p-4 text-xs bg-neutral-50/50 border border-neutral-200 rounded-2xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 leading-relaxed transition-all"
                    placeholder="Diagnosis, advice, follow-up..."
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveNotes}
                      loading={notesSaving}
                      disabled={notesSaving}
                      size="sm"
                    >
                      Save Notes
                    </Button>
                  </div>
                </div>
              )}
              {notesError && <ErrorMessage message={notesError} />}
            </div>

            {/* Previous Encounter History */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                <Icon name="history" className="w-4 h-4 text-neutral-600" />
                <h2 className="text-sm font-bold text-neutral-900">
                  Previous Clinical Notes
                </h2>
              </div>

              {previousNotes.length === 0 ? (
                <p className="text-xs text-neutral-500">
                  No previous clinical notes for this patient.
                </p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {previousNotes.map((record) => (
                    <div
                      key={record.appointmentId}
                      className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-800">
                          {formatDisplayDate(
                            String(record.appointmentDate ?? "").slice(0, 10)
                          )}
                        </span>
                        <StatusBadge status={record.status} />
                      </div>
                      <p className="text-neutral-700 whitespace-pre-wrap leading-relaxed">
                        {record.clinicalNotes}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: E-Prescription Builder */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="pill" className="w-4 h-4 text-purple-600" />
                  <h2 className="text-sm font-bold text-neutral-900">
                    E-Prescription Builder
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2.5 py-0.5 rounded-full">
                  Pharmacy Queue
                </span>
              </div>

              {createdPrescriptions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Issued Prescriptions
                  </span>
                  {createdPrescriptions.map((prescription) => (
                    <div
                      key={prescription.prescriptionId}
                      className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between"
                    >
                      <span className="font-medium">
                        Prescription #{prescription.prescriptionId} —{" "}
                        {prescription.items.length}{" "}
                        {prescription.items.length === 1 ? "item" : "items"}
                      </span>
                      <span className="font-bold text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                        {prescription.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {isClosed ? (
                <p className="text-xs text-neutral-500">
                  This consultation is closed; no further prescriptions can be issued here.
                </p>
              ) : (
                <div className="space-y-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                  <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">
                    Add Medication Item
                  </span>
                  <Input
                    id="rx-medicine"
                    label="Medicine Name"
                    value={itemDraft.medicineName}
                    onChange={(event) =>
                      setItemDraft((draft) => ({
                        ...draft,
                        medicineName: event.target.value,
                      }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
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
                  </div>
                  <div className="grid grid-cols-2 gap-2">
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

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="w-full mt-1"
                  >
                    <Icon name="plus" className="w-3.5 h-3.5 mr-1" /> Add Medication
                  </Button>
                </div>
              )}

              {/* Added Medicines List */}
              {items.length === 0 ? (
                <EmptyState
                  title="No medicines added yet."
                  message="Add a medicine above to build this prescription."
                />
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <div
                      key={`${item.medicineName}-${index}`}
                      className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <h4 className="font-bold text-neutral-900">
                          {item.medicineName}{" "}
                          <span className="font-mono text-primary-600 font-medium">
                            ({item.dosage})
                          </span>
                        </h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          {item.frequency} • {item.durationDays} day
                          {item.durationDays === 1 ? "" : "s"} • Qty: {item.quantity}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setItems((current) =>
                            current.filter((_, i) => i !== index)
                          )
                        }
                        className="p-1 text-neutral-400 hover:text-rose-600 transition-colors"
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!isClosed && items.length > 0 && (
                <Button
                  onClick={handleCreatePrescription}
                  loading={creatingPrescription}
                  disabled={creatingPrescription}
                  className="w-full"
                  size="sm"
                >
                  <Icon name="trash" className="w-3.5 h-3.5 mr-1.5" />
                  Transmit Prescription
                </Button>
              )}

              {prescriptionError && <ErrorMessage message={prescriptionError} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationPage;