
import { useState } from "react";
import {
  completeExternalDispensing,
  createExternalDispensing,
  verifyExternalDispensingIdentity,
} from "../../services/externalDispensingService";

const initialItem = () => ({
  medicineId: "",
  prescriptionItemId: "",
  medicineName: "",
  quantity: "1",
});

export default function ExternalDispensingPage() {
  const [step, setStep] = useState(1);
  const [prescriptionId, setPrescriptionId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [items, setItems] = useState([initialItem()]);
  const [verificationMethod, setVerificationMethod] = useState("PHONE");
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState("PICK_UP");
  const [dispensing, setDispensing] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateItem = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const record = await createExternalDispensing({
        prescriptionId: Number(prescriptionId),
        patientId: Number(patientId),
        verificationMethod,
        deliveryMethod,
        items: items.map((item) => ({
          medicineId: Number(item.medicineId),
          prescriptionItemId: item.prescriptionItemId
            ? Number(item.prescriptionItemId)
            : null,
          medicineName: item.medicineName.trim() || null,
          quantity: Number(item.quantity),
        })),
      });

      setDispensing(record);
      setStep(2);
    } catch (err) {
      setError(err.userMessage || err.message || "Unable to create dispensing record.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");

    if (!identityConfirmed) {
      setError("Confirm that you have checked the patient's identity before continuing.");
      return;
    }

    setLoading(true);

    try {
      const record = await verifyExternalDispensingIdentity(
        dispensing.dispenseId,
        {
          verificationMethod,
          verified: true,
          notes: "Identity checked by staff against the selected identifier.",
        },
      );

      setDispensing(record);
      setStep(3);
    } catch (err) {
      setError(
        err.userMessage ||
          "Identity verification failed. Please verify and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setError("");
    setLoading(true);

    try {
      const completed = await completeExternalDispensing(dispensing.dispenseId);
      setResult(completed);
      setDispensing(completed);
      setStep(4);
    } catch (err) {
      setError(err.userMessage || err.message || "Unable to complete dispensing.");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems((current) => [...current, initialItem()]);
  };

  const removeItem = (index) => {
    setItems((current) => current.filter((_, i) => i !== index));
  };

  return (
    <main className="page-container">
      <h1>External Dispensing</h1>
      <p>Record and complete dispensing for an external prescription.</p>

      <nav aria-label="Dispensing steps">
        <ol>
          <li aria-current={step === 1 ? "step" : undefined}>
            1. Prescription
          </li>
          <li aria-current={step === 2 ? "step" : undefined}>
            2. Verify identity
          </li>
          <li aria-current={step === 3 ? "step" : undefined}>
            3. Complete
          </li>
        </ol>
      </nav>

      {error && (
        <div role="alert">
          <p>{error}</p>
          {step === 2 && (
            <button
              type="button"
              onClick={() => {
                setVerificationMethod((method) =>
                  method === "PHONE" ? "CLINIC_ID" : "PHONE",
                );
                setIdentityConfirmed(false);
                setError("");
              }}
            >
              Switch verification method
            </button>
          )}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleCreate}>
          <h2>Step 1: Prescription details</h2>

          <label htmlFor="prescriptionId">Prescription ID</label>
          <input
            id="prescriptionId"
            type="number"
            min="1"
            required
            value={prescriptionId}
            onChange={(event) => setPrescriptionId(event.target.value)}
          />

          <label htmlFor="patientId">Patient ID</label>
          <input
            id="patientId"
            type="number"
            min="1"
            required
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
          />

          <label htmlFor="verificationMethod">Identity verification method</label>
          <select
            id="verificationMethod"
            value={verificationMethod}
            onChange={(event) => setVerificationMethod(event.target.value)}
          >
            <option value="PHONE">Phone</option>
            <option value="CLINIC_ID">Clinic ID</option>
          </select>

          <label htmlFor="deliveryMethod">Fulfilment method</label>
          <select
            id="deliveryMethod"
            value={deliveryMethod}
            onChange={(event) => setDeliveryMethod(event.target.value)}
          >
            <option value="PICK_UP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
          </select>

          <h3>Medicines</h3>
          <p>Enter the medicine details from the prescription.</p>

          {items.map((item, index) => (
            <fieldset key={index}>
              <legend>Medicine {index + 1}</legend>

              <label htmlFor={`medicineName-${index}`}>Medicine name</label>
              <input
                id={`medicineName-${index}`}
                value={item.medicineName}
                onChange={(event) =>
                  updateItem(index, "medicineName", event.target.value)
                }
                placeholder="Medicine name"
              />

              <label htmlFor={`medicineId-${index}`}>Medicine ID</label>
              <input
                id={`medicineId-${index}`}
                type="number"
                min="1"
                required
                value={item.medicineId}
                onChange={(event) =>
                  updateItem(index, "medicineId", event.target.value)
                }
              />

              <label htmlFor={`prescriptionItemId-${index}`}>
                Prescription item ID (if available)
              </label>
              <input
                id={`prescriptionItemId-${index}`}
                type="number"
                min="1"
                value={item.prescriptionItemId}
                onChange={(event) =>
                  updateItem(index, "prescriptionItemId", event.target.value)
                }
              />

              <label htmlFor={`quantity-${index}`}>Quantity</label>
              <input
                id={`quantity-${index}`}
                type="number"
                min="1"
                required
                value={item.quantity}
                onChange={(event) =>
                  updateItem(index, "quantity", event.target.value)
                }
              />

              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(index)}>
                  Remove medicine
                </button>
              )}
            </fieldset>
          ))}

          <button type="button" onClick={addItem}>
            Add another medicine
          </button>

          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save and continue"}
          </button>
        </form>
      )}

      {step === 2 && dispensing && (
        <form onSubmit={handleVerify}>
          <h2>Step 2: Verify patient identity</h2>
          <p>Patient ID: {dispensing.patientId}</p>
          <p>Dispensing record: {dispensing.dispenseId}</p>

          <label htmlFor="verifyMethod">Verification method</label>
          <select
            id="verifyMethod"
            value={verificationMethod}
            onChange={(event) => {
              setVerificationMethod(event.target.value);
              setIdentityConfirmed(false);
            }}
          >
            <option value="PHONE">Phone</option>
            <option value="CLINIC_ID">Clinic ID</option>
          </select>

          <p>
            Check the patient's {verificationMethod === "PHONE" ? "registered phone details" : "Clinic ID"} against the authorised patient record.
          </p>

          <p role="note">
            Important: the current backend does not validate the actual phone
            number or Clinic ID. Staff must perform the identity check against
            the authorised record.
          </p>

          <label>
            <input
              type="checkbox"
              checked={identityConfirmed}
              onChange={(event) => setIdentityConfirmed(event.target.checked)}
            />
            I have checked the patient's identity against the authorised record.
          </label>

          <button type="submit" disabled={loading || !identityConfirmed}>
            {loading ? "Verifying..." : "Confirm identity"}
          </button>
        </form>
      )}

      {step === 3 && dispensing && (
        <section>
          <h2>Step 3: Confirm and complete</h2>
          <p>Prescription ID: {dispensing.prescriptionId}</p>
          <p>Patient ID: {dispensing.patientId}</p>
          <p>Verification: {dispensing.verificationStatus}</p>
          <p>Fulfilment: {deliveryMethod === "PICK_UP" ? "Pickup" : "Delivery"}</p>

          <label htmlFor="paymentMethod">Payment method</label>
          <input id="paymentMethod" value="Cash" readOnly />

          <p>
            Check the prescription and available stock before confirming. The
            backend may dispense only the available quantity when stock is
            insufficient.
          </p>

          <button type="button" onClick={() => setStep(2)} disabled={loading}>
            Back to identity verification
          </button>
          <button type="button" onClick={handleComplete} disabled={loading}>
            {loading ? "Completing..." : "Confirm dispensing"}
          </button>
        </section>
      )}

      {step === 4 && result && (
        <section aria-live="polite">
          <h2>Dispensing result</h2>
          <p>Record ID: {result.dispenseId}</p>
          <p>Patient ID: {result.patientId}</p>
          <p>Status: {result.status}</p>
          <p>
            {result.status === "PARTIALLY_DISPENSED"
              ? "Only the available quantity was dispensed. Follow-up is required for the remaining medicines."
              : result.status === "DISPENSED"
                ? "Dispensing completed."
                : "The backend returned the status shown above."}
          </p>
          <p>Payment method: Cash (displayed by the frontend)</p>
          <p>
            The current API response does not provide a staff ID or persist the
            payment method.
          </p>
        </section>
      )}
    </main>
  );
}
