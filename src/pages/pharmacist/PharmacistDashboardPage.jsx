// import { Link } from "react-router-dom";
// import { useCallback, useEffect, useState } from "react";
// import { useTranslation } from "react-i18next";

// import EmptyState from "../../components/EmptyState";
// import ErrorMessage from "../../components/ErrorMessage";
// import LoadingSpinner from "../../components/LoadingSpinner";
// import StatCard from "../../components/StatCard";
// import { getPrescriptionsByStatus } from "../../services/prescriptionService";
// import {
//   getLowStockMedicines,
//   getNearExpiryMedicines,
// } from "../../services/medicineService";

// const useDashboardResource = (fetchData) => {
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(false);
//   const [attempt, setAttempt] = useState(0);

//   const retry = useCallback(() => {
//     setAttempt((current) => current + 1);
//   }, []);

//   useEffect(() => {
//     const controller = new AbortController();

//     const load = async () => {
//       setLoading(true);
//       setError(false);

//       try {
//         const result = await fetchData({ signal: controller.signal });
//         if (!controller.signal.aborted) {
//           setData(result);
//         }
//       } catch {
//         if (!controller.signal.aborted) {
//           setError(true);
//         }
//       } finally {
//         if (!controller.signal.aborted) {
//           setLoading(false);
//         }
//       }
//     };

//     load();

//     return () => controller.abort();
//   }, [fetchData, attempt]);

//   return { data, loading, error, retry };
// };

// const medicineName = (medicine) =>
//   medicine.medicineName ??
//   medicine.name ??
//   medicine.genericName ??
//   `Medicine #${medicine.medicineId ?? medicine.id ?? "—"}`;

// const DashboardSection = ({
//   title,
//   data,
//   loading,
//   error,
//   retry,
//   emptyTitle,
//   emptyMessage,
//   children,
// }) => (
//   <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
//     <div className="mb-4 flex items-center justify-between gap-3">
//       <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
//       {!loading && !error && (
//         <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
//           {data.length}
//         </span>
//       )}
//     </div>

//     {loading && <LoadingSpinner label={`Loading ${title.toLowerCase()}...`} />}

//     {error && (
//       <div>
//         <ErrorMessage
//           title="Unable to load data"
//           message="Please check your connection and try again."
//         />
//         <button
//           type="button"
//           onClick={retry}
//           className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
//         >
//           Retry
//         </button>
//       </div>
//     )}
//     {!loading && !error && data.length === 0 && (
//       <EmptyState title={emptyTitle} description={emptyMessage} />
//     )}

//     {!loading && !error && data.length > 0 && children}
//   </section>
// );

// const PharmacistDashboardPage = () => {
//   const { t } = useTranslation();

//   const fetchIssued = useCallback(
//     ({ signal }) => getPrescriptionsByStatus("ISSUED", { signal }),
//     [],
//   );

//   const fetchLowStock = useCallback(
//     ({ signal }) => getLowStockMedicines({ signal }),
//     [],
//   );

//   const fetchNearExpiry = useCallback(
//     ({ signal }) => getNearExpiryMedicines({ signal }),
//     [],
//   );

//   const prescriptions = useDashboardResource(fetchIssued);
//   const lowStock = useDashboardResource(fetchLowStock);
//   const nearExpiry = useDashboardResource(fetchNearExpiry);

//   return (
//     <main className="space-y-6 p-4 sm:p-6">
//       <header>
//         <h1 className="text-2xl font-bold text-gray-900">
//           PharmacistDashboardPage
//         </h1>
//         <p className="mt-1 text-sm text-gray-600">
//           {t("pharmacistDashboard.subtitle")}
//         </p>
//       </header>
//       <div className="flex flex-wrap gap-3">
//         <Link
//           to="/pharmacist/add-medicine"
//           className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
//         >
//           Add Medicine
//         </Link>

//         <Link
//           to="/pharmacist/inventory"
//           className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
//         >
//           View Inventory
//         </Link>
//       </div>

//       <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
//         <StatCard
//           label={t("pharmacistDashboard.issuedPrescriptions")}
//           value={
//             prescriptions.loading || prescriptions.error
//               ? "—"
//               : prescriptions.data.length
//           }
//         />
//         <StatCard
//           label={t("pharmacistDashboard.lowStock")}
//           value={
//             lowStock.loading || lowStock.error ? "—" : lowStock.data.length
//           }
//         />
//         <StatCard
//           label={t("pharmacistDashboard.nearExpiry")}
//           value={
//             nearExpiry.loading || nearExpiry.error
//               ? "—"
//               : nearExpiry.data.length
//           }
//         />
//       </div>

//       <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
//         <DashboardSection
//           title={t("pharmacistDashboard.issuedPrescriptions")}
//           {...prescriptions}
//           emptyTitle={t("pharmacistDashboard.noPrescriptions")}
//           emptyMessage={t("pharmacistDashboard.noPrescriptionsMessage")}
//         >
//           <ul className="divide-y divide-gray-100">
//             {prescriptions.data.map((prescription) => (
//               <li
//                 key={prescription.prescriptionId}
//                 className="py-3 first:pt-0 last:pb-0"
//               >
//                 <p className="font-medium text-gray-900">
//                   {t("pharmacistDashboard.prescriptionNumber", {
//                     id: prescription.prescriptionId,
//                   })}
//                 </p>
//                 <p className="mt-1 text-sm text-gray-600">
//                   {t("pharmacistDashboard.patientId")}:{" "}
//                   {prescription.patientId ?? "—"}
//                 </p>
//                 <p className="text-sm text-gray-600">
//                   {t("pharmacistDashboard.date")}:{" "}
//                   {prescription.date ?? prescription.createdAt ?? "—"}
//                 </p>
//               </li>
//             ))}
//           </ul>
//         </DashboardSection>

//         <DashboardSection
//           title={t("pharmacistDashboard.lowStock")}
//           {...lowStock}
//           emptyTitle={t("pharmacistDashboard.noLowStock")}
//           emptyMessage={t("pharmacistDashboard.noLowStockMessage")}
//         >
//           <ul className="divide-y divide-gray-100">
//             {lowStock.data.map((medicine, index) => (
//               <li
//                 key={medicine.medicineId ?? medicine.id ?? index}
//                 className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
//               >
//                 <span className="font-medium text-gray-900">
//                   {medicineName(medicine)}
//                 </span>
//                 <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
//                   {t("pharmacistDashboard.stock")}:{" "}
//                   {medicine.stockQuantity ?? medicine.quantity ?? "—"}
//                 </span>
//               </li>
//             ))}
//           </ul>
//         </DashboardSection>

//         <DashboardSection
//           title={t("pharmacistDashboard.nearExpiry")}
//           {...nearExpiry}
//           emptyTitle={t("pharmacistDashboard.noNearExpiry")}
//           emptyMessage={t("pharmacistDashboard.noNearExpiryMessage")}
//         >
//           <ul className="divide-y divide-gray-100">
//             {nearExpiry.data.map((medicine, index) => (
//               <li
//                 key={medicine.medicineId ?? medicine.id ?? index}
//                 className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
//               >
//                 <span className="font-medium text-gray-900">
//                   {medicineName(medicine)}
//                 </span>
//                 <span className="shrink-0 text-sm text-gray-600">
//                   {medicine.expiryDate ?? "—"}
//                 </span>
//               </li>
//             ))}
//           </ul>
//         </DashboardSection>
//       </div>
//     </main>
//   );
// };

// export default PharmacistDashboardPage;

import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatCard from "../../components/StatCard";
import { getPrescriptionsByStatus } from "../../services/prescriptionService";
import {
  getLowStockMedicines,
  getNearExpiryMedicines,
} from "../../services/medicineService";

/* ----------------------------- resource hook ---------------------------- */

const useDashboardResource = (fetchData) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const result = await fetchData({ signal: controller.signal });
        if (!controller.signal.aborted) setData(result);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [fetchData, attempt]);

  return { data, loading, error, retry };
};

/* -------------------------------- helpers ------------------------------- */

const medicineName = (medicine) =>
  medicine.medicineName ??
  medicine.name ??
  medicine.genericName ??
  `Medicine #${medicine.medicineId ?? medicine.id ?? "—"}`;

const medicineStock = (medicine) =>
  Number(medicine.stockQuantity ?? medicine.quantity ?? 0);

const medicineReorder = (medicine) => Number(medicine.reorderLevel ?? 0);

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const truncate = (str, max = 40) =>
  str.length > max ? `${str.slice(0, max - 1)}…` : str;

/* ------------------------------ UI atoms -------------------------------- */

const SectionShell = ({
  title,
  count,
  loading,
  error,
  retry,
  emptyTitle,
  emptyMessage,
  actionTo,
  actionLabel,
  children,
}) => (
  <section
    role="region"
    aria-labelledby={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
    className="flex flex-col rounded-2xl border border-neutral-200 bg-white shadow-xs"
  >
    <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3.5">
      <div className="flex items-center gap-2">
        <h2
          id={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
          className="text-base font-semibold text-neutral-900"
        >
          {title}
        </h2>
        {!loading && !error && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
            {count}
          </span>
        )}
      </div>
      {actionTo && (
        <Link
          to={actionTo}
          className="text-xs font-medium text-primary-700 hover:text-primary-800 hover:underline"
        >
          {actionLabel ?? "View all"} →
        </Link>
      )}
    </div>

    <div className="flex-1 p-5">
      {loading && (
        <div className="py-4">
          <LoadingSpinner label={`Loading ${title.toLowerCase()}...`} />
        </div>
      )}

      {error && (
        <div>
          <ErrorMessage
            title="Unable to load data"
            message="Please check your connection and try again."
          />
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && count === 0 && (
        <EmptyState title={emptyTitle} description={emptyMessage} />
      )}

      {!loading && !error && count > 0 && children}
    </div>
  </section>
);

const StockMeter = ({ stock, reorder }) => {
  const max = Math.max(reorder * 2, stock, 1);
  const pct = Math.min(100, Math.round((stock / max) * 100));
  const tone =
    stock === 0
      ? "bg-red-500"
      : stock <= reorder
        ? "bg-amber-500"
        : "bg-green-500";
  return (
    <div
      className="mt-1.5 h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-neutral-100"
      aria-hidden="true"
    >
      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const ExpiryBadge = ({ days }) => {
  if (days == null)
    return (
      <span className="shrink-0 text-xs text-neutral-500">No expiry date</span>
    );
  if (days < 0)
    return (
      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
        Expired
      </span>
    );
  const tone =
    days <= 7
      ? "bg-red-100 text-red-800"
      : days <= 30
        ? "bg-orange-100 text-orange-800"
        : "bg-neutral-100 text-neutral-700";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}
    >
      {days === 0 ? "Expires today" : `${days}d left`}
    </span>
  );
};

/* ------------------------------- main page ------------------------------ */

const PharmacistDashboardPage = () => {
  const { t } = useTranslation();

  const fetchIssued = useCallback(
    ({ signal }) => getPrescriptionsByStatus("ISSUED", { signal }),
    [],
  );
  const fetchLowStock = useCallback(
    ({ signal }) => getLowStockMedicines({ signal }),
    [],
  );
  const fetchNearExpiry = useCallback(
    ({ signal }) => getNearExpiryMedicines({ signal }),
    [],
  );

  const prescriptions = useDashboardResource(fetchIssued);
  const lowStock = useDashboardResource(fetchLowStock);
  const nearExpiry = useDashboardResource(fetchNearExpiry);

  const pendingCount =
    prescriptions.loading || prescriptions.error
      ? null
      : prescriptions.data.length;
  const lowStockCount =
    lowStock.loading || lowStock.error ? null : lowStock.data.length;
  const nearExpiryCount =
    nearExpiry.loading || nearExpiry.error ? null : nearExpiry.data.length;

  const anyAttention =
    (lowStockCount ?? 0) > 0 || (nearExpiryCount ?? 0) > 0;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      {/* header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            {t("pharmacistDashboard.title", "Pharmacist Dashboard")}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {t("pharmacistDashboard.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/pharmacist/add-medicine"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">+</span>
            {t("pharmacistDashboard.addMedicine", "Add Medicine")}
          </Link>
          <Link
            to="/pharmacist/inventory"
            className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            {t("pharmacistDashboard.viewInventory", "View Inventory")}
          </Link>
        </div>
      </header>

      {/* attention banner */}
      {anyAttention && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-lg leading-none">
              ⚠️
            </span>
            <p className="text-sm text-amber-900">
              <strong className="font-semibold">Attention required.</strong>{" "}
              {(lowStockCount ?? 0) > 0 && (
                <>
                  {lowStockCount} medicine
                  {lowStockCount === 1 ? "" : "s"} low on stock
                </>
              )}
              {(lowStockCount ?? 0) > 0 && (nearExpiryCount ?? 0) > 0 && " and "}
              {(nearExpiryCount ?? 0) > 0 && (
                <>
                  {nearExpiryCount} nearing expiry
                </>
              )}
              .
            </p>
          </div>
          <Link
            to="/pharmacist/inventory"
            className="shrink-0 self-start rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 sm:self-auto"
          >
            Review inventory →
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/pharmacist/dispensing" className="block">
          <StatCard
            label={t("pharmacistDashboard.issuedPrescriptions")}
            value={pendingCount ?? "—"}
          />
        </Link>
        <Link to="/pharmacist/inventory?filter=low" className="block">
          <StatCard
            label={t("pharmacistDashboard.lowStock")}
            value={lowStockCount ?? "—"}
          />
        </Link>
        <Link to="/pharmacist/inventory?filter=near" className="block">
          <StatCard
            label={t("pharmacistDashboard.nearExpiry")}
            value={nearExpiryCount ?? "—"}
          />
        </Link>
      </div>

      {/* content grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* pending prescriptions — wide */}
        <div className="xl:col-span-3">
          <SectionShell
            title={t("pharmacistDashboard.issuedPrescriptions")}
            count={prescriptions.data.length}
            loading={prescriptions.loading}
            error={prescriptions.error}
            retry={prescriptions.retry}
            emptyTitle={t("pharmacistDashboard.noPrescriptions")}
            emptyMessage={t("pharmacistDashboard.noPrescriptionsMessage")}
            actionTo="/pharmacist/dispensing"
            actionLabel={t("pharmacistDashboard.openQueue", "Open queue")}
          >
            <ul className="divide-y divide-neutral-100">
              {prescriptions.data.slice(0, 5).map((p) => (
                <li key={p.prescriptionId}>
                  <Link
                    to={`/pharmacist/dispensing`}
                    className="group flex items-center justify-between gap-3 rounded-lg py-3 first:pt-0 last:pb-0 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900">
                        {t("pharmacistDashboard.prescriptionNumber", {
                          id: p.prescriptionId,
                        })}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-neutral-600">
                        {t("pharmacistDashboard.patientId")}:{" "}
                        {p.patientId ?? "—"} ·{" "}
                        {formatDate(p.date ?? p.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-primary-700 opacity-0 transition group-hover:opacity-100">
                      {t("pharmacistDashboard.dispense", "Dispense")} →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionShell>
        </div>

        {/* low stock */}
        <SectionShell
          title={t("pharmacistDashboard.lowStock")}
          count={lowStock.data.length}
          loading={lowStock.loading}
          error={lowStock.error}
          retry={lowStock.retry}
          emptyTitle={t("pharmacistDashboard.noLowStock")}
          emptyMessage={t("pharmacistDashboard.noLowStockMessage")}
          actionTo="/pharmacist/inventory?filter=low"
        >
          <ul className="divide-y divide-neutral-100">
            {lowStock.data.slice(0, 6).map((medicine, index) => {
              const stock = medicineStock(medicine);
              const reorder = medicineReorder(medicine);
              return (
                <li
                  key={medicine.medicineId ?? medicine.id ?? index}
                  className="py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className="truncate font-medium text-neutral-900"
                        title={medicineName(medicine)}
                      >
                        {truncate(medicineName(medicine), 36)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Reorder at {reorder || "—"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        stock === 0
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {stock} left
                    </span>
                  </div>
                  <StockMeter stock={stock} reorder={reorder} />
                </li>
              );
            })}
          </ul>
        </SectionShell>

        {/* near expiry */}
        <SectionShell
          title={t("pharmacistDashboard.nearExpiry")}
          count={nearExpiry.data.length}
          loading={nearExpiry.loading}
          error={nearExpiry.error}
          retry={nearExpiry.retry}
          emptyTitle={t("pharmacistDashboard.noNearExpiry")}
          emptyMessage={t("pharmacistDashboard.noNearExpiryMessage")}
          actionTo="/pharmacist/inventory?filter=near"
        >
          <ul className="divide-y divide-neutral-100">
            {nearExpiry.data.slice(0, 6).map((medicine, index) => {
              const days = daysUntil(medicine.expiryDate);
              return (
                <li
                  key={medicine.medicineId ?? medicine.id ?? index}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p
                      className="truncate font-medium text-neutral-900"
                      title={medicineName(medicine)}
                    >
                      {truncate(medicineName(medicine), 36)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatDate(medicine.expiryDate)}
                    </p>
                  </div>
                  <ExpiryBadge days={days} />
                </li>
              );
            })}
          </ul>
        </SectionShell>

        {/* quick actions */}
        <SectionShell
          title={t("pharmacistDashboard.quickActions", "Quick actions")}
          count={0}
          loading={false}
          error={false}
          retry={() => {}}
          emptyTitle=""
          emptyMessage=""
        >
          <div className="grid gap-2">
            <Link
              to="/pharmacist/dispensing"
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-800 hover:border-primary-300 hover:bg-primary-50"
            >
              <span>{t("pharmacistDashboard.openQueue")}</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              to="/pharmacist/inventory"
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-800 hover:border-primary-300 hover:bg-primary-50"
            >
              <span>{t("pharmacistDashboard.viewInventory")}</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              to="/pharmacist/add-medicine"
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-800 hover:border-primary-300 hover:bg-primary-50"
            >
              <span>{t("pharmacistDashboard.addMedicine")}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </SectionShell>
      </div>
    </main>
  );
};

export default PharmacistDashboardPage;