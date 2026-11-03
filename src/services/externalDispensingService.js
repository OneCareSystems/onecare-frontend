import apiClient from "./apiClient";
import { positiveId } from "../utils/adminWorkflows";

const API_PATH = "/external-dispensing";

/**
 * Validate the standard API response envelope.
 */
const unwrapResponse = (response, fallbackMessage) => {
  const payload = response?.data;

  if (payload?.success !== true || payload.data == null) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload.data;
};

/**
 * Create an external dispensing record.
 *
 * verificationMethod: PHONE | CLINIC_ID
 * deliveryMethod: PICK_UP | DELIVERY
 */
export const createExternalDispensing = async (
  {
    prescriptionId,
    patientId,
    verificationMethod = "PHONE",
    deliveryMethod = "PICK_UP",
    items,
  },
  { signal } = {},
) => {
  const optionalId = (value) =>
    value == null || value === "" ? null : Number(positiveId(value));

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one medicine item is required.");
  }

  const response = await apiClient.post(
    API_PATH,
    {
      prescriptionId: optionalId(prescriptionId),
      patientId: optionalId(patientId),
      verificationMethod,
      deliveryMethod,
      items: items.map((item) => ({
        medicineId: item.medicineId ?? null,
        prescriptionItemId: item.prescriptionItemId ?? null,
        quantity: Number(item.quantity),
        medicineName: item.medicineName ?? null,
      })),
    },
    { signal },
  );

  return unwrapResponse(
    response,
    "Unable to create the external dispensing record.",
  );
};

/**
 * Fetch one external dispensing record.
 */
export const getExternalDispensingById = async (
  dispenseId,
  { signal } = {},
) => {
  if (dispenseId == null) {
    throw new Error("Dispensing record ID is required.");
  }

  const response = await apiClient.get(
    `${API_PATH}/${encodeURIComponent(dispenseId)}`,
    { signal },
  );

  return unwrapResponse(
    response,
    "Unable to retrieve the external dispensing record.",
  );
};

export const listExternalDispensing = async ({ signal } = {}) => {
  const response = await apiClient.get(API_PATH, { signal });
  const records = unwrapResponse(
    response,
    "Unable to retrieve dispensing history.",
  );
  if (!Array.isArray(records))
    throw new Error("Unexpected dispensing history response format");
  return records;
};

/**
 * Request identity verification from the backend.
 *
 * Important: the current backend does not validate the actual
 * phone number or clinic ID supplied by the user.
 */
export const verifyExternalDispensingIdentity = async (
  dispenseId,
  { verificationMethod, verified = true, notes },
  { signal } = {},
) => {
  if (dispenseId == null) {
    throw new Error("Dispensing record ID is required.");
  }

  if (!["PHONE", "CLINIC_ID"].includes(verificationMethod)) {
    throw new Error("Choose Phone or Clinic ID verification.");
  }

  const response = await apiClient.post(
    `${API_PATH}/${encodeURIComponent(dispenseId)}/verify-identity`,
    {
      verificationMethod,
      verified,
      notes: notes ?? null,
    },
    { signal },
  );

  return unwrapResponse(
    response,
    "Identity verification failed. Please verify and try again.",
  );
};

/**
 * Complete external dispensing after successful backend verification.
 */
export const completeExternalDispensing = async (
  dispenseId,
  { signal } = {},
) => {
  if (dispenseId == null) {
    throw new Error("Dispensing record ID is required.");
  }

  const response = await apiClient.post(
    `${API_PATH}/${encodeURIComponent(dispenseId)}/complete`,
    undefined,
    { signal },
  );

  return unwrapResponse(response, "Unable to complete external dispensing.");
};

const externalDispensingService = {
  createExternalDispensing,
  getExternalDispensingById,
  listExternalDispensing,
  verifyExternalDispensingIdentity,
  completeExternalDispensing,
};

export default externalDispensingService;
