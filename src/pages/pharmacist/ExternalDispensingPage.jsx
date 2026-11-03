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

// const inputClass =
//   "mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

// const labelClass = "block text-sm font-medium text-gray-700";

// const primaryButtonClass =
//   "inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// const secondaryButtonClass =
//   "inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// const steps = [
//   { number: 1, title: "Prescription", description: "Enter details" },
//   { number: 2, title: "Verify identity", description: "Confirm patient" },
//   { number: 3, title: "Complete", description: "Review dispensing" },
// ];

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
//       setError(
//         err.userMessage || err.message || "Unable to create dispensing record.",
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleVerify = async (event) => {
//     event.preventDefault();
//     setError("");

//     if (!identityConfirmed) {
//       setError(
//         "Confirm that you have checked the patient's identity before continuing.",
//       );
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
//       setError(
//         err.userMessage || err.message || "Unable to complete dispensing.",
//       );
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
//     <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
//       {/* Page header */}
//       <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
//         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//           <div>
//             <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
//               Pharmacy
//             </p>
//             <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
//               External Dispensing
//             </h1>
//             <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
//               Record and complete dispensing for an external prescription.
//             </p>
//           </div>

//           <span className="inline-flex w-fit items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
//             {step === 4 ? "Completed" : `Step ${step} of 4`}
//           </span>
//         </div>
//       </header>

//       {/* Progress steps */}
//       <nav
//         aria-label="Dispensing steps"
//         className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
//       >
//         <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3">
//           {steps.map((item) => {
//             const completed = step > item.number;
//             const active = step === item.number;

//             return (
//               <li
//                 key={item.number}
//                 aria-current={active ? "step" : undefined}
//                 className={`flex items-center gap-3 rounded-lg border p-3 ${
//                   active
//                     ? "border-blue-200 bg-blue-50"
//                     : completed
//                       ? "border-green-200 bg-green-50"
//                       : "border-gray-200 bg-gray-50"
//                 }`}
//               >
//                 <span
//                   className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
//                     active
//                       ? "bg-blue-600 text-white"
//                       : completed
//                         ? "bg-green-600 text-white"
//                         : "bg-gray-200 text-gray-600"
//                   }`}
//                 >
//                   {completed ? "✓" : item.number}
//                 </span>
//                 <span className="min-w-0">
//                   <span className="block text-sm font-semibold text-gray-900">
//                     {item.title}
//                   </span>
//                   <span className="mt-0.5 block text-xs text-gray-500">
//                     {item.description}
//                   </span>
//                 </span>
//               </li>
//             );
//           })}
//         </ol>
//       </nav>

//       {/* Error message */}
//       {error && (
//         <div
//           role="alert"
//           className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
//         >
//           <p className="font-medium">{error}</p>

//           {step === 2 && (
//             <button
//               type="button"
//               className="mt-3 inline-flex rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
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

//       {/* Step 1 */}
//       {step === 1 && (
//         <form
//           onSubmit={handleCreate}
//           className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8"
//         >
//           <section>
//             <h2 className="text-lg font-bold text-gray-900">
//               Step 1: Prescription details
//             </h2>
//             <p className="mt-1 text-sm text-gray-600">
//               Enter the prescription, patient and fulfilment information.
//             </p>
//           </section>

//           <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
//             <div>
//               <label className={labelClass} htmlFor="prescriptionId">
//                 Prescription ID <span className="text-red-600">*</span>
//               </label>
//               <input
//                 className={inputClass}
//                 id="prescriptionId"
//                 type="number"
//                 min="1"
//                 required
//                 value={prescriptionId}
//                 onChange={(event) => setPrescriptionId(event.target.value)}
//                 placeholder="Enter prescription ID"
//               />
//             </div>

//             <div>
//               <label className={labelClass} htmlFor="patientId">
//                 Patient ID <span className="text-red-600">*</span>
//               </label>
//               <input
//                 className={inputClass}
//                 id="patientId"
//                 type="number"
//                 min="1"
//                 required
//                 value={patientId}
//                 onChange={(event) => setPatientId(event.target.value)}
//                 placeholder="Enter patient ID"
//               />
//             </div>

//             <div>
//               <label className={labelClass} htmlFor="verificationMethod">
//                 Identity verification method
//               </label>
//               <select
//                 className={inputClass}
//                 id="verificationMethod"
//                 value={verificationMethod}
//                 onChange={(event) => setVerificationMethod(event.target.value)}
//               >
//                 <option value="PHONE">Phone</option>
//                 <option value="CLINIC_ID">Clinic ID</option>
//               </select>
//             </div>

//             <div>
//               <label className={labelClass} htmlFor="deliveryMethod">
//                 Fulfilment method
//               </label>
//               <select
//                 className={inputClass}
//                 id="deliveryMethod"
//                 value={deliveryMethod}
//                 onChange={(event) => setDeliveryMethod(event.target.value)}
//               >
//                 <option value="PICK_UP">Pickup</option>
//                 <option value="DELIVERY">Delivery</option>
//               </select>
//             </div>
//           </div>

//           <div className="border-t border-gray-200 pt-6">
//             <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//               <div>
//                 <h3 className="text-base font-bold text-gray-900">Medicines</h3>
//                 <p className="mt-1 text-sm text-gray-600">
//                   Enter the medicine details from the prescription.
//                 </p>
//               </div>

//               <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
//                 {items.length} {items.length === 1 ? "item" : "items"}
//               </span>
//             </div>

//             <div className="space-y-4">
//               {items.map((item, index) => (
//                 <fieldset
//                   key={index}
//                   className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
//                 >
//                   <legend className="px-2 text-sm font-semibold text-gray-800">
//                     Medicine {index + 1}
//                   </legend>

//                   <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
//                     <div>
//                       <label
//                         className={labelClass}
//                         htmlFor={`medicineName-${index}`}
//                       >
//                         Medicine name
//                       </label>
//                       <input
//                         className={inputClass}
//                         id={`medicineName-${index}`}
//                         value={item.medicineName}
//                         onChange={(event) =>
//                           updateItem(index, "medicineName", event.target.value)
//                         }
//                         placeholder="Medicine name"
//                       />
//                     </div>

//                     <div>
//                       <label
//                         className={labelClass}
//                         htmlFor={`medicineId-${index}`}
//                       >
//                         Medicine ID <span className="text-red-600">*</span>
//                       </label>
//                       <input
//                         className={inputClass}
//                         id={`medicineId-${index}`}
//                         type="number"
//                         min="1"
//                         required
//                         value={item.medicineId}
//                         onChange={(event) =>
//                           updateItem(index, "medicineId", event.target.value)
//                         }
//                         placeholder="Medicine ID"
//                       />
//                     </div>

//                     <div>
//                       <label
//                         className={labelClass}
//                         htmlFor={`prescriptionItemId-${index}`}
//                       >
//                         Prescription item ID
//                       </label>
//                       <input
//                         className={inputClass}
//                         id={`prescriptionItemId-${index}`}
//                         type="number"
//                         min="1"
//                         value={item.prescriptionItemId}
//                         onChange={(event) =>
//                           updateItem(
//                             index,
//                             "prescriptionItemId",
//                             event.target.value,
//                           )
//                         }
//                         placeholder="Optional"
//                       />
//                     </div>

//                     <div>
//                       <label
//                         className={labelClass}
//                         htmlFor={`quantity-${index}`}
//                       >
//                         Quantity <span className="text-red-600">*</span>
//                       </label>
//                       <input
//                         className={inputClass}
//                         id={`quantity-${index}`}
//                         type="number"
//                         min="1"
//                         required
//                         value={item.quantity}
//                         onChange={(event) =>
//                           updateItem(index, "quantity", event.target.value)
//                         }
//                       />
//                     </div>
//                   </div>

//                   {items.length > 1 && (
//                     <div className="mt-4 flex justify-end">
//                       <button
//                         type="button"
//                         className="rounded-md px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
//                         onClick={() => removeItem(index)}
//                       >
//                         Remove medicine
//                       </button>
//                     </div>
//                   )}
//                 </fieldset>
//               ))}
//             </div>

//             <button
//               type="button"
//               className={`${secondaryButtonClass} mt-4`}
//               onClick={addItem}
//             >
//               <span aria-hidden="true" className="mr-2 text-lg leading-none">
//                 +
//               </span>
//               Add another medicine
//             </button>
//           </div>

//           <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
//             <button
//               type="submit"
//               className={primaryButtonClass}
//               disabled={loading}
//             >
//               {loading ? "Saving..." : "Save and continue"}
//             </button>
//           </div>
//         </form>
//       )}

//       {/* Step 2 */}
//       {step === 2 && dispensing && (
//         <form
//           onSubmit={handleVerify}
//           className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8"
//         >
//           <section>
//             <h2 className="text-lg font-bold text-gray-900">
//               Step 2: Verify patient identity
//             </h2>
//             <p className="mt-1 text-sm text-gray-600">
//               Check the patient's identity against the authorised record.
//             </p>
//           </section>

//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//             <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
//               <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
//                 Patient ID
//               </p>
//               <p className="mt-1 text-lg font-bold text-gray-900">
//                 {dispensing.patientId}
//               </p>
//             </div>
//             <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
//               <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
//                 Dispensing record
//               </p>
//               <p className="mt-1 break-words text-lg font-bold text-gray-900">
//                 {dispensing.dispenseId}
//               </p>
//             </div>
//           </div>

//           <div>
//             <label className={labelClass} htmlFor="verifyMethod">
//               Verification method
//             </label>
//             <select
//               className={inputClass}
//               id="verifyMethod"
//               value={verificationMethod}
//               onChange={(event) => {
//                 setVerificationMethod(event.target.value);
//                 setIdentityConfirmed(false);
//               }}
//             >
//               <option value="PHONE">Phone</option>
//               <option value="CLINIC_ID">Clinic ID</option>
//             </select>
//           </div>

//           <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
//             <p className="text-sm leading-6 text-blue-900">
//               Check the patient's{" "}
//               {verificationMethod === "PHONE"
//                 ? "registered phone details"
//                 : "Clinic ID"}{" "}
//               against the authorised patient record.
//             </p>
//           </div>

//           <div
//             role="note"
//             className="rounded-lg border border-amber-200 bg-amber-50 p-4"
//           >
//             <p className="text-sm font-semibold text-amber-900">Important</p>
//             <p className="mt-1 text-sm leading-6 text-amber-800">
//               The current backend does not validate the actual phone number or
//               Clinic ID. Staff must perform the identity check against the
//               authorised record.
//             </p>
//           </div>

//           <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4">
//             <input
//               className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
//               type="checkbox"
//               checked={identityConfirmed}
//               onChange={(event) => setIdentityConfirmed(event.target.checked)}
//             />
//             <span className="text-sm leading-6 text-gray-700">
//               I have checked the patient's identity against the authorised
//               record.
//             </span>
//           </label>

//           <div className="flex justify-end border-t border-gray-200 pt-5">
//             <button
//               type="submit"
//               className={primaryButtonClass}
//               disabled={loading || !identityConfirmed}
//             >
//               {loading ? "Verifying..." : "Confirm identity"}
//             </button>
//           </div>
//         </form>
//       )}

//       {/* Step 3 */}
//       {step === 3 && dispensing && (
//         <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
//           <div>
//             <h2 className="text-lg font-bold text-gray-900">
//               Step 3: Confirm and complete
//             </h2>
//             <p className="mt-1 text-sm text-gray-600">
//               Review the dispensing details before confirming.
//             </p>
//           </div>

//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//             <div className="rounded-lg border border-gray-200 p-4">
//               <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
//                 Prescription ID
//               </p>
//               <p className="mt-1 font-semibold text-gray-900">
//                 {dispensing.prescriptionId}
//               </p>
//             </div>
//             <div className="rounded-lg border border-gray-200 p-4">
//               <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
//                 Patient ID
//               </p>
//               <p className="mt-1 font-semibold text-gray-900">
//                 {dispensing.patientId}
//               </p>
//             </div>
//             <div className="rounded-lg border border-gray-200 p-4">
//               <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
//                 Verification status
//               </p>
//               <p className="mt-1 font-semibold text-gray-900">
//                 {dispensing.verificationStatus}
//               </p>
//             </div>
//             <div className="rounded-lg border border-gray-200 p-4">
//               <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
//                 Fulfilment method
//               </p>
//               <p className="mt-1 font-semibold text-gray-900">
//                 {deliveryMethod === "PICK_UP" ? "Pickup" : "Delivery"}
//               </p>
//             </div>
//           </div>

//           <div>
//             <label className={labelClass} htmlFor="paymentMethod">
//               Payment method
//             </label>
//             <input
//               className={inputClass}
//               id="paymentMethod"
//               value="Cash"
//               readOnly
//             />
//             <p className="mt-1.5 text-xs leading-5 text-gray-500">
//               Cash is displayed by the frontend; the current API does not
//               persist this payment method.
//             </p>
//           </div>

//           <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
//             <p className="text-sm leading-6 text-amber-900">
//               Check the prescription and available stock before confirming. The
//               backend may dispense only the available quantity when stock is
//               insufficient.
//             </p>
//           </div>

//           <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-between">
//             <button
//               type="button"
//               className={secondaryButtonClass}
//               onClick={() => setStep(2)}
//               disabled={loading}
//             >
//               Back to identity verification
//             </button>
//             <button
//               type="button"
//               className={primaryButtonClass}
//               onClick={handleComplete}
//               disabled={loading}
//             >
//               {loading ? "Completing..." : "Confirm dispensing"}
//             </button>
//           </div>
//         </section>
//       )}

//       {/* Step 4 */}
//       {step === 4 && result && (
//         <section
//           aria-live="polite"
//           className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8"
//         >
//           <div className="flex items-start gap-4">
//             <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-700">
//               ✓
//             </span>
//             <div>
//               <h2 className="text-xl font-bold text-gray-900">
//                 Dispensing result
//               </h2>
//               <p className="mt-1 text-sm text-gray-600">
//                 The dispensing request has been processed by the backend.
//               </p>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
//             <div className="rounded-lg border border-gray-200 p-4">
//               <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
//                 Record ID
//               </p>
//               <p className="mt-1 break-words font-semibold text-gray-900">
//                 {result.dispenseId}
//               </p>
//             </div>
//             <div className="rounded-lg border border-gray-200 p-4">
//               <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
//                 Patient ID
//               </p>
//               <p className="mt-1 font-semibold text-gray-900">
//                 {result.patientId}
//               </p>
//             </div>
//             <div className="rounded-lg border border-gray-200 p-4">
//               <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
//                 Status
//               </p>
//               <span
//                 className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
//                   result.status === "DISPENSED"
//                     ? "bg-green-100 text-green-800"
//                     : result.status === "PARTIALLY_DISPENSED"
//                       ? "bg-amber-100 text-amber-800"
//                       : "bg-gray-100 text-gray-700"
//                 }`}
//               >
//                 {result.status}
//               </span>
//             </div>
//           </div>

//           <div
//             className={`rounded-lg border p-4 ${
//               result.status === "DISPENSED"
//                 ? "border-green-200 bg-green-50 text-green-900"
//                 : result.status === "PARTIALLY_DISPENSED"
//                   ? "border-amber-200 bg-amber-50 text-amber-900"
//                   : "border-gray-200 bg-gray-50 text-gray-800"
//             }`}
//           >
//             <p className="text-sm leading-6">
//               {result.status === "PARTIALLY_DISPENSED"
//                 ? "Only the available quantity was dispensed. Follow-up is required for the remaining medicines."
//                 : result.status === "DISPENSED"
//                   ? "Dispensing completed."
//                   : "The backend returned the status shown above."}
//             </p>
//           </div>

//           <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
//             <p className="text-sm text-gray-700">
//               Payment method: Cash (displayed by the frontend)
//             </p>
//             <p className="mt-1 text-sm leading-6 text-gray-500">
//               The current API response does not provide a staff ID or persist
//               the payment method.
//             </p>
//           </div>
//         </section>
//       )}
//     </main>
//   );
// }

import { useEffect, useRef, useState, useId } from "react";
import {
  completeExternalDispensing,
  createExternalDispensing,
  verifyExternalDispensingIdentity,
} from "../../services/externalDispensingService";

/* ---------- Design tokens (unchanged API, tidy classes) ---------- */

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-xs outline-none transition placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-neutral-50 disabled:text-neutral-500";

const labelClass = "block text-sm font-medium text-neutral-700";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const dangerTextButtonClass =
  "rounded-md px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50";

const initialItem = () => ({
  medicineId: "",
  prescriptionItemId: "",
  medicineName: "",
  quantity: "1",
});

const STEPS = [
  { number: 1, title: "Prescription", description: "Enter details" },
  { number: 2, title: "Verify identity", description: "Confirm patient" },
  { number: 3, title: "Complete", description: "Review dispensing" },
];

/* ---------- Small UI primitives ---------- */

function Spinner({ className = "" }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="4"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ className = "" }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4l2.3 2.3 6.3-6.3a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-medium text-red-600">
      {children}
    </p>
  );
}

function StatusBadge({ status }) {
  const map = {
    DISPENSED: "bg-green-100 text-green-800",
    PARTIALLY_DISPENSED: "bg-amber-100 text-amber-800",
  };
  const className = map[status] || "bg-neutral-100 text-neutral-700";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {status || "—"}
    </span>
  );
}

/* ---------- Main page ---------- */

export default function ExternalDispensingPage() {
  const [step, setStep] = useState(1);
  const [prescriptionId, setPrescriptionId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [items, setItems] = useState([initialItem()]);
  const [verificationMethod, setVerificationMethod] = useState("PHONE");
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState("PICK_UP");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [dispensing, setDispensing] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [touched, setTouched] = useState({});

  const headingRef = useRef(null);
  const summaryId = useId();

  // Move focus to the step heading whenever the step changes (accessibility).
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  /* ---------- Derived validation ---------- */

  const createErrors = {
    prescriptionId: !prescriptionId ? "Prescription ID is required." : "",
    patientId: !patientId ? "Patient ID is required." : "",
    items: items.some((item) => !item.medicineId)
      ? "Every medicine needs a Medicine ID."
      : "",
  };

  const isStep1Valid =
    !createErrors.prescriptionId &&
    !createErrors.patientId &&
    !createErrors.items;

  const showError = (field) => touched[field] && createErrors[field];

  /* ---------- Handlers ---------- */

  const updateItem = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addItem = () => {
    setItems((current) => [...current, initialItem()]);
  };

  const removeItem = (index) => {
    setItems((current) => current.filter((_, i) => i !== index));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setTouched({ prescriptionId: true, patientId: true, items: true });

    if (!isStep1Valid) {
      setError("Please fix the highlighted fields before continuing.");
      return;
    }

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
        err.userMessage || err.message || "Unable to create dispensing record.",
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

  const handleCompleteConfirmed = async () => {
    setConfirmOpen(false);
    setError("");
    setLoading(true);

    try {
      const completed = await completeExternalDispensing(dispensing.dispenseId);
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

  const goBackToStep = (target) => {
    // Only allow moving back to already-completed steps.
    if (target < step) {
      setError("");
      setStep(target);
    }
  };

  /* ---------- Render ---------- */

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <header className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Pharmacy
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              External Dispensing
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Record and complete dispensing for an external prescription.
            </p>
          </div>

          <span className="inline-flex w-fit items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            {step === 4 ? "Completed" : `Step ${step} of ${STEPS.length}`}
          </span>
        </div>
      </header>

      {/* Progress steps */}
      <nav
        aria-label="Dispensing progress"
        className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-6"
      >
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STEPS.map((item) => {
            const completed = step > item.number;
            const active = step === item.number;
            const clickable = item.number < step;

            return (
              <li key={item.number}>
                <button
                  type="button"
                  aria-current={active ? "step" : undefined}
                  aria-disabled={!clickable || undefined}
                  onClick={() => clickable && goBackToStep(item.number)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                    active
                      ? "border-blue-200 bg-blue-50"
                      : completed
                        ? "border-green-200 bg-green-50 hover:border-green-300"
                        : "border-neutral-200 bg-neutral-50"
                  } ${clickable ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      active
                        ? "bg-blue-600 text-white"
                        : completed
                          ? "bg-green-600 text-white"
                          : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {completed ? <CheckIcon /> : item.number}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-neutral-900">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-500">
                      {item.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <svg
            className="mt-0.5 h-5 w-5 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM9 5a1 1 0 0 1 2 0v4a1 1 0 0 1-2 0V5Zm1 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="font-medium">{error}</p>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
              onClick={() => setError("")}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ---------- Step 1 ---------- */}
      {step === 1 && (
        <form
          onSubmit={handleCreate}
          className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs sm:p-6 lg:p-8"
          noValidate
        >
          <section>
            <h2 className="text-lg font-bold text-neutral-900">
              Prescription details
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
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
                inputMode="numeric"
                value={prescriptionId}
                onChange={(e) => setPrescriptionId(e.target.value)}
                onBlur={() =>
                  setTouched((t) => ({ ...t, prescriptionId: true }))
                }
                placeholder="Enter prescription ID"
                aria-invalid={!!showError("prescriptionId")}
              />
              <FieldError id="prescriptionId-error">
                {showError("prescriptionId")}
              </FieldError>
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
                inputMode="numeric"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, patientId: true }))}
                placeholder="Enter patient ID"
                aria-invalid={!!showError("patientId")}
              />
              <FieldError id="patientId-error">
                {showError("patientId")}
              </FieldError>
            </div>

            <div>
              <label className={labelClass} htmlFor="verificationMethod">
                Identity verification method
              </label>
              <select
                className={inputClass}
                id="verificationMethod"
                value={verificationMethod}
                onChange={(e) => setVerificationMethod(e.target.value)}
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
                onChange={(e) => setDeliveryMethod(e.target.value)}
              >
                <option value="PICK_UP">Pickup</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>
          </div>

          {/* Medicines */}
          <div className="border-t border-neutral-200 pt-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Medicines
                </h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Enter the medicine details from the prescription.
                </p>
              </div>
              <span className="w-fit rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center">
                <p className="text-sm text-neutral-600">
                  No medicines added yet.
                </p>
                <button
                  type="button"
                  className={`${secondaryButtonClass} mt-4`}
                  onClick={addItem}
                >
                  Add medicine
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <fieldset
                    key={index}
                    className="min-w-0 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5"
                  >
                    <legend className="px-2 text-sm font-semibold text-neutral-800">
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
                          onChange={(e) =>
                            updateItem(index, "medicineName", e.target.value)
                          }
                          placeholder="e.g. Amoxicillin 500mg"
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
                          inputMode="numeric"
                          value={item.medicineId}
                          onChange={(e) =>
                            updateItem(index, "medicineId", e.target.value)
                          }
                          onBlur={() =>
                            setTouched((t) => ({ ...t, items: true }))
                          }
                          placeholder="Medicine ID"
                        />
                      </div>

                      <div>
                        <label
                          className={labelClass}
                          htmlFor={`prescriptionItemId-${index}`}
                        >
                          Prescription item ID{" "}
                          <span className="font-normal text-neutral-500">
                            (optional)
                          </span>
                        </label>
                        <input
                          className={inputClass}
                          id={`prescriptionItemId-${index}`}
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={item.prescriptionItemId}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "prescriptionItemId",
                              e.target.value,
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
                          inputMode="numeric"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, "quantity", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    {items.length > 1 && (
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          className={dangerTextButtonClass}
                          onClick={() => removeItem(index)}
                        >
                          Remove medicine
                        </button>
                      </div>
                    )}
                  </fieldset>
                ))}
              </div>
            )}

            {showError("items") && (
              <p className="mt-3 text-xs font-medium text-red-600">
                {createErrors.items}
              </p>
            )}

            <button
              type="button"
              className={`${secondaryButtonClass} mt-4`}
              onClick={addItem}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                +
              </span>
              Add another medicine
            </button>
          </div>

          <div className="flex justify-end border-t border-neutral-200 pt-5">
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={loading}
            >
              {loading && <Spinner />}
              {loading ? "Saving..." : "Save and continue"}
            </button>
          </div>
        </form>
      )}

      {/* ---------- Step 2 ---------- */}
      {step === 2 && dispensing && (
        <form
          onSubmit={handleVerify}
          className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs sm:p-6 lg:p-8"
        >
          <section>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-bold text-neutral-900 outline-none"
            >
              Verify patient identity
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Check the patient's identity against the authorised record.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Patient ID
              </p>
              <p className="mt-1 text-lg font-bold text-neutral-900">
                {dispensing.patientId}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Dispensing record
              </p>
              <p className="mt-1 break-words text-lg font-bold text-neutral-900">
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
              onChange={(e) => {
                setVerificationMethod(e.target.value);
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
            <p className="text-sm font-semibold text-amber-900">Important</p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              The current backend does not validate the actual phone number or
              Clinic ID. Staff must perform the identity check against the
              authorised record.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-300">
            <input
              className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
              type="checkbox"
              checked={identityConfirmed}
              onChange={(e) => setIdentityConfirmed(e.target.checked)}
            />
            <span className="text-sm leading-6 text-neutral-700">
              I have checked the patient's identity against the authorised
              record.
            </span>
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:justify-between">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => goBackToStep(1)}
              disabled={loading}
            >
              ← Back
            </button>
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={loading || !identityConfirmed}
            >
              {loading && <Spinner />}
              {loading ? "Verifying..." : "Confirm identity"}
            </button>
          </div>
        </form>
      )}

      {/* ---------- Step 3 ---------- */}
      {step === 3 && dispensing && (
        <section className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs sm:p-6 lg:p-8">
          <div>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-bold text-neutral-900 outline-none"
            >
              Confirm and complete
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Review the dispensing details before confirming.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Prescription ID
              </p>
              <p className="mt-1 font-semibold text-neutral-900">
                {dispensing.prescriptionId}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Patient ID
              </p>
              <p className="mt-1 font-semibold text-neutral-900">
                {dispensing.patientId}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Verification status
              </p>
              <p className="mt-1 font-semibold text-neutral-900">
                {dispensing.verificationStatus}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Fulfilment method
              </p>
              <p className="mt-1 font-semibold text-neutral-900">
                {deliveryMethod === "PICK_UP" ? "Pickup" : "Delivery"}
              </p>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="paymentMethod">
              Payment method
            </label>
            <select
              className={inputClass}
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
            </select>
            <p className="mt-1.5 text-xs leading-5 text-neutral-500">
              The current API does not persist the payment method; this is
              captured for staff reference only.
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm leading-6 text-amber-900">
              Check the prescription and available stock before confirming. The
              backend may dispense only the available quantity when stock is
              insufficient.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:justify-between">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => goBackToStep(2)}
              disabled={loading}
            >
              ← Back
            </button>
            <button
              type="button"
              className={primaryButtonClass}
              onClick={() => setConfirmOpen(true)}
              disabled={loading}
            >
              {loading && <Spinner />}
              {loading ? "Completing..." : "Confirm dispensing"}
            </button>
          </div>
        </section>
      )}

      {/* ---------- Step 4 ---------- */}
      {step === 4 && result && (
        <section
          aria-live="polite"
          aria-labelledby={summaryId}
          className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs sm:p-6 lg:p-8"
        >
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckIcon className="h-6 w-6" />
            </span>
            <div>
              <h2
                id={summaryId}
                ref={headingRef}
                tabIndex={-1}
                className="text-xl font-bold text-neutral-900 outline-none"
              >
                Dispensing result
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                The dispensing request has been processed by the backend.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Record ID
              </p>
              <p className="mt-1 break-words font-semibold text-neutral-900">
                {result.dispenseId}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Patient ID
              </p>
              <p className="mt-1 font-semibold text-neutral-900">
                {result.patientId}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Status
              </p>
              <div className="mt-2">
                <StatusBadge status={result.status} />
              </div>
            </div>
          </div>

          <div
            className={`rounded-lg border p-4 ${
              result.status === "DISPENSED"
                ? "border-green-200 bg-green-50 text-green-900"
                : result.status === "PARTIALLY_DISPENSED"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-neutral-200 bg-neutral-50 text-neutral-800"
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

          <div className="flex justify-end border-t border-neutral-200 pt-5">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                setStep(1);
                setDispensing(null);
                setResult(null);
                setItems([initialItem()]);
                setPrescriptionId("");
                setPatientId("");
                setIdentityConfirmed(false);
                setPaymentMethod("CASH");
                setError("");
                setTouched({});
              }}
            >
              Start new dispensing
            </button>
          </div>
        </section>
      )}

      {/* Confirmation dialog */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3
              id="confirm-title"
              className="text-lg font-bold text-neutral-900"
            >
              Confirm dispensing
            </h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              This action will finalize the dispensing record and deduct stock.
              It cannot be undone from this screen.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                onClick={handleCompleteConfirmed}
              >
                Yes, confirm dispensing
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}