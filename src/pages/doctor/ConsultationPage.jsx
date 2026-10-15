import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import Input from "../../components/Input";
import StatusBadge from "../../components/StatusBadge";
import Toast from "../../components/Toast";
import { PageHeader, PageShell } from "../../components/doctor/PageLayout";
import {
  DetailTile,
  ErrorPanel,
  Panel,
  SkeletonBlock,
} from "../../components/doctor/Panel";
import {
  getAppointmentById,
  getPatientHistory,
  saveClinicalNotes,
} from "../../services/appointmentService";
import { getPatient } from "../../services/patientService";
import { searchMedicines } from "../../services/medicineService";
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

const EMPTY_ITEM = {
  medicineName: "",
  dosage: "",
  frequency: "",
  durationDays: "1",
  quantity: "1",
};

const DRAFT_FIELDS = [
  {
    key: "medicineName",
    id: "rx-medicine",
    label: "Medicine Name",
    wide: true,
  },
  { key: "dosage", id: "rx-dosage", label: "Dosage", placeholder: "1 tablet" },
  {
    key: "frequency",
    id: "rx-frequency",
    label: "Frequency",
    placeholder: "Twice daily",
  },
  {
    key: "durationDays",
    id: "rx-duration",
    label: "Duration (days)",
    type: "number",
    min: "1",
  },
  {
    key: "quantity",
    id: "rx-quantity",
    label: "Quantity",
    type: "number",
    min: "1",
  },
];

/**
 * The elapsed-time clock lives in its own component so its once-a-second
 * state update re-renders only this badge, never the whole consultation form.
 * It runs only while the appointment is still open.
 */
const ConsultationTimer = memo(function ConsultationTimer({ running }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <span
      role="timer"
      aria-label="Elapsed time"
      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-amber-900"
    >
      <Icon
        name="clock"
        className={`h-3.5 w-3.5 text-amber-600 ${running ? "motion-safe:animate-pulse" : ""}`}
      />
      {formatElapsed(seconds)}
    </span>
  );
});

const MedicationRow = memo(function MedicationRow({ item, index, onRemove }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-neutral-900">
          {item.medicineName}{" "}
          <span className="font-mono font-medium text-primary-600">
            ({item.dosage})
          </span>
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">
          {item.frequency}, {item.durationDays} day
          {item.durationDays === 1 ? "" : "s"}, quantity {item.quantity}
        </p>
      </div>
      <button
        type="button"
        aria-label={`Remove ${item.medicineName}`}
        onClick={() => onRemove(index)}
        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-primary-600"
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </li>
  );
});

const PreviousNote = memo(function PreviousNote({ record }) {
  return (
    <li className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-neutral-800">
          {formatDisplayDate(toDateOnly(record.appointmentDate))}
        </span>
        <StatusBadge status={record.status} />
      </div>
      <p className="whitespace-pre-wrap leading-relaxed text-neutral-700">
        {record.clinicalNotes}
      </p>
    </li>
  );
});

/**
 * DOC-04 - Consultation screen.
 *
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
  const notesDirtyRef = useRef(false);

  const [history, setHistory] = useState(null); // null = not loaded / unavailable

  const [items, setItems] = useState([]);
  const [itemDraft, setItemDraft] = useState(EMPTY_ITEM);
  const [medicineSuggestions, setMedicineSuggestions] = useState([]);
  const [creatingPrescription, setCreatingPrescription] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState(null);
  const [createdPrescriptions, setCreatedPrescriptions] = useState([]);
  const [relatedPrescriptions, setRelatedPrescriptions] = useState(null);

  const [completing, setCompleting] = useState(false);
  const completingRef = useRef(false);
  const [toast, setToast] = useState(null);

  const loadIdRef = useRef(0);

  useEffect(() => {
    const query = itemDraft.medicineName.trim();
    if (query.length < 2) {
      setMedicineSuggestions([]);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      searchMedicines(query, { signal: controller.signal })
        .then(setMedicineSuggestions)
        .catch(() => {
          if (!controller.signal.aborted) setMedicineSuggestions([]);
        });
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [itemDraft.medicineName]);

  const isClosed =
    appointment?.status === "COMPLETED" || appointment?.status === "CANCELLED";
  const isCompleted = appointment?.status === "COMPLETED";
  const canComplete = appointment?.status === "SCHEDULED";

  const load = useCallback(() => {
    const loadId = ++loadIdRef.current;
    const isStale = () => loadId !== loadIdRef.current;

    setRelatedPrescriptions(null);
    getAppointmentById(appointmentId)
      .then((found) => {
        if (isStale()) return;
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
          .then((patient) => !isStale() && setPatientName(patient.fullName))
          .catch(() => !isStale() && setPatientName(null));
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
                if (!isStale()) setRelatedPrescriptions(prescriptions);
              })
              .catch(() => {
                if (!isStale()) setRelatedPrescriptions("failed");
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
        if (!isStale()) setLoadStatus("failed");
      });
  }, [appointmentId]);

  useEffect(() => {
    load();
    return () => {
      loadIdRef.current += 1; // ignore responses that arrive after unmount
    };
  }, [load]);

  const handleNotesChange = useCallback((event) => {
    notesDirtyRef.current = true;
    setNotes(event.target.value);
    setNotesError(null);
  }, []);

  const handleSaveNotes = useCallback(() => {
    if (notesSaving) return;
    setNotesSaving(true);
    setNotesError(null);
    saveClinicalNotes(appointmentId, notes)
      .then(() => setToast({ type: "success", message: SAVED_NOTES_MESSAGE }))
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

  const handleDraftChange = useCallback(
    (key) => (event) =>
      setItemDraft((draft) => ({ ...draft, [key]: event.target.value })),
    [],
  );

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

  const handleRemoveItem = useCallback((index) => {
    setItems((current) => current.filter((_, i) => i !== index));
  }, []);

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
        setRelatedPrescriptions((current) =>
          Array.isArray(current) ? [...current, prescription] : [prescription],
        );
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
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
              Appt #{appointmentId}
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
              className="inline-flex items-center gap-2"
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
          <div className="space-y-6 lg:col-span-7">
            <Panel
              icon="user"
              title="Patient Details"
              aside={<StatusBadge status={appointment.status} />}
            >
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DetailTile label="Patient name">
                  {patientName ??
                    `Patient ${appointment.patientId ?? "\u2014"}`}
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

            <Panel
              icon="clipboard"
              title="Clinical Examination & Notes"
              titleId="clinical-notes-heading"
              aside={
                <span className="text-xs font-medium tabular-nums text-neutral-500">
                  {notes.length}/{CLINICAL_NOTES_MAX_LENGTH}
                </span>
              }
              bodyClassName="space-y-3"
            >
              {isClosed ? (
                <>
                  <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                    {appointment.status === "CANCELLED"
                      ? "Clinical notes cannot be added to a cancelled appointment."
                      : "This consultation is completed; its clinical notes are read-only."}
                  </p>
                  {appointment.status === "COMPLETED" && notes.trim() && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
                      {notes}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <textarea
                    id="clinical-notes"
                    aria-labelledby="clinical-notes-heading"
                    rows={7}
                    maxLength={CLINICAL_NOTES_MAX_LENGTH}
                    value={notes}
                    onChange={handleNotesChange}
                    className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 text-sm leading-relaxed text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
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
                </>
              )}
              {notesError && <ErrorMessage message={notesError} />}
            </Panel>

            <Panel icon="history" title="Previous Clinical Notes">
              {previousNotes.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No previous clinical notes for this patient.
                </p>
              ) : (
                <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {previousNotes.map((record) => (
                    <PreviousNote key={record.appointmentId} record={record} />
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="lg:col-span-5">
            <Panel
              icon="pill"
              title="E-Prescription Builder"
              aside={
                <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                  Pharmacy Queue
                </span>
              }
            >
              {createdPrescriptions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-neutral-600">
                    Issued prescriptions
                  </p>
                  <ul className="space-y-2">
                    {createdPrescriptions.map((prescription) => (
                      <li
                        key={prescription.prescriptionId}
                        className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
                      >
                        <span className="font-medium">
                          Prescription #{prescription.prescriptionId} &mdash;{" "}
                          {prescription.items?.length ?? 0}{" "}
                          {prescription.items?.length === 1 ? "item" : "items"}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          {prescription.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isClosed ? (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-500">
                    This consultation is closed; no further prescriptions can be
                    issued here.
                  </p>
                  {appointment.status === "COMPLETED" && (
                    <div className="space-y-2" aria-live="polite">
                      <p className="text-sm font-medium text-neutral-700">
                        Prescriptions for this appointment
                      </p>
                      {relatedPrescriptions === null ? (
                        <p className="text-sm text-neutral-500">
                          Loading prescriptions...
                        </p>
                      ) : relatedPrescriptions === "failed" ? (
                        <p className="text-sm text-neutral-600">
                          Prescription details are unavailable right now.
                        </p>
                      ) : relatedPrescriptions.length === 0 ? (
                        <p className="text-sm text-neutral-500">
                          No prescriptions are linked to this appointment.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {relatedPrescriptions.map((prescription) => (
                            <li
                              key={prescription.prescriptionId}
                              className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                            >
                              <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="font-semibold text-neutral-900">
                                  Prescription #{prescription.prescriptionId}
                                </span>
                                <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
                                  {prescription.status}
                                </span>
                              </div>
                              <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                                {prescription.items.map((item, index) => (
                                  <li
                                    key={
                                      item.itemId ??
                                      `${item.medicineName}-${index}`
                                    }
                                  >
                                    <span className="font-medium">
                                      {item.medicineName}
                                    </span>
                                    {item.dosage ? ` — ${item.dosage}` : ""}
                                    {item.frequency
                                      ? `, ${item.frequency}`
                                      : ""}
                                    {item.durationDays
                                      ? ` for ${item.durationDays} days`
                                      : ""}
                                    {item.quantity
                                      ? ` (qty ${item.quantity})`
                                      : ""}
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <fieldset className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <legend className="px-1 text-sm font-semibold text-neutral-800">
                    Add Medication Item
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative col-span-2">
                      <Input
                        id="rx-medicine"
                        label="Medicine Name"
                        placeholder="Type at least 2 characters to search"
                        value={itemDraft.medicineName}
                        onChange={handleDraftChange("medicineName")}
                        autoComplete="off"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={medicineSuggestions.length > 0}
                      />
                      {medicineSuggestions.length > 0 && (
                        <ul
                          role="listbox"
                          aria-label="Available medicines"
                          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
                        >
                          {medicineSuggestions.map((medicine, index) => {
                            const name = medicine.medicineName ?? medicine.name;
                            return (
                              <li
                                key={
                                  medicine.medicineId ??
                                  medicine.id ??
                                  `${name}-${index}`
                                }
                              >
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={false}
                                  onMouseDown={(event) =>
                                    event.preventDefault()
                                  }
                                  onClick={() => {
                                    setItemDraft((draft) => ({
                                      ...draft,
                                      medicineName: name,
                                    }));
                                    setMedicineSuggestions([]);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-neutral-800 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none"
                                >
                                  {name}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    {DRAFT_FIELDS.filter(
                      (field) => field.key !== "medicineName",
                    ).map((field) => (
                      <div
                        key={field.key}
                        className={field.wide ? "col-span-2" : ""}
                      >
                        <Input
                          id={field.id}
                          label={field.label}
                          type={field.type}
                          min={field.min}
                          placeholder={field.placeholder}
                          value={itemDraft[field.key]}
                          onChange={handleDraftChange(field.key)}
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="inline-flex w-full items-center justify-center gap-1.5"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    Add Medication
                  </Button>
                </fieldset>
              )}

              {items.length === 0 ? (
                <EmptyState
                  title="No medicines added yet."
                  message="Add a medicine above to build this prescription."
                />
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <MedicationRow
                      key={`${item.medicineName}-${index}`}
                      item={item}
                      index={index}
                      onRemove={handleRemoveItem}
                    />
                  ))}
                </ul>
              )}

              {!isClosed && items.length > 0 && (
                <Button
                  onClick={handleCreatePrescription}
                  loading={creatingPrescription}
                  disabled={creatingPrescription}
                  size="sm"
                  className="inline-flex w-full items-center justify-center gap-1.5"
                >
                  <Icon name="arrow-up-right" className="h-4 w-4" />
                  Transmit Prescription
                </Button>
              )}

              {prescriptionError && (
                <ErrorMessage message={prescriptionError} />
              )}
            </Panel>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default ConsultationPage;
