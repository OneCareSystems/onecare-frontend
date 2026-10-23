
import { useCallback, useEffect, useState } from "react";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import {
  adjustMedicineStock,
  getLowStockMedicines,
  getNearExpiryMedicines,
  searchMedicines,
} from "../../services/medicineService";

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

const InventoryManagementPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [adjustError, setAdjustError] = useState("");

  const loadMedicines = useCallback(async (signal) => {
    setLoading(true);
    setLoadError(false);

    try {
      let data;

      if (filter === "low") {
        data = await getLowStockMedicines({ signal });
      } else if (filter === "near") {
        data = await getNearExpiryMedicines({ signal });
      } else {
        data = await searchMedicines(search.trim(), { signal });
      }

      if (!signal.aborted) {
        setMedicines(data);
      }
    } catch {
      if (!signal.aborted) {
        setLoadError(true);
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [filter, search]);

 
useEffect(() => {
  const controller = new AbortController();

  Promise.resolve().then(() => {
    if (!controller.signal.aborted) {
      void loadMedicines(controller.signal);
    }
  });

  return () => controller.abort();
}, [loadMedicines, retry]);


  const visibleMedicines = medicines.filter((medicine) => {
    const name = getMedicineName(medicine).toLowerCase();
    const matchesSearch =
      name.includes(search.trim().toLowerCase()) ||
      String(getMedicineId(medicine) ?? "").includes(search.trim());

    if (filter === "all") return matchesSearch;

    if (filter === "low") return matchesSearch;

    if (filter === "near") return matchesSearch;

    return false;
  });

  const openAdjustment = (medicine) => {
    setSelectedMedicine(medicine);
    setDelta("");
    setReason("");
    setAdjustError("");
    setNotice("");
  };

  const submitAdjustment = async (event) => {
    event.preventDefault();
    setAdjustError("");
    setNotice("");

    const amount = Number(delta);
    const currentStock = getStock(selectedMedicine);

    if (!selectedMedicine) return;

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

    if (selectedMedicine.expiryDate && selectedMedicine.expiryDate < today()) {
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
        current.map((medicine) =>
          String(getMedicineId(medicine)) ===
          String(getMedicineId(updated))
            ? updated
            : medicine,
        ),
      );

      setSelectedMedicine(null);
      setDelta("");
      setReason("");
      setNotice(
        "Stock updated successfully. Note: the current backend does not save the adjustment reason.",
      );

      // Reload so low-stock and near-expiry lists reflect the new state.
      setRetry((value) => value + 1);
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

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          Inventory Management
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Review medicine stock, expiry dates, and inventory alerts.
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

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <label
              htmlFor="inventory-search"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Search medicines
            </label>
            <input
              id="inventory-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by medicine name or ID"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div>
            <label
              htmlFor="inventory-filter"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Filter inventory
            </label>
            <select
              id="inventory-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 sm:min-w-48"
            >
              <option value="all">All medicines</option>
              <option value="low">Low stock</option>
              <option value="near">Near expiry</option>
            </select>
          </div>
        </div>

        {loading && <LoadingSpinner label="Loading medicine inventory..." />}

        {loadError && (
          <div className="space-y-3">
            <ErrorMessage
              title="Unable to load inventory"
              message="Please check your connection and try again."
            />
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !loadError && visibleMedicines.length === 0 && (
          <EmptyState
            title="No medicines found"
            description="Try another search term or inventory filter."
          />
        )}

        {!loading && !loadError && visibleMedicines.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-700">
                  <th scope="col" className="px-4 py-3 font-semibold">Medicine</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Stock</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Reorder level</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Expiry date</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleMedicines.map((medicine) => {
                  const expiryDate = medicine.expiryDate;
                  const expired = Boolean(expiryDate && expiryDate < today());
                  const quarantined = medicine.isQuarantined === true;
                  const lowStock =
                    medicine.reorderLevel != null &&
                    getStock(medicine) <= Number(medicine.reorderLevel);
                  const nearExpiry =
                    Boolean(expiryDate) &&
                    expiryDate >= today() &&
                  expiryDate <= dateAfterDays(30);

                  return (
                    <tr key={getMedicineId(medicine)} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900">
                          {getMedicineName(medicine)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          ID: {getMedicineId(medicine) ?? "Unavailable"}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-900">
                        {getStock(medicine)}
                      </td>
                      <td className="px-4 py-4">
                        {medicine.reorderLevel ?? "Not set"}
                      </td>
                      <td className="px-4 py-4">
                        {expiryDate ?? "Not provided"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {expired && (
                            <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                              Expired — Unavailable
                            </span>
                          )}
                          {!expired && quarantined && (
                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                              Quarantined — Unavailable
                            </span>
                          )}
                          {!expired && !quarantined && lowStock && (
                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                              ⚠ Low stock
                            </span>
                          )}
                          {!expired && !quarantined && nearExpiry && (
                            <span className="inline-flex rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-900">
                              ⚠ Near expiry
                            </span>
                          )}
                          {!expired && !quarantined && !lowStock && !nearExpiry && (
                            <span className="text-gray-600">Available</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          disabled={expired || quarantined}
                          onClick={() => openAdjustment(medicine)}
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Adjust stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedMedicine && (
        <section
          aria-labelledby="stock-adjustment-heading"
          className="rounded-xl border border-gray-200 bg-white p-5"
        >
          <h2
            id="stock-adjustment-heading"
            className="text-lg font-semibold text-gray-900"
          >
            Adjust stock — {getMedicineName(selectedMedicine)}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Current stock: {getStock(selectedMedicine)}. Use a positive number
            to add stock or a negative number to remove stock.
          </p>

          <form onSubmit={submitAdjustment} className="mt-4 max-w-xl space-y-4">
            <div>
              <label
                htmlFor="stock-delta"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Stock change
              </label>
              <input
                id="stock-delta"
                type="number"
                step="1"
                value={delta}
                onChange={(event) => setDelta(event.target.value)}
                placeholder="Example: 10 or -5"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label
                htmlFor="stock-adjustment-reason"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Reason for adjustment
              </label>
              <textarea
                id="stock-adjustment-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                maxLength={250}
                required
                placeholder="Explain why the stock is changing"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <p className="mt-1 text-xs text-gray-500">
                The current backend does not store this reason yet.
              </p>
            </div>

            {adjustError && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {adjustError}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? "Updating..." : "Confirm adjustment"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelectedMedicine(null)}
                className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
};

export default InventoryManagementPage;
