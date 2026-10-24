import { useRef, useState } from "react";
import MedicineForm from "../../components/Pharmacist/MedicineForm";
import { createMedicine } from "../../services/medicineService";

const AddMedicinePage = () => {
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [createdMedicine, setCreatedMedicine] = useState(null);
  const inFlight = useRef(false);

  const handleCreateMedicine = async (values) => {
    if (inFlight.current) return;

    inFlight.current = true;
    setSaving(true);
    setServerError("");
    setCreatedMedicine(null);

    try {
      const medicine = await createMedicine(values);
      setCreatedMedicine(medicine);
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      if (status === 409) {
        setServerError(
          message || "A medicine with these details already exists. Check the inventory.",
        );
      } else if (status === 400 || status === 422) {
        setServerError(
          message || "The medicine details were rejected. Please check your entries.",
        );
      } else if (status === 403) {
        setServerError("You do not have permission to add medicines.");
      } else {
        setServerError("Unable to save the medicine. Please try again.");
      }
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Add New Medicine</h1>
        <p className="mt-1 text-sm text-gray-600">
          Enter medicine details to add it to the clinic inventory.
        </p>
      </header>

      {createdMedicine ? (
        <section
          role="status"
          className="space-y-4 rounded-xl border border-green-200 bg-white p-5"
        >
          <h2 className="text-lg font-semibold text-green-800">
            Medicine saved successfully
          </h2>
          <p className="text-sm text-gray-700">
            {createdMedicine.name ?? createdMedicine.medicineName} has been added.
            Initial stock is 0.
          </p>
          <button
            type="button"
            onClick={() => setCreatedMedicine(null)}
            className="rounded-md bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700"
          >
            Add another medicine
          </button>
        </section>
      ) : (
        <section className="max-w-4xl rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <MedicineForm
            onSubmit={handleCreateMedicine}
            saving={saving}
            serverError={serverError}
            onClearServerError={() => setServerError("")}
          />
        </section>
      )}
    </main>
  );
};

export default AddMedicinePage;