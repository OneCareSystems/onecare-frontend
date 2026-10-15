import apiClient from "./apiClient";

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
      medicine && typeof (medicine.medicineName ?? medicine.name) === "string",
  );
};

export default { searchMedicines };
