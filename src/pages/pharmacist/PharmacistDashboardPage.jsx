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
        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => controller.abort();
  }, [fetchData, attempt]);

  return { data, loading, error, retry };
};

const medicineName = (medicine) =>
  medicine.medicineName ??
  medicine.name ??
  medicine.genericName ??
  `Medicine #${medicine.medicineId ?? medicine.id ?? "—"}`;

const DashboardSection = ({
  title,
  data,
  loading,
  error,
  retry,
  emptyTitle,
  emptyMessage,
  children,
}) => (
  <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {!loading && !error && (
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {data.length}
        </span>
      )}
    </div>

    {loading && <LoadingSpinner label={`Loading ${title.toLowerCase()}...`} />}

    {error && (
  <div>
    <ErrorMessage
      title="Unable to load data"
      message="Please check your connection and try again."
    />
    <button
      type="button"
      onClick={retry}
      className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
    >
      Retry
    </button>
  </div>
)}
     {!loading && !error && data.length === 0 && (
      <EmptyState title={emptyTitle} description={emptyMessage} />
    )}

    {!loading && !error && data.length > 0 && children}
  </section>
);

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

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          PharmacistDashboardPage
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {t("pharmacistDashboard.subtitle")}
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
  <Link
    to="/pharmacist/add-medicine"
    className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
  >
    Add Medicine
  </Link>

  <Link
    to="/pharmacist/inventory"
    className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
  >
    View Inventory
  </Link>
</div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label={t("pharmacistDashboard.issuedPrescriptions")}
          value={
            prescriptions.loading || prescriptions.error
              ? "—"
              : prescriptions.data.length
          }
        />
        <StatCard
          label={t("pharmacistDashboard.lowStock")}
          value={
            lowStock.loading || lowStock.error
              ? "—"
              : lowStock.data.length
          }
        />
        <StatCard
          label={t("pharmacistDashboard.nearExpiry")}
          value={
            nearExpiry.loading || nearExpiry.error
              ? "—"
              : nearExpiry.data.length
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardSection
          title={t("pharmacistDashboard.issuedPrescriptions")}
          {...prescriptions}
          emptyTitle={t("pharmacistDashboard.noPrescriptions")}
          emptyMessage={t("pharmacistDashboard.noPrescriptionsMessage")}
        >
          <ul className="divide-y divide-gray-100">
            {prescriptions.data.map((prescription) => (
              <li
                key={prescription.prescriptionId}
                className="py-3 first:pt-0 last:pb-0"
              >
                <p className="font-medium text-gray-900">
                  {t("pharmacistDashboard.prescriptionNumber", {
                    id: prescription.prescriptionId,
                  })}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {t("pharmacistDashboard.patientId")}:{" "}
                  {prescription.patientId ?? "—"}
                </p>
                <p className="text-sm text-gray-600">
                  {t("pharmacistDashboard.date")}:{" "}
                  {prescription.date ?? prescription.createdAt ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        </DashboardSection>

        <DashboardSection
          title={t("pharmacistDashboard.lowStock")}
          {...lowStock}
          emptyTitle={t("pharmacistDashboard.noLowStock")}
          emptyMessage={t("pharmacistDashboard.noLowStockMessage")}
        >
          <ul className="divide-y divide-gray-100">
            {lowStock.data.map((medicine, index) => (
              <li
                key={medicine.medicineId ?? medicine.id ?? index}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="font-medium text-gray-900">
                  {medicineName(medicine)}
                </span>
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                  {t("pharmacistDashboard.stock")}:{" "}
                  {medicine.stockQuantity ?? medicine.quantity ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </DashboardSection>

        <DashboardSection
          title={t("pharmacistDashboard.nearExpiry")}
          {...nearExpiry}
          emptyTitle={t("pharmacistDashboard.noNearExpiry")}
          emptyMessage={t("pharmacistDashboard.noNearExpiryMessage")}
        >
          <ul className="divide-y divide-gray-100">
            {nearExpiry.data.map((medicine, index) => (
              <li
                key={medicine.medicineId ?? medicine.id ?? index}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="font-medium text-gray-900">
                  {medicineName(medicine)}
                </span>
                <span className="shrink-0 text-sm text-gray-600">
                  {medicine.expiryDate ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </DashboardSection>
      </div>
    </main>
  );
};

export default PharmacistDashboardPage;
