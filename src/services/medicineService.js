
import apiClient from "./apiClient";

const getMedicineList = async (path, signal) => {
  const response = await apiClient.get(path, { signal });
  const payload = response.data;

  if (payload?.success !== true || !Array.isArray(payload.data)) {
    throw new Error("Unexpected medicines response format");
  }

  return payload.data.filter(Boolean);
};

/** Search the medicine catalog by partial name or exact ID. */
export const searchMedicines = async (search, { signal } = {}) => {
  const response = await apiClient.get("/medicines", {
    params: search ? { search } : undefined,
    signal,
  });

  const payload = response.data;

  if (payload?.success !== true || !Array.isArray(payload.data)) {
    throw new Error("Unexpected medicines response format");
  }

  return payload.data.filter(
    (medicine) =>
      medicine &&
      typeof (medicine.name ?? medicine.medicineName) === "string",
  );
};

export const getLowStockMedicines = ({ signal } = {}) =>
  getMedicineList("/medicines/low-stock", signal);

export const getNearExpiryMedicines = ({ signal } = {}) =>
  getMedicineList("/medicines/near-expiry", signal);

/**
 * Apply a signed stock delta.
 * The current backend accepts delta only; it does not persist a reason yet.
 */
export const adjustMedicineStock = async (medicineId, delta) => {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error("Stock adjustment must be a non-zero whole number.");
  }

  const response = await apiClient.patch(
    `/medicines/${medicineId}/stock`,
    { delta },
  );

  const payload = response.data;

  if (payload?.success !== true || !payload.data) {
    throw new Error("Unexpected stock adjustment response format");
  }

  return payload.data;
};

export const createMedicine = async (medicine) => {
  const response = await apiClient.post("/medicines", {
    name: medicine.name.trim(),
    genericName: medicine.genericName.trim() || null,
    category: medicine.category.trim(),
    unit: medicine.unit.trim(),
    price: medicine.price.trim(),
    expiryDate: medicine.expiryDate,
    reorderLevel: Number(medicine.reorderLevel),
  });

  const payload = response.data;

  if (payload?.success !== true || !payload.data) {
    throw new Error("Unexpected medicine creation response format");
  }

  return payload.data;

};
/** Get a single medicine by ID. */
export const getMedicineById = async (medicineId) => {
  const response = await apiClient.get(
    `/medicines/${encodeURIComponent(medicineId)}`,
  );

  const payload = response.data;

  if (payload?.success !== true || !payload.data) {
    throw new Error("Unexpected medicine response format");
  }

  return payload.data;
};

/** Update non-stock medicine details only. */
export const updateMedicine = async (medicineId, medicine) => {
  const response = await apiClient.put(
    `/medicines/${encodeURIComponent(medicineId)}`,
    {
      name: medicine.name.trim(),
      genericName: medicine.genericName.trim() || null,
      category: medicine.category.trim(),
      unit: medicine.unit.trim(),
      price: Number(medicine.price),
      expiryDate: medicine.expiryDate,
      reorderLevel: Number(medicine.reorderLevel),
    },
  );

  const payload = response.data;

  if (payload?.success !== true || !payload.data) {
    throw new Error("Unexpected medicine update response format");
  }

  return payload.data;
};

/** Soft-deactivate a medicine through the API. */
export const deactivateMedicine = async (medicineId) => {
  const response = await apiClient.delete(
    `/medicines/${encodeURIComponent(medicineId)}`,
  );

  return response.data;
};

export default {
  searchMedicines,
  getLowStockMedicines,
  getNearExpiryMedicines,
  adjustMedicineStock,
  createMedicine,
  getMedicineById,
  updateMedicine,
  deactivateMedicine,
    
};
