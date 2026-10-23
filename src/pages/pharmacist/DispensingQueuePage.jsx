
import { useEffect, useState } from "react";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import Button from "../../components/Button";
import StatusBadge from "../../components/StatusBadge";
import {
  getPrescriptionsByStatus,
  getDispensePreview,
  dispensePrescription,
} from "../../services/prescriptionService";

const getMedicineName = (item, fallbackItem) =>
  fallbackItem?.medicineName ??
  fallbackItem?.name ??
  (item?.medicineId != null
    ? `Medicine #${item.medicineId}`
    : "Medicine name unavailable");

const isStockShortfall = (error) =>
  error?.status === 409 &&
  typeof error?.message === "string" &&
  error.message.toLowerCase().includes("insufficient stock") &&
  Array.isArray(error?.data?.items);

const DispensingQueuePage = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [queueAttempt, setQueueAttempt] = useState(0);

  const [selectedId, setSelectedId] = useState(null);
  const [verified, setVerified] = useState(false);
  const [dispenseConfirmed, setDispenseConfirmed] = useState(false);
  const [partialConfirmed, setPartialConfirmed] = useState(false);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewAttempt, setPreviewAttempt] = useState(0);

  const [dispensing, setDispensing] = useState(false);
  const [notice, setNotice] = useState("");

  // Load issued and partially dispensed prescriptions.
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const loadPrescriptions = async () => {
      try {
        const [issued, partiallyDispensed] = await Promise.all([
          getPrescriptionsByStatus("ISSUED", { signal }),
          getPrescriptionsByStatus("PARTIALLY_DISPENSED", { signal }),
        ]);

        if (signal.aborted) return;

        const merged = new Map();

        [...issued, ...partiallyDispensed].forEach((prescription) => {
          merged.set(String(prescription.prescriptionId), prescription);
        });

        const data = [...merged.values()].sort((a, b) =>
          String(b.prescriptionId).localeCompare(
            String(a.prescriptionId),
            undefined,
            { numeric: true },
          ),
        );

        setPrescriptions(data);

        setSelectedId((currentId) =>
          data.some(
            (prescription) =>
              String(prescription.prescriptionId) === String(currentId),
          )
            ? currentId
            : null,
        );
      } catch {
        if (!signal.aborted) {
          setError(true);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadPrescriptions();

    return () => controller.abort();
  }, [queueAttempt]);

  // Load the current stock preview for the selected prescription.
  useEffect(() => {
    if (selectedId == null) return undefined;

    const controller = new AbortController();
    const { signal } = controller;

    const loadPreview = async () => {
      try {
        const data = await getDispensePreview(selectedId, { signal });

        if (!signal.aborted) {
          setPreview(data);
        }
      } catch (requestError) {
        if (!signal.aborted) {
          setPreviewError(
            requestError?.userMessage ??
              requestError?.message ??
              "Unable to retrieve the stock preview.",
          );
        }
      } finally {
        if (!signal.aborted) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();

    return () => controller.abort();
  }, [selectedId, previewAttempt]);

  const selectedPrescription = prescriptions.find(
    (prescription) =>
      String(prescription.prescriptionId) === String(selectedId),
  );

  const prescriptionItems = selectedPrescription?.items ?? [];
  const previewItems = preview?.items ?? [];

  const hasPartialShortfall = previewItems.some(
    (item) => Number(item.shortfallQuantity) > 0,
  );

 
const hasDispensableItems = previewItems.some((item) => {
  const remaining = Number(item.remainingQuantity);
  const available = Number(item.availableStock);
  const shortfall = Number(item.shortfallQuantity);

  const canPartiallyDispense =
    item.reason === "Insufficient stock" &&
    available > 0 &&
    shortfall > 0;

  const canFullyDispense =
    item.dispensable !== false && !item.reason;

  return (
    item.medicineId != null &&
    remaining > 0 &&
    (canPartiallyDispense || canFullyDispense)
  );
});


  const handleSelect = (prescription) => {
    setSelectedId(prescription.prescriptionId);
    setVerified(false);
    setDispenseConfirmed(false);
    setPartialConfirmed(false);
    setPreview(null);
    setPreviewError("");
    setPreviewLoading(true);
    setNotice("");
    setPreviewAttempt((current) => current + 1);
  };

  const handleDispense = async () => {
    if (!selectedPrescription || !preview || previewLoading) {
      setNotice("Select a prescription and load its stock preview first.");
      return;
    }

    if (!verified) {
      setNotice("Verify the patient identity and prescription first.");
      return;
    }

    if (!hasDispensableItems) {
      setNotice(
        "No safe in-house medicine quantities are available to dispense. Review the preview and medicine reasons.",
      );
      return;
    }

    if (!dispenseConfirmed) {
      setNotice("Confirm that you want to dispense the available medicines.");
      return;
    }

    if (hasPartialShortfall && !partialConfirmed) {
      setNotice(
        "Stock is insufficient. Review the shortfall and explicitly confirm partial dispensing before continuing.",
      );
      return;
    }

    setDispensing(true);
    setNotice("");

    try {
      const result = await dispensePrescription(selectedId, {
        confirmPartial: partialConfirmed,
      });

      setNotice(
        result?.status === "PARTIALLY_DISPENSED"
          ? "Partial dispensing completed. The remaining prescription is still in the queue."
          : "Dispensing completed successfully.",
      );

      setVerified(false);
      setDispenseConfirmed(false);
      setPartialConfirmed(false);
      setPreview(null);
      setPreviewError("");
      setPreviewLoading(true);

      setQueueAttempt((current) => current + 1);
      setPreviewAttempt((current) => current + 1);
    } catch (requestError) {
      if (isStockShortfall(requestError)) {
        setPreview(requestError.data);
        setPreviewError("");
        setPartialConfirmed(false);
        setDispenseConfirmed(false);
        setNotice(
          "Stock availability changed. Review the updated preview, then confirm partial dispensing if you want to continue.",
        );
      } else {
        setNotice(
          requestError?.userMessage ??
            requestError?.message ??
            "Dispensing failed. Refresh the preview and try again if appropriate.",
        );
      }
    } finally {
      setDispensing(false);
    }
  };

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          Dispensing Queue
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Review prescription details and current stock before dispensing.
        </p>
      </header>

      {notice && (
        <div
          role="status"
          className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
        >
          {notice}
        </div>
      )}

      {loading && <LoadingSpinner label="Loading dispensing queue..." />}

      {error && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <ErrorMessage
            title="Unable to load prescriptions"
            message="Please check your connection and permissions, then try again."
          />
          <Button
            className="mt-3"
            onClick={() => {
              setLoading(true);
              setError(false);
              setQueueAttempt((current) => current + 1);
            }}
          >
            Retry
          </Button>
        </section>
      )}

      {!loading && !error && prescriptions.length === 0 && (
        <EmptyState
          title="No prescriptions pending dispensing"
          description="Issued and partially dispensed prescriptions will appear here."
        />
      )}

      {!loading && !error && prescriptions.length > 0 && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending prescriptions
              </h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
                {prescriptions.length}
              </span>
            </div>

            <ul className="divide-y divide-gray-100">
              {prescriptions.map((prescription) => (
                <li key={prescription.prescriptionId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(prescription)}
                    aria-pressed={
                      String(selectedId) ===
                      String(prescription.prescriptionId)
                    }
                    className={`w-full rounded-lg p-4 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      String(selectedId) ===
                      String(prescription.prescriptionId)
                        ? "bg-primary-50 ring-1 ring-primary-200"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold text-gray-900">
                        Prescription #{prescription.prescriptionId}
                      </span>
                      <StatusBadge status={prescription.status ?? "ISSUED"} />
                    </div>

                    <p className="mt-2 text-sm text-gray-600">
                      Patient ID: {prescription.patientId ?? "Unavailable"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Date:{" "}
                      {prescription.date ??
                        prescription.createdAt ??
                        "Unavailable"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Prescription details
            </h2>

            {!selectedPrescription ? (
              <p className="mt-4 text-sm text-gray-600">
                Select a prescription to review its details.
              </p>
            ) : (
              <div className="mt-4 space-y-5">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="font-semibold text-gray-900">
                    Prescription #{selectedPrescription.prescriptionId}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Patient ID:{" "}
                    {selectedPrescription.patientId ?? "Unavailable"}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Status: {selectedPrescription.status ?? "ISSUED"}
                  </p>
                </div>

                {previewLoading && (
                  <LoadingSpinner label="Checking current stock..." />
                )}

                {previewError && (
                  <div role="alert" className="space-y-3">
                    <ErrorMessage
                      title="Unable to load stock preview"
                      message={previewError}
                    />
                    <Button
                      onClick={() => {
                        setPreview(null);
                        setPreviewError("");
                        setPreviewLoading(true);
                        setPreviewAttempt((current) => current + 1);
                      }}
                    >
                      Retry preview
                    </Button>
                  </div>
                )}

                {preview && !previewLoading && (
                  <div>
                    <h3 className="mb-3 font-semibold text-gray-900">
                      Live stock preview
                    </h3>

                    <p className="mb-3 text-sm text-gray-600">
                      This preview is read-only. Stock changes only after the
                      dispensing request succeeds.
                    </p>

                    {previewItems.length === 0 ? (
                      <p className="text-sm text-gray-600">
                        No medicine items are available in the preview.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {previewItems.map((item, index) => {
                          const fallbackItem = prescriptionItems[index];

                          return (
                            <div
                              key={item.itemId ?? `${item.medicineId}-${index}`}
                              className="rounded-lg border border-gray-200 p-4"
                            >
                              <p className="font-medium text-gray-900">
                                {getMedicineName(item, fallbackItem)}
                              </p>

                              <p className="mt-1 text-sm text-gray-600">
                                Prescribed: {item.prescribedQuantity}
                              </p>
                              <p className="text-sm text-gray-600">
                                Already dispensed: {item.quantityDispensed}
                              </p>
                              <p className="text-sm text-gray-600">
                                Remaining: {item.remainingQuantity}
                              </p>
                              <p className="text-sm text-gray-600">
                                Available stock: {item.availableStock}
                              </p>
                              <p className="text-sm text-gray-600">
                                Quantity shortfall: {item.shortfallQuantity}
                              </p>

                              {item.unitPrice != null && (
                                <p className="text-sm text-gray-600">
                                  Unit price: {item.unitPrice}
                                </p>
                              )}

                              {item.reason && (
                                <p
                                  className={`mt-2 text-sm font-medium ${
                                    item.reason === "Insufficient stock"
                                      ? "text-amber-700"
                                      : "text-red-700"
                                  }`}
                                >
                                  {item.reason}
                                </p>
                              )}

                              {!item.reason && item.dispensable && (
                                <p className="mt-2 text-sm font-medium text-green-700">
                                  Available for dispensing
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {hasPartialShortfall && (
                      <label className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                        <input
                          type="checkbox"
                          checked={partialConfirmed}
                         onChange={(event) => {
  setPartialConfirmed(event.target.checked);
  setNotice("");
}}
                          className="mt-1 h-4 w-4"
                        />
                        <span>
                          I understand that stock is insufficient and confirm
                          dispensing only the available quantities.
                        </span>
                      </label>
                    )}
                  </div>
                )}

                <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(event) => {
                      setVerified(event.target.checked);
                      setDispenseConfirmed(false);
                      setNotice("");
                    }}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    I have verified the patient identity and prescription.
                  </span>
                </label>

                {preview && !previewLoading && (
                  <>
                    <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={dispenseConfirmed}
                        onChange={(event) => {
                          setDispenseConfirmed(event.target.checked);
                          setNotice("");
                        }}
                        className="mt-1 h-4 w-4"
                      />
                      <span>
                        I confirm the actual dispensing operation. The backend
                        will update medicine stock.
                      </span>
                    </label>

                    <Button
                      onClick={handleDispense}
                      disabled={
                        previewLoading ||
                        dispensing ||
                        !verified ||
                        !dispenseConfirmed ||
                        !hasDispensableItems ||
                        (hasPartialShortfall && !partialConfirmed)
                      }
                    >
                      {dispensing
                        ? "Dispensing..."
                        : hasPartialShortfall
                          ? "Confirm partial dispensing"
                          : "Dispense medicines"}
                    </Button>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
};

export default DispensingQueuePage;
