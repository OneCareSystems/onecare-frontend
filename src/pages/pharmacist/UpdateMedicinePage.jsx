
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MedicineForm from "../../components/Pharmacist/MedicineForm";
import {
  deactivateMedicine,
  getMedicineById,
  updateMedicine,
} from "../../services/medicineService";

const UpdateMedicinePage = () => {
  const { medicineId } = useParams();
  const navigate = useNavigate();

  const [medicine, setMedicine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const inFlight = useRef(false);

  const loadMedicine = useCallback(async (signal) => {
    try {
      const result = await getMedicineById(medicineId);

      if (signal?.aborted) return;

      setMedicine({
        ...result,
        name: result.name ?? result.medicineName ?? "",
        genericName: result.genericName ?? "",
        category: result.category ?? "",
        unit: result.unit ?? "",
        price: result.price ?? "",
        expiryDate: String(result.expiryDate ?? "").slice(0, 10),
        reorderLevel: result.reorderLevel ?? "",
        stockQuantity: result.stockQuantity ?? 0,
      });
    } catch (error) {
      if (signal?.aborted) return;

      const status = error?.response?.status;

      if (status === 404) {
        setServerError("Medicine not found. It may have been removed.");
      } else if (status === 403) {
        setServerError("You do not have permission to view this medicine.");
      } else {
        setServerError("Unable to load medicine details. Please try again.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [medicineId]);

 useEffect(() => {
  const controller = new AbortController();

  const fetchMedicine = async () => {
    try {
      await loadMedicine(controller.signal);
    } catch {
      // loadMedicine handles and displays request errors.
    }
  };

  void fetchMedicine();

  return () => controller.abort();
}, [loadMedicine]);

  const handleUpdate = async (values) => {
    if (inFlight.current) return;

    inFlight.current = true;
    setSaving(true);
    setServerError("");
    setSuccessMessage("");

    try {
      const updated = await updateMedicine(medicineId, values);

      setMedicine((current) => ({
        ...current,
        ...updated,
        name: updated.name ?? updated.medicineName ?? values.name,
        stockQuantity: current.stockQuantity,
      }));

      setSuccessMessage("Medicine details updated successfully.");
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      if (status === 409) {
        setServerError(
          message || "These changes conflict with existing medicine records.",
        );
      } else if (status === 400 || status === 422) {
        setServerError(message || "Please check the medicine details.");
      } else if (status === 403) {
        setServerError("You do not have permission to update this medicine.");
      } else if (status === 404) {
        setServerError("Medicine not found. It may have been removed.");
      } else {
        setServerError("Unable to update medicine. Your form data is preserved. Please try again.");
      }
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      `Deactivate "${medicine?.name ?? medicine?.medicineName}"? It will no longer be available for prescribing.`,
    );

    if (!confirmed || inFlight.current) return;

    inFlight.current = true;
    setDeactivating(true);
    setServerError("");
    setSuccessMessage("");

    try {
      await deactivateMedicine(medicineId);
      navigate("/pharmacist/inventory", {
        replace: true,
        state: { successMessage: "Medicine deactivated successfully." },
      });
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      if (status === 409) {
        setServerError(
          message ||
            "This medicine has pending prescriptions and cannot be deactivated yet.",
        );
      } else if (status === 403) {
        setServerError("You do not have permission to deactivate this medicine.");
      } else if (status === 404) {
        setServerError("Medicine not found. It may already be inactive.");
      } else {
        setServerError("Unable to deactivate medicine. Please try again.");
      }
    } finally {
      inFlight.current = false;
      setDeactivating(false);
    }
  };

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          Update Medicine
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Update medicine details or deactivate a medicine. Stock must be
          changed separately through Inventory Management.
        </p>
      </header>

      <Link
        to="/pharmacist/inventory"
        className="inline-block text-sm font-medium text-primary-700 hover:underline"
      >
        &larr; Back to inventory
      </Link>

      {loading ? (
        <p role="status" className="rounded-lg border border-gray-200 p-5">
          Loading medicine details...
        </p>
      ) : serverError && !medicine ? (
        <section className="space-y-4 rounded-lg border border-red-200 p-5">
          <p role="alert" className="text-sm text-red-700">
            {serverError}
          </p>
          <button
            type="button"
          onClick={() => {
  setLoading(true);
  setServerError("");
  loadMedicine();
}}
            className="rounded-md border border-gray-300 px-4 py-2"
          >
            Try again
          </button>
        </section>
      ) : medicine ? (
        <>
          {successMessage && (
            <p
              role="status"
              className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
            >
              {successMessage}
            </p>
          )}

          <section className="max-w-4xl rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
            <MedicineForm
              key={medicineId}
              initialValues={medicine}
              mode="edit"
              onSubmit={handleUpdate}
              saving={saving || deactivating}
              serverError={serverError}
              onClearServerError={() => setServerError("")}
              submitLabel="Update medicine"
            />
          </section>

          <section className="max-w-4xl space-y-3 rounded-xl border border-red-200 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Deactivate medicine
            </h2>
            <p className="text-sm text-gray-600">
              Deactivation should remove the medicine from prescribable lists.
              If pending prescriptions prevent deactivation, the server error
              will be displayed above.
            </p>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={saving || deactivating}
              className="rounded-md border border-red-300 px-4 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deactivating ? "Deactivating..." : "Deactivate medicine"}
            </button>
          </section>
        </>
      ) : null}
    </main>
  );
};

export default UpdateMedicinePage;
