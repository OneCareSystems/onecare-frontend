
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

export default {
  searchMedicines,
  getLowStockMedicines,
  getNearExpiryMedicines,
  adjustMedicineStock,
};
