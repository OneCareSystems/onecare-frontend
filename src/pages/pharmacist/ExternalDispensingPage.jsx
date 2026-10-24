
// import { useState } from "react";
// import {
//   completeExternalDispensing,
//   createExternalDispensing,
//   verifyExternalDispensingIdentity,
// } from "../../services/externalDispensingService";

// const initialItem = () => ({
//   medicineId: "",
//   prescriptionItemId: "",
//   medicineName: "",
//   quantity: "1",
// });

// export default function ExternalDispensingPage() {
//   const [step, setStep] = useState(1);
//   const [prescriptionId, setPrescriptionId] = useState("");
//   const [patientId, setPatientId] = useState("");
//   const [items, setItems] = useState([initialItem()]);
//   const [verificationMethod, setVerificationMethod] = useState("PHONE");
//   const [identityConfirmed, setIdentityConfirmed] = useState(false);
//   const [deliveryMethod, setDeliveryMethod] = useState("PICK_UP");
//   const [dispensing, setDispensing] = useState(null);
//   const [result, setResult] = useState(null);
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const updateItem = (index, field, value) => {
//     setItems((current) =>
//       current.map((item, itemIndex) =>
//         itemIndex === index ? { ...item, [field]: value } : item,
//       ),
//     );
//   };

//   const handleCreate = async (event) => {
//     event.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       const record = await createExternalDispensing({
//         prescriptionId: Number(prescriptionId),
//         patientId: Number(patientId),
//         verificationMethod,
//         deliveryMethod,
//         items: items.map((item) => ({
//           medicineId: Number(item.medicineId),
//           prescriptionItemId: item.prescriptionItemId
//             ? Number(item.prescriptionItemId)
//             : null,
//           medicineName: item.medicineName.trim() || null,
//           quantity: Number(item.quantity),
//         })),
//       });

//       setDispensing(record);
//       setStep(2);
//     } catch (err) {
//       setError(err.userMessage || err.message || "Unable to create dispensing record.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleVerify = async (event) => {
//     event.preventDefault();
//     setError("");

//     if (!identityConfirmed) {
//       setError("Confirm that you have checked the patient's identity before continuing.");
//       return;
//     }

//     setLoading(true);

//     try {
//       const record = await verifyExternalDispensingIdentity(
//         dispensing.dispenseId,
//         {
//           verificationMethod,
//           verified: true,
//           notes: "Identity checked by staff against the selected identifier.",
//         },
//       );

//       setDispensing(record);
//       setStep(3);
//     } catch (err) {
//       setError(
//         err.userMessage ||
//           "Identity verification failed. Please verify and try again.",
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleComplete = async () => {
//     setError("");
//     setLoading(true);

//     try {
//       const completed = await completeExternalDispensing(dispensing.dispenseId);
//       setResult(completed);
//       setDispensing(completed);
//       setStep(4);
//     } catch (err) {
//       setError(err.userMessage || err.message || "Unable to complete dispensing.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const addItem = () => {
//     setItems((current) => [...current, initialItem()]);
//   };

//   const removeItem = (index) => {
//     setItems((current) => current.filter((_, i) => i !== index));
//   };

//   return (
//     <main className="page-container">
//       <h1>External Dispensing</h1>
//       <p>Record and complete dispensing for an external prescription.</p>

//       <nav aria-label="Dispensing steps">
//         <ol>
//           <li aria-current={step === 1 ? "step" : undefined}>
//             1. Prescription
//           </li>
//           <li aria-current={step === 2 ? "step" : undefined}>
//             2. Verify identity
//           </li>
//           <li aria-current={step === 3 ? "step" : undefined}>
//             3. Complete
//           </li>
//         </ol>
//       </nav>

//       {error && (
//         <div role="alert">
//           <p>{error}</p>
//           {step === 2 && (
//             <button
//               type="button"
//               onClick={() => {
//                 setVerificationMethod((method) =>
//                   method === "PHONE" ? "CLINIC_ID" : "PHONE",
//                 );
//                 setIdentityConfirmed(false);
//                 setError("");
//               }}
//             >
//               Switch verification method
//             </button>
//           )}
//         </div>
//       )}

//       {step === 1 && (
//         <form onSubmit={handleCreate}>
//           <h2>Step 1: Prescription details</h2>

//           <label htmlFor="prescriptionId">Prescription ID</label>
//           <input
//             id="prescriptionId"
//             type="number"
//             min="1"
//             required
//             value={prescriptionId}
//             onChange={(event) => setPrescriptionId(event.target.value)}
//           />

//           <label htmlFor="patientId">Patient ID</label>
//           <input
//             id="patientId"
//             type="number"
//             min="1"
//             required
//             value={patientId}
//             onChange={(event) => setPatientId(event.target.value)}
//           />

//           <label htmlFor="verificationMethod">Identity verification method</label>
//           <select
//             id="verificationMethod"
//             value={verificationMethod}
//             onChange={(event) => setVerificationMethod(event.target.value)}
//           >
//             <option value="PHONE">Phone</option>
//             <option value="CLINIC_ID">Clinic ID</option>
//           </select>

//           <label htmlFor="deliveryMethod">Fulfilment method</label>
//           <select
//             id="deliveryMethod"
//             value={deliveryMethod}
//             onChange={(event) => setDeliveryMethod(event.target.value)}
//           >
//             <option value="PICK_UP">Pickup</option>
//             <option value="DELIVERY">Delivery</option>
//           </select>

//           <h3>Medicines</h3>
//           <p>Enter the medicine details from the prescription.</p>

//           {items.map((item, index) => (
//             <fieldset key={index}>
//               <legend>Medicine {index + 1}</legend>

//               <label htmlFor={`medicineName-${index}`}>Medicine name</label>
//               <input
//                 id={`medicineName-${index}`}
//                 value={item.medicineName}
//                 onChange={(event) =>
//                   updateItem(index, "medicineName", event.target.value)
//                 }
//                 placeholder="Medicine name"
//               />

//               <label htmlFor={`medicineId-${index}`}>Medicine ID</label>
//               <input
//                 id={`medicineId-${index}`}
//                 type="number"
//                 min="1"
//                 required
//                 value={item.medicineId}
//                 onChange={(event) =>
//                   updateItem(index, "medicineId", event.target.value)
//                 }
//               />

//               <label htmlFor={`prescriptionItemId-${index}`}>
//                 Prescription item ID (if available)
//               </label>
//               <input
//                 id={`prescriptionItemId-${index}`}
//                 type="number"
//                 min="1"
//                 value={item.prescriptionItemId}
//                 onChange={(event) =>
//                   updateItem(index, "prescriptionItemId", event.target.value)
//                 }
//               />

//               <label htmlFor={`quantity-${index}`}>Quantity</label>
//               <input
//                 id={`quantity-${index}`}
//                 type="number"
//                 min="1"
//                 required
//                 value={item.quantity}
//                 onChange={(event) =>
//                   updateItem(index, "quantity", event.target.value)
//                 }
//               />

//               {items.length > 1 && (
//                 <button type="button" onClick={() => removeItem(index)}>
//                   Remove medicine
//                 </button>
//               )}
//             </fieldset>
//           ))}

//           <button type="button" onClick={addItem}>
//             Add another medicine
//           </button>

//           <button type="submit" disabled={loading}>
//             {loading ? "Saving..." : "Save and continue"}
//           </button>
//         </form>
//       )}

//       {step === 2 && dispensing && (
//         <form onSubmit={handleVerify}>
//           <h2>Step 2: Verify patient identity</h2>
//           <p>Patient ID: {dispensing.patientId}</p>
//           <p>Dispensing record: {dispensing.dispenseId}</p>

//           <label htmlFor="verifyMethod">Verification method</label>
//           <select
//             id="verifyMethod"
//             value={verificationMethod}
//             onChange={(event) => {
//               setVerificationMethod(event.target.value);
//               setIdentityConfirmed(false);
//             }}
//           >
//             <option value="PHONE">Phone</option>
//             <option value="CLINIC_ID">Clinic ID</option>
//           </select>

//           <p>
//             Check the patient's {verificationMethod === "PHONE" ? "registered phone details" : "Clinic ID"} against the authorised patient record.
//           </p>

//           <p role="note">
//             Important: the current backend does not validate the actual phone
//             number or Clinic ID. Staff must perform the identity check against
//             the authorised record.
//           </p>

//           <label>
//             <input
//               type="checkbox"
//               checked={identityConfirmed}
//               onChange={(event) => setIdentityConfirmed(event.target.checked)}
//             />
//             I have checked the patient's identity against the authorised record.
//           </label>

//           <button type="submit" disabled={loading || !identityConfirmed}>
//             {loading ? "Verifying..." : "Confirm identity"}
//           </button>
//         </form>
//       )}

//       {step === 3 && dispensing && (
//         <section>
//           <h2>Step 3: Confirm and complete</h2>
//           <p>Prescription ID: {dispensing.prescriptionId}</p>
//           <p>Patient ID: {dispensing.patientId}</p>
//           <p>Verification: {dispensing.verificationStatus}</p>
//           <p>Fulfilment: {deliveryMethod === "PICK_UP" ? "Pickup" : "Delivery"}</p>

//           <label htmlFor="paymentMethod">Payment method</label>
//           <input id="paymentMethod" value="Cash" readOnly />

//           <p>
//             Check the prescription and available stock before confirming. The
//             backend may dispense only the available quantity when stock is
//             insufficient.
//           </p>

//           <button type="button" onClick={() => setStep(2)} disabled={loading}>
//             Back to identity verification
//           </button>
//           <button type="button" onClick={handleComplete} disabled={loading}>
//             {loading ? "Completing..." : "Confirm dispensing"}
//           </button>
//         </section>
//       )}

//       {step === 4 && result && (
//         <section aria-live="polite">
//           <h2>Dispensing result</h2>
//           <p>Record ID: {result.dispenseId}</p>
//           <p>Patient ID: {result.patientId}</p>
//           <p>Status: {result.status}</p>
//           <p>
//             {result.status === "PARTIALLY_DISPENSED"
//               ? "Only the available quantity was dispensed. Follow-up is required for the remaining medicines."
//               : result.status === "DISPENSED"
//                 ? "Dispensing completed."
//                 : "The backend returned the status shown above."}
//           </p>
//           <p>Payment method: Cash (displayed by the frontend)</p>
//           <p>
//             The current API response does not provide a staff ID or persist the
//             payment method.
//           </p>
//         </section>
//       )}
//     </main>
//   );
// }


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

const inputClass =
  "mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "block text-sm font-medium text-gray-700";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const steps = [
  { number: 1, title: "Prescription", description: "Enter details" },
  { number: 2, title: "Verify identity", description: "Confirm patient" },
  { number: 3, title: "Complete", description: "Review dispensing" },
];

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
      setError(
        err.userMessage ||
          err.message ||
          "Unable to create dispensing record.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");

    if (!identityConfirmed) {
      setError(
        "Confirm that you have checked the patient's identity before continuing.",
      );
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
      const completed = await completeExternalDispensing(
        dispensing.dispenseId,
      );
      setResult(completed);
      setDispensing(completed);
      setStep(4);
    } catch (err) {
      setError(
        err.userMessage || err.message || "Unable to complete dispensing.",
      );
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
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Pharmacy
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              External Dispensing
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Record and complete dispensing for an external prescription.
            </p>
          </div>

          <span className="inline-flex w-fit items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            {step === 4 ? "Completed" : `Step ${step} of 4`}
          </span>
        </div>
      </header>

      {/* Progress steps */}
      <nav
        aria-label="Dispensing steps"
        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3">
          {steps.map((item) => {
            const completed = step > item.number;
            const active = step === item.number;

            return (
              <li
                key={item.number}
                aria-current={active ? "step" : undefined}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  active
                    ? "border-blue-200 bg-blue-50"
                    : completed
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    active
                      ? "bg-blue-600 text-white"
                      : completed
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {completed ? "✓" : item.number}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {item.description}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p className="font-medium">{error}</p>

          {step === 2 && (
            <button
              type="button"
              className="mt-3 inline-flex rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
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

      {/* Step 1 */}
      {step === 1 && (
        <form
          onSubmit={handleCreate}
          className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8"
        >
          <section>
            <h2 className="text-lg font-bold text-gray-900">
              Step 1: Prescription details
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Enter the prescription, patient and fulfilment information.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="prescriptionId">
                Prescription ID <span className="text-red-600">*</span>
              </label>
              <input
                className={inputClass}
                id="prescriptionId"
                type="number"
                min="1"
                required
                value={prescriptionId}
                onChange={(event) => setPrescriptionId(event.target.value)}
                placeholder="Enter prescription ID"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="patientId">
                Patient ID <span className="text-red-600">*</span>
              </label>
              <input
                className={inputClass}
                id="patientId"
                type="number"
                min="1"
                required
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                placeholder="Enter patient ID"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="verificationMethod">
                Identity verification method
              </label>
              <select
                className={inputClass}
                id="verificationMethod"
                value={verificationMethod}
                onChange={(event) =>
                  setVerificationMethod(event.target.value)
                }
              >
                <option value="PHONE">Phone</option>
                <option value="CLINIC_ID">Clinic ID</option>
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="deliveryMethod">
                Fulfilment method
              </label>
              <select
                className={inputClass}
                id="deliveryMethod"
                value={deliveryMethod}
                onChange={(event) => setDeliveryMethod(event.target.value)}
              >
                <option value="PICK_UP">Pickup</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Medicines
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Enter the medicine details from the prescription.
                </p>
              </div>

              <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <fieldset
                  key={index}
                  className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
                >
                  <legend className="px-2 text-sm font-semibold text-gray-800">
                    Medicine {index + 1}
                  </legend>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label
                        className={labelClass}
                        htmlFor={`medicineName-${index}`}
                      >
                        Medicine name
                      </label>
                      <input
                        className={inputClass}
                        id={`medicineName-${index}`}
                        value={item.medicineName}
                        onChange={(event) =>
                          updateItem(index, "medicineName", event.target.value)
                        }
                        placeholder="Medicine name"
                      />
                    </div>

                    <div>
                      <label
                        className={labelClass}
                        htmlFor={`medicineId-${index}`}
                      >
                        Medicine ID <span className="text-red-600">*</span>
                      </label>
                      <input
                        className={inputClass}
                        id={`medicineId-${index}`}
                        type="number"
                        min="1"
                        required
                        value={item.medicineId}
                        onChange={(event) =>
                          updateItem(index, "medicineId", event.target.value)
                        }
                        placeholder="Medicine ID"
                      />
                    </div>

                    <div>
                      <label
                        className={labelClass}
                        htmlFor={`prescriptionItemId-${index}`}
                      >
                        Prescription item ID
                      </label>
                      <input
                        className={inputClass}
                        id={`prescriptionItemId-${index}`}
                        type="number"
                        min="1"
                        value={item.prescriptionItemId}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "prescriptionItemId",
                            event.target.value,
                          )
                        }
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <label
                        className={labelClass}
                        htmlFor={`quantity-${index}`}
                      >
                        Quantity <span className="text-red-600">*</span>
                      </label>
                      <input
                        className={inputClass}
                        id={`quantity-${index}`}
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, "quantity", event.target.value)
                        }
                      />
                    </div>
                  </div>

                  {items.length > 1 && (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        className="rounded-md px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        onClick={() => removeItem(index)}
                      >
                        Remove medicine
                      </button>
                    </div>
                  )}
                </fieldset>
              ))}
            </div>

            <button
              type="button"
              className={`${secondaryButtonClass} mt-4`}
              onClick={addItem}
            >
              <span aria-hidden="true" className="mr-2 text-lg leading-none">
                +
              </span>
              Add another medicine
            </button>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save and continue"}
            </button>
          </div>
        </form>
      )}

      {/* Step 2 */}
      {step === 2 && dispensing && (
        <form
          onSubmit={handleVerify}
          className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8"
        >
          <section>
            <h2 className="text-lg font-bold text-gray-900">
              Step 2: Verify patient identity
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Check the patient's identity against the authorised record.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Patient ID
              </p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {dispensing.patientId}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Dispensing record
              </p>
              <p className="mt-1 break-words text-lg font-bold text-gray-900">
                {dispensing.dispenseId}
              </p>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="verifyMethod">
              Verification method
            </label>
            <select
              className={inputClass}
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
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm leading-6 text-blue-900">
              Check the patient's{" "}
              {verificationMethod === "PHONE"
                ? "registered phone details"
                : "Clinic ID"}{" "}
              against the authorised patient record.
            </p>
          </div>

          <div
            role="note"
            className="rounded-lg border border-amber-200 bg-amber-50 p-4"
          >
            <p className="text-sm font-semibold text-amber-900">
              Important
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              The current backend does not validate the actual phone number or
              Clinic ID. Staff must perform the identity check against the
              authorised record.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input
              className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
              type="checkbox"
              checked={identityConfirmed}
              onChange={(event) =>
                setIdentityConfirmed(event.target.checked)
              }
            />
            <span className="text-sm leading-6 text-gray-700">
              I have checked the patient's identity against the authorised
              record.
            </span>
          </label>

          <div className="flex justify-end border-t border-gray-200 pt-5">
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={loading || !identityConfirmed}
            >
              {loading ? "Verifying..." : "Confirm identity"}
            </button>
          </div>
        </form>
      )}

      {/* Step 3 */}
      {step === 3 && dispensing && (
        <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Step 3: Confirm and complete
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Review the dispensing details before confirming.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Prescription ID
              </p>
              <p className="mt-1 font-semibold text-gray-900">
                {dispensing.prescriptionId}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Patient ID
              </p>
              <p className="mt-1 font-semibold text-gray-900">
                {dispensing.patientId}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Verification status
              </p>
              <p className="mt-1 font-semibold text-gray-900">
                {dispensing.verificationStatus}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Fulfilment method
              </p>
              <p className="mt-1 font-semibold text-gray-900">
                {deliveryMethod === "PICK_UP" ? "Pickup" : "Delivery"}
              </p>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="paymentMethod">
              Payment method
            </label>
            <input
              className={inputClass}
              id="paymentMethod"
              value="Cash"
              readOnly
            />
            <p className="mt-1.5 text-xs leading-5 text-gray-500">
              Cash is displayed by the frontend; the current API does not
              persist this payment method.
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm leading-6 text-amber-900">
              Check the prescription and available stock before confirming.
              The backend may dispense only the available quantity when stock
              is insufficient.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-between">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => setStep(2)}
              disabled={loading}
            >
              Back to identity verification
            </button>
            <button
              type="button"
              className={primaryButtonClass}
              onClick={handleComplete}
              disabled={loading}
            >
              {loading ? "Completing..." : "Confirm dispensing"}
            </button>
          </div>
        </section>
      )}

      {/* Step 4 */}
      {step === 4 && result && (
        <section
          aria-live="polite"
          className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8"
        >
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-700">
              ✓
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Dispensing result
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                The dispensing request has been processed by the backend.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Record ID
              </p>
              <p className="mt-1 break-words font-semibold text-gray-900">
                {result.dispenseId}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Patient ID
              </p>
              <p className="mt-1 font-semibold text-gray-900">
                {result.patientId}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Status
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  result.status === "DISPENSED"
                    ? "bg-green-100 text-green-800"
                    : result.status === "PARTIALLY_DISPENSED"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {result.status}
              </span>
            </div>
          </div>

          <div
            className={`rounded-lg border p-4 ${
              result.status === "DISPENSED"
                ? "border-green-200 bg-green-50 text-green-900"
                : result.status === "PARTIALLY_DISPENSED"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-gray-200 bg-gray-50 text-gray-800"
            }`}
          >
            <p className="text-sm leading-6">
              {result.status === "PARTIALLY_DISPENSED"
                ? "Only the available quantity was dispensed. Follow-up is required for the remaining medicines."
                : result.status === "DISPENSED"
                  ? "Dispensing completed."
                  : "The backend returned the status shown above."}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-700">
              Payment method: Cash (displayed by the frontend)
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              The current API response does not provide a staff ID or persist
              the payment method.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}