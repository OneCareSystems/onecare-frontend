import apiClient from "./apiClient";

/**
 * Prescriptions API adapter for the `{ success, message, data }` envelope.
 * Verified contract: `POST /api/prescriptions` (Doctor only) creates a
 * prescription with one or more items in one transaction; status is always
 * set server-side to ISSUED. Clinical notes are deliberately NOT sent here —
 * on the `fix/44/align-clinical-notes` backend they moved onto the
 * appointment itself.
 *
 * Prescription items use the existing `EXTERNAL_PURCHASE` free-text shape
 * (`medicineName`, no `medicineId`). Catalog search supports name entry only.
 */
export const adaptPrescriptionResponse = (payload) => {
  const data = payload?.data;
  if (
    payload?.success !== true ||
    !data ||
    (typeof data.prescriptionId !== "string" &&
      typeof data.prescriptionId !== "number")
  ) {
    throw new Error("Unexpected prescription response format");
  }
  return {
    prescriptionId: data.prescriptionId,
    patientId: data.patientId ?? null,
    appointmentId: data.appointmentId ?? null,
    date: data.date ?? null,
    status: data.status ?? "ISSUED",
    items: Array.isArray(data.items) ? data.items : [],
    createdAt: data.createdAt ?? null,
  };
};

export const createPrescription = async (
  { patientId, appointmentId, items },
  { signal } = {},
) => {
  // API_BASE_URL already includes the `/api` prefix.
  const response = await apiClient.post(
    "/prescriptions",
    {
      patientId,
      appointmentId,
      // Free-text items only: the doctor role cannot browse the in-house
      // medicine catalog (no MEDICINE_READ), so no `medicineId` values.
      items: items.map((item) => ({
        itemType: "EXTERNAL_PURCHASE",
        medicineName: item.medicineName,
        dosage: item.dosage,
        frequency: item.frequency,
        durationDays: item.durationDays,
        quantity: item.quantity,
      })),
    },
    { signal },
  );
  return adaptPrescriptionResponse(response.data);
};

/** Fetch an issued prescription and its medicine items by ID. */
export const getPrescriptionById = async (prescriptionId, { signal } = {}) => {
  const response = await apiClient.get(`/prescriptions/${prescriptionId}`, { signal });
  return adaptPrescriptionResponse(response.data);
};

export default { createPrescription, getPrescriptionById };
