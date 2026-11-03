// import { useEffect, useState } from "react";
// import EmptyState from "../../components/EmptyState";
// import ErrorMessage from "../../components/ErrorMessage";
// import LoadingSpinner from "../../components/LoadingSpinner";
// import Button from "../../components/Button";
// import StatusBadge from "../../components/StatusBadge";
// import {
//   getPrescriptionsByStatus,
//   getDispensePreview,
//   dispensePrescription,
// } from "../../services/prescriptionService";

// const getMedicineName = (item, fallbackItem) =>
//   fallbackItem?.medicineName ??
//   fallbackItem?.name ??
//   (item?.medicineId != null
//     ? `Medicine #${item.medicineId}`
//     : "Medicine name unavailable");

// const isStockShortfall = (error) =>
//   error?.status === 409 &&
//   typeof error?.message === "string" &&
//   error.message.toLowerCase().includes("insufficient stock") &&
//   Array.isArray(error?.data?.items);

// const DispensingQueuePage = () => {
//   const [prescriptions, setPrescriptions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(false);
//   const [queueAttempt, setQueueAttempt] = useState(0);

//   const [selectedId, setSelectedId] = useState(null);
//   const [verified, setVerified] = useState(false);
//   const [dispenseConfirmed, setDispenseConfirmed] = useState(false);
//   const [partialConfirmed, setPartialConfirmed] = useState(false);

//   const [preview, setPreview] = useState(null);
//   const [previewLoading, setPreviewLoading] = useState(false);
//   const [previewError, setPreviewError] = useState("");
//   const [previewAttempt, setPreviewAttempt] = useState(0);

//   const [dispensing, setDispensing] = useState(false);
//   const [notice, setNotice] = useState("");

//   // Load issued and partially dispensed prescriptions.
//   useEffect(() => {
//     const controller = new AbortController();
//     const { signal } = controller;

//     const loadPrescriptions = async () => {
//       try {
//         const [issued, partiallyDispensed] = await Promise.all([
//           getPrescriptionsByStatus("ISSUED", { signal }),
//           getPrescriptionsByStatus("PARTIALLY_DISPENSED", { signal }),
//         ]);

//         if (signal.aborted) return;

//         const merged = new Map();

//         [...issued, ...partiallyDispensed].forEach((prescription) => {
//           merged.set(String(prescription.prescriptionId), prescription);
//         });

//         const data = [...merged.values()].sort((a, b) =>
//           String(b.prescriptionId).localeCompare(
//             String(a.prescriptionId),
//             undefined,
//             { numeric: true },
//           ),
//         );

//         setPrescriptions(data);

//         setSelectedId((currentId) =>
//           data.some(
//             (prescription) =>
//               String(prescription.prescriptionId) === String(currentId),
//           )
//             ? currentId
//             : null,
//         );
//       } catch {
//         if (!signal.aborted) {
//           setError(true);
//         }
//       } finally {
//         if (!signal.aborted) {
//           setLoading(false);
//         }
//       }
//     };

//     void loadPrescriptions();

//     return () => controller.abort();
//   }, [queueAttempt]);

//   // Load the current stock preview for the selected prescription.
//   useEffect(() => {
//     if (selectedId == null) return undefined;

//     const controller = new AbortController();
//     const { signal } = controller;

//     const loadPreview = async () => {
//       try {
//         const data = await getDispensePreview(selectedId, { signal });

//         if (!signal.aborted) {
//           setPreview(data);
//         }
//       } catch (requestError) {
//         if (!signal.aborted) {
//           setPreviewError(
//             requestError?.userMessage ??
//               requestError?.message ??
//               "Unable to retrieve the stock preview.",
//           );
//         }
//       } finally {
//         if (!signal.aborted) {
//           setPreviewLoading(false);
//         }
//       }
//     };

//     void loadPreview();

//     return () => controller.abort();
//   }, [selectedId, previewAttempt]);

//   const selectedPrescription = prescriptions.find(
//     (prescription) =>
//       String(prescription.prescriptionId) === String(selectedId),
//   );

//   const prescriptionItems = selectedPrescription?.items ?? [];
//   const previewItems = preview?.items ?? [];

//   const hasPartialShortfall = previewItems.some(
//     (item) => Number(item.shortfallQuantity) > 0,
//   );

//   const hasDispensableItems = previewItems.some((item) => {
//     const remaining = Number(item.remainingQuantity);
//     const available = Number(item.availableStock);
//     const shortfall = Number(item.shortfallQuantity);

//     const canPartiallyDispense =
//       item.reason === "Insufficient stock" && available > 0 && shortfall > 0;

//     const canFullyDispense = item.dispensable !== false && !item.reason;

//     return (
//       item.medicineId != null &&
//       remaining > 0 &&
//       (canPartiallyDispense || canFullyDispense)
//     );
//   });

//   const handleSelect = (prescription) => {
//     setSelectedId(prescription.prescriptionId);
//     setVerified(false);
//     setDispenseConfirmed(false);
//     setPartialConfirmed(false);
//     setPreview(null);
//     setPreviewError("");
//     setPreviewLoading(true);
//     setNotice("");
//     setPreviewAttempt((current) => current + 1);
//   };

//   const handleDispense = async () => {
//     if (!selectedPrescription || !preview || previewLoading) {
//       setNotice("Select a prescription and load its stock preview first.");
//       return;
//     }

//     if (!verified) {
//       setNotice("Verify the patient identity and prescription first.");
//       return;
//     }

//     if (!hasDispensableItems) {
//       setNotice(
//         "No safe in-house medicine quantities are available to dispense. Review the preview and medicine reasons.",
//       );
//       return;
//     }

//     if (!dispenseConfirmed) {
//       setNotice("Confirm that you want to dispense the available medicines.");
//       return;
//     }

//     if (hasPartialShortfall && !partialConfirmed) {
//       setNotice(
//         "Stock is insufficient. Review the shortfall and explicitly confirm partial dispensing before continuing.",
//       );
//       return;
//     }

//     setDispensing(true);
//     setNotice("");

//     try {
//       const result = await dispensePrescription(selectedId, {
//         confirmPartial: partialConfirmed,
//       });

//       setNotice(
//         result?.status === "PARTIALLY_DISPENSED"
//           ? "Partial dispensing completed. The remaining prescription is still in the queue."
//           : "Dispensing completed successfully.",
//       );

//       setVerified(false);
//       setDispenseConfirmed(false);
//       setPartialConfirmed(false);
//       setPreview(null);
//       setPreviewError("");
//       setPreviewLoading(true);

//       setQueueAttempt((current) => current + 1);
//       setPreviewAttempt((current) => current + 1);
//     } catch (requestError) {
//       if (isStockShortfall(requestError)) {
//         setPreview(requestError.data);
//         setPreviewError("");
//         setPartialConfirmed(false);
//         setDispenseConfirmed(false);
//         setNotice(
//           "Stock availability changed. Review the updated preview, then confirm partial dispensing if you want to continue.",
//         );
//       } else {
//         setNotice(
//           requestError?.userMessage ??
//             requestError?.message ??
//             "Dispensing failed. Refresh the preview and try again if appropriate.",
//         );
//       }
//     } finally {
//       setDispensing(false);
//     }
//   };

//   return (
//     <main className="space-y-6 p-4 sm:p-6">
//       <header>
//         <h1 className="text-2xl font-bold text-gray-900">Dispensing Queue</h1>
//         <p className="mt-1 text-sm text-gray-600">
//           Review prescription details and current stock before dispensing.
//         </p>
//       </header>

//       {notice && (
//         <div
//           role="status"
//           className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
//         >
//           {notice}
//         </div>
//       )}

//       {loading && <LoadingSpinner label="Loading dispensing queue..." />}

//       {error && (
//         <section className="rounded-xl border border-gray-200 bg-white p-5">
//           <ErrorMessage
//             title="Unable to load prescriptions"
//             message="Please check your connection and permissions, then try again."
//           />
//           <Button
//             className="mt-3"
//             onClick={() => {
//               setLoading(true);
//               setError(false);
//               setQueueAttempt((current) => current + 1);
//             }}
//           >
//             Retry
//           </Button>
//         </section>
//       )}

//       {!loading && !error && prescriptions.length === 0 && (
//         <EmptyState
//           title="No prescriptions pending dispensing"
//           description="Issued and partially dispensed prescriptions will appear here."
//         />
//       )}

//       {!loading && !error && prescriptions.length > 0 && (
//         <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
//           <section className="rounded-xl border border-gray-200 bg-white p-5">
//             <div className="mb-4 flex items-center justify-between gap-3">
//               <h2 className="text-lg font-semibold text-gray-900">
//                 Pending prescriptions
//               </h2>
//               <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
//                 {prescriptions.length}
//               </span>
//             </div>

//             <ul className="divide-y divide-gray-100">
//               {prescriptions.map((prescription) => (
//                 <li key={prescription.prescriptionId}>
//                   <button
//                     type="button"
//                     onClick={() => handleSelect(prescription)}
//                     aria-pressed={
//                       String(selectedId) === String(prescription.prescriptionId)
//                     }
//                     className={`w-full rounded-lg p-4 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
//                       String(selectedId) === String(prescription.prescriptionId)
//                         ? "bg-primary-50 ring-1 ring-primary-200"
//                         : ""
//                     }`}
//                   >
//                     <div className="flex items-start justify-between gap-3">
//                       <span className="font-semibold text-gray-900">
//                         Prescription #{prescription.prescriptionId}
//                       </span>
//                       <StatusBadge status={prescription.status ?? "ISSUED"} />
//                     </div>

//                     <p className="mt-2 text-sm text-gray-600">
//                       Patient ID: {prescription.patientId ?? "Unavailable"}
//                     </p>

//                     <p className="mt-1 text-sm text-gray-500">
//                       Date:{" "}
//                       {prescription.date ??
//                         prescription.createdAt ??
//                         "Unavailable"}
//                     </p>
//                   </button>
//                 </li>
//               ))}
//             </ul>
//           </section>

//           <section className="rounded-xl border border-gray-200 bg-white p-5">
//             <h2 className="text-lg font-semibold text-gray-900">
//               Prescription details
//             </h2>

//             {!selectedPrescription ? (
//               <p className="mt-4 text-sm text-gray-600">
//                 Select a prescription to review its details.
//               </p>
//             ) : (
//               <div className="mt-4 space-y-5">
//                 <div className="rounded-lg bg-gray-50 p-4">
//                   <p className="font-semibold text-gray-900">
//                     Prescription #{selectedPrescription.prescriptionId}
//                   </p>
//                   <p className="mt-1 text-sm text-gray-600">
//                     Patient ID:{" "}
//                     {selectedPrescription.patientId ?? "Unavailable"}
//                   </p>
//                   <p className="mt-1 text-sm text-gray-600">
//                     Status: {selectedPrescription.status ?? "ISSUED"}
//                   </p>
//                 </div>

//                 {previewLoading && (
//                   <LoadingSpinner label="Checking current stock..." />
//                 )}

//                 {previewError && (
//                   <div role="alert" className="space-y-3">
//                     <ErrorMessage
//                       title="Unable to load stock preview"
//                       message={previewError}
//                     />
//                     <Button
//                       onClick={() => {
//                         setPreview(null);
//                         setPreviewError("");
//                         setPreviewLoading(true);
//                         setPreviewAttempt((current) => current + 1);
//                       }}
//                     >
//                       Retry preview
//                     </Button>
//                   </div>
//                 )}

//                 {preview && !previewLoading && (
//                   <div>
//                     <h3 className="mb-3 font-semibold text-gray-900">
//                       Live stock preview
//                     </h3>

//                     <p className="mb-3 text-sm text-gray-600">
//                       This preview is read-only. Stock changes only after the
//                       dispensing request succeeds.
//                     </p>

//                     {previewItems.length === 0 ? (
//                       <p className="text-sm text-gray-600">
//                         No medicine items are available in the preview.
//                       </p>
//                     ) : (
//                       <div className="space-y-4">
//                         {previewItems.map((item, index) => {
//                           const fallbackItem = prescriptionItems[index];

//                           return (
//                             <div
//                               key={item.itemId ?? `${item.medicineId}-${index}`}
//                               className="rounded-lg border border-gray-200 p-4"
//                             >
//                               <p className="font-medium text-gray-900">
//                                 {getMedicineName(item, fallbackItem)}
//                               </p>

//                               <p className="mt-1 text-sm text-gray-600">
//                                 Prescribed: {item.prescribedQuantity}
//                               </p>
//                               <p className="text-sm text-gray-600">
//                                 Already dispensed: {item.quantityDispensed}
//                               </p>
//                               <p className="text-sm text-gray-600">
//                                 Remaining: {item.remainingQuantity}
//                               </p>
//                               <p className="text-sm text-gray-600">
//                                 Available stock: {item.availableStock}
//                               </p>
//                               <p className="text-sm text-gray-600">
//                                 Quantity shortfall: {item.shortfallQuantity}
//                               </p>

//                               {item.unitPrice != null && (
//                                 <p className="text-sm text-gray-600">
//                                   Unit price: {item.unitPrice}
//                                 </p>
//                               )}

//                               {item.reason && (
//                                 <p
//                                   className={`mt-2 text-sm font-medium ${
//                                     item.reason === "Insufficient stock"
//                                       ? "text-amber-700"
//                                       : "text-red-700"
//                                   }`}
//                                 >
//                                   {item.reason}
//                                 </p>
//                               )}

//                               {!item.reason && item.dispensable && (
//                                 <p className="mt-2 text-sm font-medium text-green-700">
//                                   Available for dispensing
//                                 </p>
//                               )}
//                             </div>
//                           );
//                         })}
//                       </div>
//                     )}

//                     {hasPartialShortfall && (
//                       <label className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
//                         <input
//                           type="checkbox"
//                           checked={partialConfirmed}
//                           onChange={(event) => {
//                             setPartialConfirmed(event.target.checked);
//                             setNotice("");
//                           }}
//                           className="mt-1 h-4 w-4"
//                         />
//                         <span>
//                           I understand that stock is insufficient and confirm
//                           dispensing only the available quantities.
//                         </span>
//                       </label>
//                     )}
//                   </div>
//                 )}

//                 <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
//                   <input
//                     type="checkbox"
//                     checked={verified}
//                     onChange={(event) => {
//                       setVerified(event.target.checked);
//                       setDispenseConfirmed(false);
//                       setNotice("");
//                     }}
//                     className="mt-1 h-4 w-4"
//                   />
//                   <span>
//                     I have verified the patient identity and prescription.
//                   </span>
//                 </label>

//                 {preview && !previewLoading && (
//                   <>
//                     <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
//                       <input
//                         type="checkbox"
//                         checked={dispenseConfirmed}
//                         onChange={(event) => {
//                           setDispenseConfirmed(event.target.checked);
//                           setNotice("");
//                         }}
//                         className="mt-1 h-4 w-4"
//                       />
//                       <span>
//                         I confirm the actual dispensing operation. The backend
//                         will update medicine stock.
//                       </span>
//                     </label>

//                     <Button
//                       onClick={handleDispense}
//                       disabled={
//                         previewLoading ||
//                         dispensing ||
//                         !verified ||
//                         !dispenseConfirmed ||
//                         !hasDispensableItems ||
//                         (hasPartialShortfall && !partialConfirmed)
//                       }
//                     >
//                       {dispensing
//                         ? "Dispensing..."
//                         : hasPartialShortfall
//                           ? "Confirm partial dispensing"
//                           : "Dispense medicines"}
//                     </Button>
//                   </>
//                 )}
//               </div>
//             )}
//           </section>
//         </div>
//       )}
//     </main>
//   );
// };

// export default DispensingQueuePage;

import { useEffect, useMemo, useRef, useState } from "react";
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

/* ----------------------------- helpers ----------------------------- */

const getMedicineName = (item, fallbackItem) =>
  item?.medicineName ??
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

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const itemStockState = (item) => {
  const remaining = Number(item.remainingQuantity);
  const available = Number(item.availableStock);
  const shortfall = Number(item.shortfallQuantity);

  if (item.reason && item.reason !== "Insufficient stock") return "blocked";
  if (remaining <= 0) return "done";
  if (shortfall > 0 && available > 0) return "partial";
  if (shortfall > 0 && available <= 0) return "shortfall";
  if (item.dispensable === false) return "blocked";
  return "ready";
};

const STOCK_STATE_META = {
  ready: { label: "Ready", tone: "bg-green-50 text-green-700 ring-green-200" },
  partial: {
    label: "Partial stock",
    tone: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  shortfall: {
    label: "Out of stock",
    tone: "bg-red-50 text-red-700 ring-red-200",
  },
  blocked: { label: "Blocked", tone: "bg-red-50 text-red-700 ring-red-200" },
  done: { label: "Complete", tone: "bg-neutral-100 text-neutral-600 ring-neutral-200" },
};

/* --------------------------- small pieces -------------------------- */

const Step = ({ done, active, index, title, description }) => (
  <li className="flex items-start gap-3">
    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ${
        done
          ? "bg-green-600 text-white ring-green-600"
          : active
            ? "bg-primary-600 text-white ring-primary-600"
            : "bg-white text-neutral-500 ring-neutral-300"
      }`}
    >
      {done ? "✓" : index}
    </span>
    <div className="min-w-0">
      <p
        className={`text-sm font-medium ${
          done || active ? "text-neutral-900" : "text-neutral-500"
        }`}
      >
        {title}
      </p>
      {description && (
        <p className="text-xs text-neutral-500">{description}</p>
      )}
    </div>
  </li>
);

const Notice = ({ tone = "info", children, onDismiss }) => {
  const tones = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-green-200 bg-green-50 text-green-900",
    error: "border-red-200 bg-red-50 text-red-900",
  };
  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${tones[tone]}`}
    >
      <div className="min-w-0">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="shrink-0 rounded p-1 text-current/70 hover:bg-black/5 hover:text-current"
        >
          ✕
        </button>
      )}
    </div>
  );
};

/* ------------------------------ page ------------------------------- */

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
  const [notice, setNotice] = useState(null);

  const [query, setQuery] = useState("");
  const detailsRef = useRef(null);

  /* -------- load queue -------- */
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
        [...issued, ...partiallyDispensed].forEach((p) => {
          merged.set(String(p.prescriptionId), p);
        });
        const data = [...merged.values()].sort((a, b) =>
          String(b.prescriptionId).localeCompare(String(a.prescriptionId), undefined, {
            numeric: true,
          }),
        );

        setPrescriptions(data);
        setSelectedId((current) =>
          data.some((p) => String(p.prescriptionId) === String(current))
            ? current
            : null,
        );
      } catch {
        if (!signal.aborted) setError(true);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    void loadPrescriptions();
    return () => controller.abort();
  }, [queueAttempt]);

  /* -------- load preview -------- */
  useEffect(() => {
    if (selectedId == null) return undefined;
    const controller = new AbortController();
    const { signal } = controller;

    const loadPreview = async () => {
      try {
        const data = await getDispensePreview(selectedId, { signal });
        if (!signal.aborted) setPreview(data);
      } catch (requestError) {
        if (!signal.aborted) {
          setPreviewError(
            requestError?.userMessage ??
              requestError?.message ??
              "Unable to retrieve the stock preview.",
          );
        }
      } finally {
        if (!signal.aborted) setPreviewLoading(false);
      }
    };

    void loadPreview();
    return () => controller.abort();
  }, [selectedId, previewAttempt]);

  /* -------- derived -------- */
  const selectedPrescription = prescriptions.find(
    (p) => String(p.prescriptionId) === String(selectedId),
  );
  const previewItems = preview?.items ?? [];

  const hasPartialShortfall = previewItems.some(
    (item) => Number(item.shortfallQuantity) > 0 && Number(item.availableStock) > 0,
  );
  const hasBlockedItems = previewItems.some(
    (item) => itemStockState(item) === "blocked",
  );
  const hasDispensableItems = previewItems.some((item) => {
    const state = itemStockState(item);
    return item.medicineId != null && (state === "ready" || state === "partial");
  });

  const filteredPrescriptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prescriptions;
    return prescriptions.filter(
      (p) =>
        String(p.prescriptionId).toLowerCase().includes(q) ||
        String(p.patientId ?? "").toLowerCase().includes(q),
    );
  }, [prescriptions, query]);

  const canDispense =
    !!preview &&
    !previewLoading &&
    !!verified &&
    !!dispenseConfirmed &&
    hasDispensableItems &&
    (!hasPartialShortfall || partialConfirmed) &&
    !dispensing;

  /* -------- handlers -------- */
  const handleSelect = (prescription) => {
    setSelectedId(prescription.prescriptionId);
    setVerified(false);
    setDispenseConfirmed(false);
    setPartialConfirmed(false);
    setPreview(null);
    setPreviewError("");
    setPreviewLoading(true);
    setNotice(null);
    setPreviewAttempt((c) => c + 1);
    // focus details panel for keyboard/screen-reader users
    requestAnimationFrame(() => detailsRef.current?.focus?.());
  };

  const resetAfterDispense = () => {
    setVerified(false);
    setDispenseConfirmed(false);
    setPartialConfirmed(false);
    setPreview(null);
    setPreviewError("");
    setPreviewLoading(true);
  };

  const handleDispense = async () => {
    if (!selectedPrescription || !preview || previewLoading) {
      setNotice({
        tone: "warning",
        text: "Select a prescription and load its stock preview first.",
      });
      return;
    }
    if (!verified) {
      setNotice({
        tone: "warning",
        text: "Verify the patient identity and prescription first.",
      });
      return;
    }
    if (!hasDispensableItems) {
      setNotice({
        tone: "warning",
        text: "No safe in-house medicine quantities are available to dispense. Review the preview and medicine reasons.",
      });
      return;
    }
    if (!dispenseConfirmed) {
      setNotice({
        tone: "warning",
        text: "Confirm that you want to dispense the available medicines.",
      });
      return;
    }
    if (hasPartialShortfall && !partialConfirmed) {
      setNotice({
        tone: "warning",
        text: "Stock is insufficient. Review the shortfall and explicitly confirm partial dispensing before continuing.",
      });
      return;
    }

    setDispensing(true);
    setNotice(null);

    try {
      const result = await dispensePrescription(selectedId, {
        confirmPartial: partialConfirmed,
      });

      setNotice({
        tone: "success",
        text:
          result?.status === "PARTIALLY_DISPENSED"
            ? "Partial dispensing completed. The remaining prescription is still in the queue."
            : "Dispensing completed successfully.",
      });

      resetAfterDispense();
      setQueueAttempt((c) => c + 1);
      setPreviewAttempt((c) => c + 1);
    } catch (requestError) {
      if (isStockShortfall(requestError)) {
        setPreview(requestError.data);
        setPreviewError("");
        setPartialConfirmed(false);
        setDispenseConfirmed(false);
        setNotice({
          tone: "warning",
          text: "Stock availability changed. Review the updated preview, then confirm partial dispensing if you want to continue.",
        });
      } else {
        setNotice({
          tone: "error",
          text:
            requestError?.userMessage ??
            requestError?.message ??
            "Dispensing failed. Refresh the preview and try again if appropriate.",
        });
      }
    } finally {
      setDispensing(false);
    }
  };

  /* ------------------------------- render ------------------------------ */

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-24 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          Dispensing Queue
        </h1>
        <p className="text-sm text-neutral-600">
          Review prescription details and current stock before dispensing.
        </p>
      </header>

      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      {loading && <LoadingSpinner label="Loading dispensing queue..." />}

      {error && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <ErrorMessage
            title="Unable to load prescriptions"
            message="Please check your connection and permissions, then try again."
          />
          <Button
            className="mt-3"
            onClick={() => {
              setLoading(true);
              setError(false);
              setQueueAttempt((c) => c + 1);
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
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          {/* ---------------- queue list ---------------- */}
          <section className="rounded-2xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-neutral-900">
                  Pending prescriptions
                </h2>
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
                  {prescriptions.length}
                </span>
              </div>

              <label className="block">
                <span className="sr-only">Search prescriptions</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by prescription or patient ID…"
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </label>
            </div>

            <ul className="max-h-[calc(100vh-14rem)] divide-y divide-neutral-100 overflow-y-auto">
              {filteredPrescriptions.length === 0 && (
                <li className="p-4 text-sm text-neutral-500">
                  No prescriptions match your search.
                </li>
              )}

              {filteredPrescriptions.map((prescription) => {
                const isActive =
                  String(selectedId) === String(prescription.prescriptionId);
                const isPartial =
                  prescription.status === "PARTIALLY_DISPENSED";

                return (
                  <li key={prescription.prescriptionId}>
                    <button
                      type="button"
                      onClick={() => handleSelect(prescription)}
                      aria-pressed={isActive}
                      className={`group w-full p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
                        isActive
                          ? "bg-primary-50"
                          : "hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-neutral-900">
                          #{prescription.prescriptionId}
                        </span>
                        <StatusBadge
                          status={prescription.status ?? "ISSUED"}
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-neutral-600">
                        <span>
                          <span className="text-neutral-400">Patient</span>{" "}
                          {prescription.patientId ?? "—"}
                        </span>
                        <span className="text-right">
                          {formatDate(
                            prescription.date ?? prescription.createdAt,
                          )}
                        </span>
                      </div>
                      {isPartial && (
                        <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Partially dispensed
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ---------------- details panel ---------------- */}
          <section
            ref={detailsRef}
            tabIndex={-1}
            aria-live="polite"
            className="rounded-2xl border border-neutral-200 bg-white focus:outline-none"
          >
            <div className="border-b border-neutral-100 p-4">
              <h2 className="text-base font-semibold text-neutral-900">
                Prescription details
              </h2>
            </div>

            {!selectedPrescription ? (
              <div className="p-6 text-center text-sm text-neutral-500">
                <p>Select a prescription from the queue to review it.</p>
              </div>
            ) : (
              <div className="space-y-6 p-4 sm:p-5">
                {/* summary */}
                <div className="rounded-xl bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-900">
                        Prescription #{selectedPrescription.prescriptionId}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">
                        Patient ID:{" "}
                        <span className="font-medium text-neutral-800">
                          {selectedPrescription.patientId ?? "—"}
                        </span>
                      </p>
                    </div>
                    <StatusBadge
                      status={selectedPrescription.status ?? "ISSUED"}
                    />
                  </div>
                </div>

                {/* preview */}
                {previewLoading && (
                  <div className="py-6">
                    <LoadingSpinner label="Checking current stock..." />
                  </div>
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
                        setPreviewAttempt((c) => c + 1);
                      }}
                    >
                      Retry preview
                    </Button>
                  </div>
                )}

                {preview && !previewLoading && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-neutral-900">
                        Live stock preview
                      </h3>
                      <span className="text-xs text-neutral-500">
                        {previewItems.length} item
                        {previewItems.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-500">
                      Read-only. Stock updates only after a successful
                      dispensing request.
                    </p>

                    {previewItems.length === 0 ? (
                      <p className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-600">
                        No medicine items are available in the preview.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {previewItems.map((item, index) => {
                          const fallbackItem =
                            selectedPrescription?.items?.[index];
                          const state = itemStockState(item);
                          const meta = STOCK_STATE_META[state];

                          return (
                            <div
                              key={
                                item.itemId ??
                                `${item.medicineId}-${index}`
                              }
                              className="rounded-xl border border-neutral-200 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="font-medium text-neutral-900">
                                  {getMedicineName(item, fallbackItem)}
                                </p>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.tone}`}
                                >
                                  {meta.label}
                                </span>
                              </div>

                              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm sm:grid-cols-3">
                                <div>
                                  <dt className="text-xs text-neutral-500">
                                    Prescribed
                                  </dt>
                                  <dd className="font-medium text-neutral-800">
                                    {item.prescribedQuantity}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-neutral-500">
                                    Dispensed
                                  </dt>
                                  <dd className="font-medium text-neutral-800">
                                    {item.quantityDispensed}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-neutral-500">
                                    Remaining
                                  </dt>
                                  <dd className="font-medium text-neutral-800">
                                    {item.remainingQuantity}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-neutral-500">
                                    Available
                                  </dt>
                                  <dd className="font-medium text-neutral-800">
                                    {item.availableStock}
                                  </dd>
                                </div>
                                {Number(item.shortfallQuantity) > 0 && (
                                  <div>
                                    <dt className="text-xs text-amber-600">
                                      Shortfall
                                    </dt>
                                    <dd className="font-medium text-amber-700">
                                      {item.shortfallQuantity}
                                    </dd>
                                  </div>
                                )}
                                {item.unitPrice != null && (
                                  <div>
                                    <dt className="text-xs text-neutral-500">
                                      Unit price
                                    </dt>
                                    <dd className="font-medium text-neutral-800">
                                      {item.unitPrice}
                                    </dd>
                                  </div>
                                )}
                              </dl>

                              {item.reason && (
                                <p
                                  className={`mt-3 rounded-md px-2 py-1 text-xs font-medium ${
                                    item.reason === "Insufficient stock"
                                      ? "bg-amber-50 text-amber-800"
                                      : "bg-red-50 text-red-800"
                                  }`}
                                >
                                  {item.reason}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {hasBlockedItems && (
                      <Notice tone="error">
                        Some medicines cannot be dispensed from in-house stock.
                        They will be skipped.
                      </Notice>
                    )}

                    {hasPartialShortfall && (
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 has-[:checked]:ring-2 has-[:checked]:ring-amber-400">
                        <input
                          type="checkbox"
                          checked={partialConfirmed}
                          onChange={(e) => {
                            setPartialConfirmed(e.target.checked);
                            setNotice(null);
                          }}
                          className="mt-1 h-4 w-4 accent-amber-600"
                        />
                        <span>
                          <strong className="font-semibold">
                            Confirm partial dispensing.
                          </strong>{" "}
                          Stock is insufficient; dispense only the available
                          quantities.
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {/* verification checklist */}
                {preview && !previewLoading && (
                  <div className="rounded-xl border border-neutral-200 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-neutral-900">
                      Dispensing checklist
                    </h3>
                    <ol className="space-y-3">
                      <Step
                        index={1}
                        done={verified}
                        active={!verified}
                        title="Verify patient & prescription"
                        description="Confirm the patient identity matches the prescription."
                      />
                      <Step
                        index={2}
                        done={dispenseConfirmed}
                        active={verified && !dispenseConfirmed}
                        title="Confirm dispensing operation"
                        description="The backend will update medicine stock."
                      />
                      {hasPartialShortfall && (
                        <Step
                          index={3}
                          done={partialConfirmed}
                          active={dispenseConfirmed && !partialConfirmed}
                          title="Acknowledge stock shortfall"
                          description="Confirm dispensing only the available quantities."
                        />
                      )}
                    </ol>
                  </div>
                )}

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-4 text-sm text-neutral-700 has-[:checked]:border-primary-400 has-[:checked]:bg-primary-50/50">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => {
                      setVerified(e.target.checked);
                      if (!e.target.checked) setDispenseConfirmed(false);
                      setNotice(null);
                    }}
                    className="mt-1 h-4 w-4 accent-primary-600"
                  />
                  <span>
                    I have verified the patient identity and prescription.
                  </span>
                </label>

                {preview && !previewLoading && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-4 text-sm text-neutral-700 has-[:checked]:border-primary-400 has-[:checked]:bg-primary-50/50">
                    <input
                      type="checkbox"
                      checked={dispenseConfirmed}
                      onChange={(e) => {
                        setDispenseConfirmed(e.target.checked);
                        setNotice(null);
                      }}
                      disabled={!verified}
                      className="mt-1 h-4 w-4 accent-primary-600 disabled:opacity-50"
                    />
                    <span className={!verified ? "opacity-60" : ""}>
                      I confirm the actual dispensing operation. The backend
                      will update medicine stock.
                    </span>
                  </label>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ---------------- sticky action bar ---------------- */}
      {selectedPrescription && preview && !previewLoading && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-neutral-600">
              {hasPartialShortfall ? (
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Partial dispensing — confirm shortfall to continue
                </span>
              ) : hasDispensableItems ? (
                <span className="flex items-center gap-1.5 text-green-700">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Ready to dispense
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-700">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  No dispensable quantities available
                </span>
              )}
            </div>

            <Button
              onClick={handleDispense}
              disabled={!canDispense}
              className="w-full sm:w-auto"
            >
              {dispensing
                ? "Dispensing..."
                : hasPartialShortfall
                  ? "Confirm partial dispensing"
                  : "Dispense medicines"}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
};

export default DispensingQueuePage;