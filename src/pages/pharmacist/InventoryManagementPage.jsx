// import { Link } from "react-router-dom";
// import { useCallback, useEffect, useState } from "react";
// import EmptyState from "../../components/EmptyState";
// import ErrorMessage from "../../components/ErrorMessage";
// import LoadingSpinner from "../../components/LoadingSpinner";
// import {
//   adjustMedicineStock,
//   getLowStockMedicines,
//   getNearExpiryMedicines,
//   searchMedicines,
// } from "../../services/medicineService";

// const today = () => new Date().toISOString().slice(0, 10);

// const dateAfterDays = (days) => {
//   const date = new Date();
//   date.setUTCDate(date.getUTCDate() + days);
//   return date.toISOString().slice(0, 10);
// };

// const getMedicineId = (medicine) => medicine.medicineId ?? medicine.id;

// const getMedicineName = (medicine) =>
//   medicine.name ?? medicine.medicineName ?? "Unknown medicine";

// const getStock = (medicine) => {
//   const value = Number(medicine.stockQuantity);
//   return Number.isFinite(value) ? value : 0;
// };

// const InventoryManagementPage = () => {
//   const [medicines, setMedicines] = useState([]);
//   const [filter, setFilter] = useState("all");
//   const [search, setSearch] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [loadError, setLoadError] = useState(false);
//   const [retry, setRetry] = useState(0);
//   const [selectedMedicine, setSelectedMedicine] = useState(null);
//   const [delta, setDelta] = useState("");
//   const [reason, setReason] = useState("");
//   const [saving, setSaving] = useState(false);
//   const [notice, setNotice] = useState("");
//   const [adjustError, setAdjustError] = useState("");

//   const loadMedicines = useCallback(
//     async (signal) => {
//       setLoading(true);
//       setLoadError(false);

//       try {
//         let data;

//         if (filter === "low") {
//           data = await getLowStockMedicines({ signal });
//         } else if (filter === "near") {
//           data = await getNearExpiryMedicines({ signal });
//         } else {
//           data = await searchMedicines(search.trim(), { signal });
//         }

//         if (!signal.aborted) {
//           setMedicines(data);
//         }
//       } catch {
//         if (!signal.aborted) {
//           setLoadError(true);
//         }
//       } finally {
//         if (!signal.aborted) {
//           setLoading(false);
//         }
//       }
//     },
//     [filter, search],
//   );

//   useEffect(() => {
//     const controller = new AbortController();

//     Promise.resolve().then(() => {
//       if (!controller.signal.aborted) {
//         void loadMedicines(controller.signal);
//       }
//     });

//     return () => controller.abort();
//   }, [loadMedicines, retry]);

//   const visibleMedicines = medicines.filter((medicine) => {
//     const name = getMedicineName(medicine).toLowerCase();
//     const matchesSearch =
//       name.includes(search.trim().toLowerCase()) ||
//       String(getMedicineId(medicine) ?? "").includes(search.trim());

//     if (filter === "all") return matchesSearch;

//     if (filter === "low") return matchesSearch;

//     if (filter === "near") return matchesSearch;

//     return false;
//   });

//   const openAdjustment = (medicine) => {
//     setSelectedMedicine(medicine);
//     setDelta("");
//     setReason("");
//     setAdjustError("");
//     setNotice("");
//   };

//   const submitAdjustment = async (event) => {
//     event.preventDefault();
//     setAdjustError("");
//     setNotice("");

//     const amount = Number(delta);
//     const currentStock = getStock(selectedMedicine);

//     if (!selectedMedicine) return;

//     if (delta.trim() === "" || !Number.isInteger(amount) || amount === 0) {
//       setAdjustError("Enter a non-zero whole-number stock change.");
//       return;
//     }

//     if (!reason.trim()) {
//       setAdjustError("Enter a reason for this stock adjustment.");
//       return;
//     }

//     if (currentStock + amount < 0) {
//       setAdjustError(
//         `Stock cannot become negative. Current quantity: ${currentStock}.`,
//       );
//       return;
//     }

//     if (selectedMedicine.expiryDate && selectedMedicine.expiryDate < today()) {
//       setAdjustError("Expired medicine cannot be adjusted through this page.");
//       return;
//     }

//     setSaving(true);

//     try {
//       const updated = await adjustMedicineStock(
//         getMedicineId(selectedMedicine),
//         amount,
//       );

//       setMedicines((current) =>
//         current.map((medicine) =>
//           String(getMedicineId(medicine)) === String(getMedicineId(updated))
//             ? updated
//             : medicine,
//         ),
//       );

//       setSelectedMedicine(null);
//       setDelta("");
//       setReason("");
//       setNotice(
//         "Stock updated successfully. Note: the current backend does not save the adjustment reason.",
//       );

//       // Reload so low-stock and near-expiry lists reflect the new state.
//       setRetry((value) => value + 1);
//     } catch (error) {
//       const status = error?.response?.status;

//       if (status === 400 || status === 422) {
//         setAdjustError(
//           error?.response?.data?.message ??
//             "The stock adjustment was rejected. Check the quantity and try again.",
//         );
//       } else if (status === 403) {
//         setAdjustError("You do not have permission to update medicine stock.");
//       } else if (status === 404) {
//         setAdjustError(
//           "This medicine could not be found. Reload the inventory.",
//         );
//       } else {
//         setAdjustError("Unable to update stock. Please try again.");
//       }
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <main className="space-y-6 p-4 sm:p-6">
//       <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">
//             Inventory Management
//           </h1>
//           <p className="mt-1 text-sm text-gray-600">
//             Review medicine stock, expiry dates, and inventory alerts.
//           </p>
//         </div>

//         <Link
//           to="/pharmacist/add-medicine"
//           className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
//         >
//           <span aria-hidden="true">+</span>
//           Add New Medicine
//         </Link>
//       </header>

//       {notice && (
//         <div
//           role="status"
//           className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
//         >
//           {notice}
//         </div>
//       )}

//       <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
//         <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
//           <div>
//             <label
//               htmlFor="inventory-search"
//               className="mb-1 block text-sm font-medium text-gray-700"
//             >
//               Search medicines
//             </label>
//             <input
//               id="inventory-search"
//               type="search"
//               value={search}
//               onChange={(event) => setSearch(event.target.value)}
//               placeholder="Search by medicine name or ID"
//               className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
//             />
//           </div>

//           <div>
//             <label
//               htmlFor="inventory-filter"
//               className="mb-1 block text-sm font-medium text-gray-700"
//             >
//               Filter inventory
//             </label>
//             <select
//               id="inventory-filter"
//               value={filter}
//               onChange={(event) => setFilter(event.target.value)}
//               className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 sm:min-w-48"
//             >
//               <option value="all">All medicines</option>
//               <option value="low">Low stock</option>
//               <option value="near">Near expiry</option>
//             </select>
//           </div>
//         </div>

//         {loading && <LoadingSpinner label="Loading medicine inventory..." />}

//         {loadError && (
//           <div className="space-y-3">
//             <ErrorMessage
//               title="Unable to load inventory"
//               message="Please check your connection and try again."
//             />
//             <button
//               type="button"
//               onClick={() => setRetry((value) => value + 1)}
//               className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
//             >
//               Retry
//             </button>
//           </div>
//         )}

//         {!loading && !loadError && visibleMedicines.length === 0 && (
//           <EmptyState
//             title="No medicines found"
//             description="Try another search term or inventory filter."
//           />
//         )}

//         {!loading && !loadError && visibleMedicines.length > 0 && (
//           <div className="overflow-x-auto">
//             <table className="w-full min-w-[720px] border-collapse text-left text-sm">
//               <thead>
//                 <tr className="border-b border-gray-200 bg-gray-50 text-gray-700">
//                   <th scope="col" className="px-4 py-3 font-semibold">
//                     Medicine
//                   </th>
//                   <th scope="col" className="px-4 py-3 font-semibold">
//                     Stock
//                   </th>
//                   <th scope="col" className="px-4 py-3 font-semibold">
//                     Reorder level
//                   </th>
//                   <th scope="col" className="px-4 py-3 font-semibold">
//                     Expiry date
//                   </th>
//                   <th scope="col" className="px-4 py-3 font-semibold">
//                     Status
//                   </th>
//                   <th scope="col" className="px-4 py-3 font-semibold">
//                     Action
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-100">
//                 {visibleMedicines.map((medicine) => {
//                   const expiryDate = medicine.expiryDate;
//                   const expired = Boolean(expiryDate && expiryDate < today());
//                   const quarantined = medicine.isQuarantined === true;
//                   const lowStock =
//                     medicine.reorderLevel != null &&
//                     getStock(medicine) <= Number(medicine.reorderLevel);
//                   const nearExpiry =
//                     Boolean(expiryDate) &&
//                     expiryDate >= today() &&
//                     expiryDate <= dateAfterDays(30);

//                   return (
//                     <tr key={getMedicineId(medicine)} className="align-top">
//                       <td className="px-4 py-4">
//                         <p className="font-semibold text-gray-900">
//                           {getMedicineName(medicine)}
//                         </p>
//                         <p className="mt-1 text-xs text-gray-500">
//                           ID: {getMedicineId(medicine) ?? "Unavailable"}
//                         </p>
//                       </td>
//                       <td className="px-4 py-4 font-medium text-gray-900">
//                         {getStock(medicine)}
//                       </td>
//                       <td className="px-4 py-4">
//                         {medicine.reorderLevel ?? "Not set"}
//                       </td>
//                       <td className="px-4 py-4">
//                         {expiryDate ?? "Not provided"}
//                       </td>
//                       <td className="px-4 py-4">
//                         <div className="flex flex-wrap gap-1">
//                           {expired && (
//                             <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
//                               Expired — Unavailable
//                             </span>
//                           )}
//                           {!expired && quarantined && (
//                             <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
//                               Quarantined — Unavailable
//                             </span>
//                           )}
//                           {!expired && !quarantined && lowStock && (
//                             <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
//                               ⚠ Low stock
//                             </span>
//                           )}
//                           {!expired && !quarantined && nearExpiry && (
//                             <span className="inline-flex rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-900">
//                               ⚠ Near expiry
//                             </span>
//                           )}
//                           {!expired &&
//                             !quarantined &&
//                             !lowStock &&
//                             !nearExpiry && (
//                               <span className="text-gray-600">Available</span>
//                             )}
//                         </div>
//                       </td>

//                       <td className="px-4 py-4">
//                         <div className="flex flex-wrap gap-2">
//                           <Link
//                             to={`/pharmacist/medicines/${encodeURIComponent(
//                               getMedicineId(medicine),
//                             )}/edit`}
//                             className="inline-flex items-center rounded-md border border-primary-300 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
//                           >
//                             Edit
//                           </Link>

//                           <button
//                             type="button"
//                             disabled={expired || quarantined}
//                             onClick={() => openAdjustment(medicine)}
//                             className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
//                           >
//                             Adjust stock
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </section>

//       {selectedMedicine && (
//         <section
//           aria-labelledby="stock-adjustment-heading"
//           className="rounded-xl border border-gray-200 bg-white p-5"
//         >
//           <h2
//             id="stock-adjustment-heading"
//             className="text-lg font-semibold text-gray-900"
//           >
//             Adjust stock — {getMedicineName(selectedMedicine)}
//           </h2>
//           <p className="mt-1 text-sm text-gray-600">
//             Current stock: {getStock(selectedMedicine)}. Use a positive number
//             to add stock or a negative number to remove stock.
//           </p>

//           <form onSubmit={submitAdjustment} className="mt-4 max-w-xl space-y-4">
//             <div>
//               <label
//                 htmlFor="stock-delta"
//                 className="mb-1 block text-sm font-medium text-gray-700"
//               >
//                 Stock change
//               </label>
//               <input
//                 id="stock-delta"
//                 type="number"
//                 step="1"
//                 value={delta}
//                 onChange={(event) => setDelta(event.target.value)}
//                 placeholder="Example: 10 or -5"
//                 required
//                 className="w-full rounded-md border border-gray-300 px-3 py-2"
//               />
//             </div>

//             <div>
//               <label
//                 htmlFor="stock-adjustment-reason"
//                 className="mb-1 block text-sm font-medium text-gray-700"
//               >
//                 Reason for adjustment
//               </label>
//               <textarea
//                 id="stock-adjustment-reason"
//                 value={reason}
//                 onChange={(event) => setReason(event.target.value)}
//                 rows={3}
//                 maxLength={250}
//                 required
//                 placeholder="Explain why the stock is changing"
//                 className="w-full rounded-md border border-gray-300 px-3 py-2"
//               />
//               <p className="mt-1 text-xs text-gray-500">
//                 The current backend does not store this reason yet.
//               </p>
//             </div>

//             {adjustError && (
//               <p role="alert" className="text-sm font-medium text-red-700">
//                 {adjustError}
//               </p>
//             )}

//             <div className="flex flex-wrap gap-3">
//               <button
//                 type="submit"
//                 disabled={saving}
//                 className="rounded-md bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
//               >
//                 {saving ? "Updating..." : "Confirm adjustment"}
//               </button>
//               <button
//                 type="button"
//                 disabled={saving}
//                 onClick={() => setSelectedMedicine(null)}
//                 className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-800"
//               >
//                 Cancel
//               </button>
//             </div>
//           </form>
//         </section>
//       )}
//     </main>
//   );
// };

// export default InventoryManagementPage;

import { Link } from "react-router-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import {
  adjustMedicineStock,
  getLowStockMedicines,
  getNearExpiryMedicines,
  searchMedicines,
} from "../../services/medicineService";

/* ----------------------------- helpers ----------------------------- */

const today = () => new Date().toISOString().slice(0, 10);

const dateAfterDays = (days) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const getMedicineId = (medicine) => medicine.medicineId ?? medicine.id;

const getMedicineName = (medicine) =>
  medicine.name ?? medicine.medicineName ?? "Unknown medicine";

const getStock = (medicine) => {
  const value = Number(medicine.stockQuantity);
  return Number.isFinite(value) ? value : 0;
};

const isExpired = (medicine) =>
  Boolean(medicine.expiryDate && medicine.expiryDate < today());

const isNearExpiry = (medicine) =>
  Boolean(medicine.expiryDate) &&
  medicine.expiryDate >= today() &&
  medicine.expiryDate <= dateAfterDays(30);

const isLowStock = (medicine) =>
  medicine.reorderLevel != null &&
  getStock(medicine) <= Number(medicine.reorderLevel);

/* -------------------------- status helpers ------------------------- */

const STATUS_META = {
  expired: {
    label: "Expired",
    tone: "bg-red-100 text-red-800 ring-red-200",
    dot: "bg-red-500",
    icon: "⛔",
  },
  quarantined: {
    label: "Quarantined",
    tone: "bg-neutral-200 text-neutral-800 ring-neutral-300",
    dot: "bg-neutral-500",
    icon: "🔒",
  },
  lowStock: {
    label: "Low stock",
    tone: "bg-amber-100 text-amber-900 ring-amber-200",
    dot: "bg-amber-500",
    icon: "⚠",
  },
  nearExpiry: {
    label: "Near expiry",
    tone: "bg-orange-100 text-orange-900 ring-orange-200",
    dot: "bg-orange-500",
    icon: "⏳",
  },
  available: {
    label: "Available",
    tone: "bg-green-50 text-green-700 ring-green-200",
    dot: "bg-green-500",
    icon: "✓",
  },
};

const getStatuses = (medicine) => {
  if (isExpired(medicine)) return ["expired"];
  if (medicine.isQuarantined === true) return ["quarantined"];
  const list = [];
  if (isLowStock(medicine)) list.push("lowStock");
  if (isNearExpiry(medicine)) list.push("nearExpiry");
  return list.length ? list : ["available"];
};

/* --------------------------- small pieces -------------------------- */

const StatusChip = ({ kind }) => {
  const meta = STATUS_META[kind];
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

const Notice = ({ tone = "info", children, onDismiss }) => {
  const tones = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    success: "border-green-200 bg-green-50 text-green-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
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
          className="shrink-0 rounded p-1 hover:bg-black/5"
        >
          ✕
        </button>
      )}
    </div>
  );
};

const StatCard = ({ label, value, tone, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`flex flex-1 min-w-[140px] flex-col items-start rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
      active
        ? "border-primary-400 bg-primary-50 ring-1 ring-primary-200"
        : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
    }`}
  >
    <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
      {label}
    </span>
    <span className={`mt-1 text-2xl font-semibold ${tone ?? "text-neutral-900"}`}>
      {value}
    </span>
  </button>
);

/* ------------------------------- page ------------------------------ */

const FILTERS = [
  { key: "all", label: "All medicines" },
  { key: "low", label: "Low stock" },
  { key: "near", label: "Near expiry" },
];

const InventoryManagementPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);

  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [adjustError, setAdjustError] = useState("");

  /* debounce search input */
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* load medicines */
  const loadMedicines = useCallback(
    async (signal) => {
      setLoading(true);
      setLoadError(false);
      try {
        let data;
        if (filter === "low") data = await getLowStockMedicines({ signal });
        else if (filter === "near") data = await getNearExpiryMedicines({ signal });
        else data = await searchMedicines(search, { signal });

        if (!signal.aborted) setMedicines(data);
      } catch {
        if (!signal.aborted) setLoadError(true);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [filter, search],
  );

  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) void loadMedicines(controller.signal);
    });
    return () => controller.abort();
  }, [loadMedicines, retry]);

  /* derived */
  const visibleMedicines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medicines.filter((m) => {
      if (!q) return true;
      return (
        getMedicineName(m).toLowerCase().includes(q) ||
        String(getMedicineId(m) ?? "").includes(q)
      );
    });
  }, [medicines, search]);

  const stats = useMemo(() => {
    const total = medicines.length;
    let low = 0,
      near = 0,
      expired = 0;
    for (const m of medicines) {
      if (isExpired(m)) expired++;
      else {
        if (isLowStock(m)) low++;
        if (isNearExpiry(m)) near++;
      }
    }
    return { total, low, near, expired };
  }, [medicines]);

  /* adjustment handlers */
  const openAdjustment = (medicine) => {
    setSelectedMedicine(medicine);
    setDelta("");
    setReason("");
    setAdjustError("");
    setNotice(null);
  };

  const closeAdjustment = () => {
    if (saving) return;
    setSelectedMedicine(null);
    setAdjustError("");
  };

  const submitAdjustment = async (event) => {
    event.preventDefault();
    setAdjustError("");
    setNotice(null);

    if (!selectedMedicine) return;
    const amount = Number(delta);
    const currentStock = getStock(selectedMedicine);

    if (delta.trim() === "" || !Number.isInteger(amount) || amount === 0) {
      setAdjustError("Enter a non-zero whole-number stock change.");
      return;
    }
    if (!reason.trim()) {
      setAdjustError("Enter a reason for this stock adjustment.");
      return;
    }
    if (currentStock + amount < 0) {
      setAdjustError(
        `Stock cannot become negative. Current quantity: ${currentStock}.`,
      );
      return;
    }
    if (isExpired(selectedMedicine)) {
      setAdjustError("Expired medicine cannot be adjusted through this page.");
      return;
    }

    setSaving(true);

    try {
      const updated = await adjustMedicineStock(
        getMedicineId(selectedMedicine),
        amount,
      );

      setMedicines((current) =>
        current.map((m) =>
          String(getMedicineId(m)) === String(getMedicineId(updated))
            ? updated
            : m,
        ),
      );

      setSelectedMedicine(null);
      setDelta("");
      setReason("");
      setNotice({
        tone: "success",
        text: "Stock updated successfully. (Reason is not yet persisted by the backend.)",
      });

      setRetry((v) => v + 1);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 400 || status === 422) {
        setAdjustError(
          error?.response?.data?.message ??
            "The stock adjustment was rejected. Check the quantity and try again.",
        );
      } else if (status === 403) {
        setAdjustError("You do not have permission to update medicine stock.");
      } else if (status === 404) {
        setAdjustError("This medicine could not be found. Reload the inventory.");
      } else {
        setAdjustError("Unable to update stock. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------- render ---------------------------- */

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Inventory Management
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Review stock levels, expiry dates, and inventory alerts.
          </p>
        </div>

        <Link
          to="/pharmacist/add-medicine"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">+</span>
          Add New Medicine
        </Link>
      </header>

      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      {/* stats / filter pills */}
      <div className="flex flex-wrap gap-3">
        <StatCard
          label="Total"
          value={stats.total}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <StatCard
          label="Low stock"
          value={stats.low}
          tone={stats.low > 0 ? "text-amber-700" : "text-neutral-900"}
          active={filter === "low"}
          onClick={() => setFilter("low")}
        />
        <StatCard
          label="Near expiry"
          value={stats.near}
          tone={stats.near > 0 ? "text-orange-700" : "text-neutral-900"}
          active={filter === "near"}
          onClick={() => setFilter("near")}
        />
        <StatCard
          label="Expired"
          value={stats.expired}
          tone={stats.expired > 0 ? "text-red-700" : "text-neutral-900"}
          active={false}
          onClick={() => {}}
        />
      </div>

      {/* table card */}
      <section className="rounded-2xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-md">
              <label
                htmlFor="inventory-search"
                className="sr-only"
              >
                Search medicines
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
                  🔍
                </span>
                <input
                  id="inventory-search"
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name or ID…"
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Inventory filter"
              className="flex flex-wrap gap-1 rounded-lg bg-neutral-100 p-1"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    filter === f.key
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="p-6">
            <LoadingSpinner label="Loading medicine inventory..." />
          </div>
        )}

        {loadError && (
          <div className="space-y-3 p-6">
            <ErrorMessage
              title="Unable to load inventory"
              message="Please check your connection and try again."
            />
            <button
              type="button"
              onClick={() => setRetry((v) => v + 1)}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !loadError && visibleMedicines.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="No medicines found"
              description="Try another search term or inventory filter."
            />
          </div>
        )}

        {!loading && !loadError && visibleMedicines.length > 0 && (
          <>
            {/* desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Medicine
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Stock
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Reorder
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Expiry
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {visibleMedicines.map((medicine) => {
                    const statuses = getStatuses(medicine);
                    const expiry = medicine.expiryDate;
                    const expired = isExpired(medicine);
                    const quarantined = medicine.isQuarantined === true;
                    const adjustable = !expired && !quarantined;
                    const stock = getStock(medicine);
                    const reorder = medicine.reorderLevel;

                    return (
                      <tr
                        key={getMedicineId(medicine)}
                        className={`align-top transition hover:bg-neutral-50/70 ${
                          expired
                            ? "border-l-2 border-l-red-400"
                            : quarantined
                              ? "border-l-2 border-l-neutral-400"
                              : isLowStock(medicine)
                                ? "border-l-2 border-l-amber-400"
                                : isNearExpiry(medicine)
                                  ? "border-l-2 border-l-orange-400"
                                  : "border-l-2 border-l-transparent"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-neutral-900">
                            {getMedicineName(medicine)}
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            ID: {getMedicineId(medicine) ?? "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-medium ${
                              stock === 0
                                ? "text-red-700"
                                : isLowStock(medicine)
                                  ? "text-amber-700"
                                  : "text-neutral-900"
                            }`}
                          >
                            {stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {reorder ?? (
                            <span className="text-neutral-400">Not set</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {expiry ?? (
                            <span className="text-neutral-400">Not set</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {statuses.map((kind) => (
                              <StatusChip key={kind} kind={kind} />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              to={`/pharmacist/medicines/${encodeURIComponent(
                                getMedicineId(medicine),
                              )}/edit`}
                              className="inline-flex items-center rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              disabled={!adjustable}
                              onClick={() => openAdjustment(medicine)}
                              title={
                                adjustable
                                  ? undefined
                                  : expired
                                    ? "Expired medicines cannot be adjusted"
                                    : "Quarantined medicines cannot be adjusted"
                              }
                              className="inline-flex items-center rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <ul className="divide-y divide-neutral-100 md:hidden">
              {visibleMedicines.map((medicine) => {
                const statuses = getStatuses(medicine);
                const expired = isExpired(medicine);
                const quarantined = medicine.isQuarantined === true;
                const adjustable = !expired && !quarantined;

                return (
                  <li key={getMedicineId(medicine)} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900">
                          {getMedicineName(medicine)}
                        </p>
                        <p className="text-xs text-neutral-500">
                          ID: {getMedicineId(medicine) ?? "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {statuses.map((k) => (
                          <StatusChip key={k} kind={k} />
                        ))}
                      </div>
                    </div>

                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-neutral-500">Stock</dt>
                        <dd className="font-medium text-neutral-900">
                          {getStock(medicine)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500">Reorder</dt>
                        <dd className="font-medium text-neutral-900">
                          {medicine.reorderLevel ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500">Expiry</dt>
                        <dd className="font-medium text-neutral-900">
                          {medicine.expiryDate ?? "—"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        to={`/pharmacist/medicines/${encodeURIComponent(
                          getMedicineId(medicine),
                        )}/edit`}
                        className="inline-flex flex-1 items-center justify-center rounded-md border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={!adjustable}
                        onClick={() => openAdjustment(medicine)}
                        className="inline-flex flex-1 items-center justify-center rounded-md border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Adjust
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* adjustment drawer */}
      {selectedMedicine && (
        <AdjustmentDrawer
          medicine={selectedMedicine}
          delta={delta}
          reason={reason}
          saving={saving}
          error={adjustError}
          onDelta={setDelta}
          onReason={setReason}
          onSubmit={submitAdjustment}
          onClose={closeAdjustment}
        />
      )}
    </main>
  );
};

/* ------------------------ adjustment drawer ----------------------- */

const PRESETS = [-10, -5, -1, 1, 5, 10];

const AdjustmentDrawer = ({
  medicine,
  delta,
  reason,
  saving,
  error,
  onDelta,
  onReason,
  onSubmit,
  onClose,
}) => {
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);
  const openerRef = useRef(null);

  const currentStock = getStock(medicine);
  const amount = Number(delta);
  const projected =
    delta.trim() !== "" && Number.isFinite(amount)
      ? currentStock + amount
      : currentStock;
  const isDecrease = projected < currentStock;

  useEffect(() => {
    openerRef.current = document.activeElement;
    firstFieldRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      openerRef.current?.focus?.();
    };
  }, [onClose]);

  const applyPreset = (value) => {
    onDelta(String(value));
    firstFieldRef.current?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjustment-title"
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl"
      >
        <div className="border-b border-neutral-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="adjustment-title"
                className="text-lg font-semibold text-neutral-900"
              >
                Adjust stock
              </h2>
              <p className="mt-0.5 text-sm text-neutral-600">
                {getMedicineName(medicine)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex-1 space-y-5 p-5"
          aria-describedby="adjustment-help"
        >
          <div className="rounded-lg bg-neutral-50 p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-neutral-500">Current</p>
                <p className="text-lg font-semibold text-neutral-900">
                  {currentStock}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Change</p>
                <p
                  className={`text-lg font-semibold ${
                    amount > 0
                      ? "text-green-700"
                      : amount < 0
                        ? "text-red-700"
                        : "text-neutral-900"
                  }`}
                >
                  {delta.trim() === "" ? "—" : amount > 0 ? `+${amount}` : amount}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">New</p>
                <p
                  className={`text-lg font-semibold ${
                    projected < 0 ? "text-red-700" : "text-neutral-900"
                  }`}
                >
                  {projected}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="stock-delta"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Stock change
            </label>
            <input
              ref={firstFieldRef}
              id="stock-delta"
              type="number"
              step="1"
              value={delta}
              onChange={(e) => onDelta(e.target.value)}
              placeholder="e.g. 10 or -5"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />

            <div className="mt-2 flex flex-wrap gap-1">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => applyPreset(v)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                    v > 0
                      ? "border-green-200 bg-green-50 text-green-800 hover:bg-green-100"
                      : "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
                  }`}
                >
                  {v > 0 ? `+${v}` : v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="stock-adjustment-reason"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Reason for adjustment
            </label>
            <textarea
              id="stock-adjustment-reason"
              value={reason}
              onChange={(e) => onReason(e.target.value)}
              rows={3}
              maxLength={250}
              required
              placeholder="Explain why the stock is changing"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {reason.length}/250 · Backend does not persist this reason yet.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          {isDecrease && projected >= 0 && (
            <Notice tone="warning">
              This will reduce stock by {Math.abs(amount)}. Confirm this is
              intentional (e.g. wastage, recount).
            </Notice>
          )}
        </form>

        <div className="border-t border-neutral-200 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              form=""
              onClick={(e) => {
                // trigger form submit through the form element
                e.preventDefault();
                e.currentTarget.closest("div[role='dialog']")
                  ?.querySelector("form")
                  ?.requestSubmit?.();
              }}
              disabled={saving}
              className="flex-1 rounded-md bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Updating…" : "Confirm adjustment"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-md border border-neutral-300 px-4 py-2 font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryManagementPage;