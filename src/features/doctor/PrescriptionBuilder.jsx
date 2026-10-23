import { memo, useCallback, useEffect, useState } from "react";

import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import Input from "../../components/Input";
import { Panel } from "../../components/doctor/Panel";
import { searchMedicines } from "../../services/medicineService";

const EMPTY_ITEM = {
  medicineName: "",
  dosage: "",
  frequency: "",
  durationDays: "1",
  quantity: "1",
};

/**
 * Field configuration for the "Add Medication" form inside the builder.
 * `wide: true` spans both grid columns.
 */
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

/** Single row in the "medications to be issued" list. */
const MedicationRow = memo(function MedicationRow({ item, index, onRemove }) {
  return (
    <li className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50/30">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900">
            {item.medicineName}
            <span className="ml-2 font-mono text-xs font-medium text-primary-600">
              {item.dosage}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {item.frequency} · {item.durationDays} day
            {item.durationDays === 1 ? "" : "s"} · qty {item.quantity}
          </p>
        </div>
      </div>

      <button
        type="button"
        aria-label={`Remove ${item.medicineName}`}
        onClick={() => onRemove(index)}
        className="flex-shrink-0 rounded-lg p-1.5 text-neutral-400 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary-600 group-hover:opacity-100"
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </li>
  );
});

/**
 * E-Prescription Builder panel.
 *
 * Handles medicine autocomplete, draft item accumulation, and the
 * "Transmit Prescription" action.  All persistent state (created
 * prescriptions, closed status) is controlled by the parent.
 *
 * @param {object}    props
 * @param {boolean}   props.isClosed             True when appointment is COMPLETED or CANCELLED.
 * @param {boolean}   props.creatingPrescription  True while submit request is in flight.
 * @param {string|null} props.prescriptionError   Inline error from the last create attempt.
 * @param {Array}     props.createdPrescriptions  Prescriptions issued in this session.
 * @param {Array|null|"failed"} props.relatedPrescriptions Prescriptions for a completed appt.
 * @param {Function}  props.onCreatePrescription  Called with the item list when transmitting.
 * @param {Function}  props.onPrescriptionError   Called to set/clear the error string.
 */
const PrescriptionBuilder = ({
  isClosed,
  creatingPrescription,
  prescriptionError,
  createdPrescriptions,
  relatedPrescriptions,
  onCreatePrescription,
  onPrescriptionError,
}) => {
  const [items, setItems] = useState([]);
  const [itemDraft, setItemDraft] = useState(EMPTY_ITEM);
  const [medicineSuggestions, setMedicineSuggestions] = useState([]);
  const [medicineSuggestionsForQuery, setMedicineSuggestionsForQuery] =
    useState("");

  // Medicine autocomplete — debounced at 250 ms.
  useEffect(() => {
    const query = itemDraft.medicineName.trim();

    if (query.length < 2) {
      return undefined;
    }

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      searchMedicines(query, { signal: controller.signal })
        .then((suggestions) => {
          if (controller.signal.aborted) return;
          setMedicineSuggestions(suggestions);
          setMedicineSuggestionsForQuery(query);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setMedicineSuggestions([]);
          setMedicineSuggestionsForQuery("");
        });
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [itemDraft.medicineName]);

  const medicineQuery = itemDraft.medicineName.trim();
  const visibleMedicineSuggestions =
    medicineQuery.length >= 2 && medicineSuggestionsForQuery === medicineQuery
      ? medicineSuggestions
      : [];

  const handleDraftChange = useCallback(
    (key) => (event) =>
      setItemDraft((draft) => ({
        ...draft,
        [key]: event.target.value,
      })),
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
      onPrescriptionError(
        "Fill in medicine name, dosage, frequency, duration (days) and quantity.",
      );
      return;
    }

    onPrescriptionError(null);

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
  }, [itemDraft, onPrescriptionError]);

  const handleRemoveItem = useCallback((index) => {
    setItems((current) => current.filter((_, i) => i !== index));
  }, []);

  const handleTransmit = useCallback(() => {
    if (creatingPrescription || items.length === 0) return;
    onCreatePrescription(items, () => setItems([]));
  }, [creatingPrescription, items, onCreatePrescription]);

  return (
    <Panel
      icon="pill"
      title="E-Prescription Builder"
      aside={
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Pharmacy Queue
        </span>
      }
    >
      {/* Prescriptions issued in this session */}
      {createdPrescriptions.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <Icon name="check-circle" className="h-3.5 w-3.5" />
            Issued this session
          </p>

          <ul className="space-y-2">
            {createdPrescriptions.map((prescription) => (
              <li
                key={prescription.prescriptionId}
                className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900"
              >
                <span className="font-medium">
                  Prescription #{prescription.prescriptionId}
                  <span className="ml-1.5 text-emerald-700">
                    · {prescription.items?.length ?? 0}{" "}
                    {prescription.items?.length === 1 ? "item" : "items"}
                  </span>
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
            This consultation is closed; no further prescriptions can be issued
            here.
          </p>

          {/* Related prescriptions for a completed appointment */}
          {relatedPrescriptions !== undefined && (
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
                            key={item.itemId ?? `${item.medicineName}-${index}`}
                          >
                            <span className="font-medium">
                              {item.medicineName}
                            </span>
                            {item.dosage ? ` — ${item.dosage}` : ""}
                            {item.frequency ? `, ${item.frequency}` : ""}
                            {item.durationDays
                              ? ` for ${item.durationDays} days`
                              : ""}
                            {item.quantity ? ` (qty ${item.quantity})` : ""}
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
        <>
          {/* Add Medication fieldset */}
          <fieldset className="space-y-3 rounded-xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white p-4">
            <legend className="px-1 text-sm font-semibold text-neutral-800">
              Add Medication Item
            </legend>

            <div className="grid grid-cols-2 gap-3">
              {/* Medicine name with autocomplete */}
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
                  aria-expanded={visibleMedicineSuggestions.length > 0}
                />

                {visibleMedicineSuggestions.length > 0 && (
                  <ul
                    role="listbox"
                    aria-label="Available medicines"
                    className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
                  >
                    {visibleMedicineSuggestions.map((medicine, index) => {
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
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setItemDraft((draft) => ({
                                ...draft,
                                medicineName: name,
                              }));
                              setMedicineSuggestions([]);
                              setMedicineSuggestionsForQuery("");
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

              {/* Remaining fields */}
              {DRAFT_FIELDS.filter((field) => field.key !== "medicineName").map(
                (field) => (
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
                ),
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="inline-flex w-full items-center justify-center gap-1.5 border-dashed"
            >
              <Icon name="plus" className="h-4 w-4" />
              Add Medication
            </Button>
          </fieldset>

          {/* Staged medication list */}
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

          {items.length > 0 && (
            <Button
              onClick={handleTransmit}
              loading={creatingPrescription}
              disabled={creatingPrescription}
              size="sm"
              className="inline-flex w-full items-center justify-center gap-1.5 shadow-sm"
            >
              <Icon name="arrow-up-right" className="h-4 w-4" />
              Transmit Prescription
            </Button>
          )}
        </>
      )}

      {prescriptionError && <ErrorMessage message={prescriptionError} />}
    </Panel>
  );
};

export default PrescriptionBuilder;
