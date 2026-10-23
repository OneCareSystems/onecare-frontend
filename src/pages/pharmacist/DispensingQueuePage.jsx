
import { useCallback, useEffect, useState } from "react";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import Button from "../../components/Button";
import StatusBadge from "../../components/StatusBadge";
import { getPrescriptionsByStatus } from "../../services/prescriptionService";

const getMedicineName = (item) =>
  item.medicineName ?? item.name ?? "Medicine name unavailable";

const getQuantity = (item) => {
  const quantity = Number(item.quantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
};

const DispensingQueuePage = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [verified, setVerified] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [notice, setNotice] = useState("");

  const loadPrescriptions = useCallback(async (signal) => {
    setLoading(true);
    setError(false);

    try {
      const data = await getPrescriptionsByStatus("ISSUED", { signal });

      if (!signal.aborted) {
        setPrescriptions(data);
        setSelectedId((currentId) =>
          data.some(
            (prescription) =>
              String(prescription.prescriptionId) === String(currentId),
          )
            ? currentId
            : null,
        );
      }
    } catch {
      if (!signal.aborted) {
        setError(true);
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

 
useEffect(() => {
  const controller = new AbortController();

  Promise.resolve().then(() => {
    if (!controller.signal.aborted) {
      void loadPrescriptions(controller.signal);
    }
  });

  return () => controller.abort();
}, [loadPrescriptions, attempt]);


  const selectedPrescription = prescriptions.find(
    (prescription) =>
      String(prescription.prescriptionId) === String(selectedId),
  );

  const items = selectedPrescription?.items ?? [];

  const handleSelect = (prescription) => {
    setSelectedId(prescription.prescriptionId);
    setVerified(false);
    setNotice("");
    setQuantities(
      Object.fromEntries(
        (prescription.items ?? []).map((item, index) => [
          String(index),
          getQuantity(item),
        ]),
      ),
    );
  };

  const handleQuantityChange = (index, value, maximum) => {
    const parsed = value === "" ? "" : Number(value);

    setQuantities((current) => ({
      ...current,
      [String(index)]:
        value === ""
          ? ""
          : Number.isFinite(parsed) && parsed >= 0
            ? Math.min(parsed, maximum)
            : 0,
    }));
    setNotice("");
  };

  const handlePreviewConfirmation = () => {
    if (!selectedPrescription || !verified) {
      setNotice("Verify the patient and prescription before continuing.");
      return;
    }

    const invalid = items.some((item, index) => {
      const quantity = quantities[String(index)];
      return (
        quantity === "" ||
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) < 0 ||
        Number(quantity) > getQuantity(item)
      );
    });

    if (invalid) {
      setNotice("Enter a valid quantity for every medicine.");
      return;
    }

    const total = items.reduce(
      (sum, item, index) => sum + Number(quantities[String(index)] ?? 0),
      0,
    );

    if (total === 0) {
      setNotice("Enter at least one medicine quantity.");
      return;
    }

    setNotice(
      "Preview only: no medicine has been dispensed and no stock has changed. Actual dispensing will be connected after the DDP-30 backend API is confirmed.",
    );
  };

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          Dispensing Queue
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Review issued prescriptions before dispensing medicine.
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
            message="Please check your connection and try again."
          />
          <Button
            className="mt-3"
            onClick={() => setAttempt((current) => current + 1)}
          >
            Retry
          </Button>
        </section>
      )}

      {!loading && !error && prescriptions.length === 0 && (
        <EmptyState
          title="No prescriptions pending dispensing"
          description="Issued prescriptions will appear here when available."
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
                      <StatusBadge status="pending dispense" />
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Patient ID: {prescription.patientId ?? "Unavailable"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Date: {prescription.date ?? prescription.createdAt ?? "Unavailable"}
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
                    Patient ID: {selectedPrescription.patientId ?? "Unavailable"}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Status: {selectedPrescription.status ?? "ISSUED"}
                  </p>
                </div>

                <div>
                  <h3 className="mb-3 font-semibold text-gray-900">
                    Prescribed medicines
                  </h3>

                  {items.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      No medicine items are available in this prescription response.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {items.map((item, index) => {
                        const prescribed = getQuantity(item);
                        const quantity = quantities[String(index)] ?? prescribed;

                        return (
                          <div
                            key={`${getMedicineName(item)}-${index}`}
                            className="rounded-lg border border-gray-200 p-4"
                          >
                            <p className="font-medium text-gray-900">
                              {getMedicineName(item)}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              Dosage: {item.dosage ?? "Not provided"}
                            </p>
                            <p className="text-sm text-gray-600">
                              Frequency: {item.frequency ?? "Not provided"}
                            </p>
                            <p className="text-sm text-gray-600">
                              Duration: {item.durationDays ?? "Not provided"} days
                            </p>
                            <p className="text-sm text-gray-600">
                              Prescribed quantity: {prescribed}
                            </p>

                            <label
                              htmlFor={`dispense-quantity-${index}`}
                              className="mt-3 block text-sm font-medium text-gray-700"
                            >
                              Quantity to prepare (preview only)
                            </label>
                            <input
                              id={`dispense-quantity-${index}`}
                              type="number"
                              min="0"
                              max={prescribed}
                              step="1"
                              value={quantity}
                              onChange={(event) =>
                                handleQuantityChange(
                                  index,
                                  event.target.value,
                                  prescribed,
                                )
                              }
                              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(event) => {
                      setVerified(event.target.checked);
                      setNotice("");
                    }}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    I have verified the patient identity and prescription.
                  </span>
                </label>

                <div>
                  <label
                    htmlFor="pharmacy-note"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Pharmacy note (optional)
                  </label>
                  <textarea
                    id="pharmacy-note"
                    rows={3}
                    maxLength={500}
                    placeholder="Enter a pharmacy-related note..."
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Do not enter diagnoses or clinical notes here.
                  </p>
                </div>

                <Button
                  onClick={handlePreviewConfirmation}
                  disabled={items.length === 0}
                >
                  Validate dispensing preview
                </Button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
};

export default DispensingQueuePage;
