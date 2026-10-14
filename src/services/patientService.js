import apiClient from "./apiClient";

/**
 * Adapter for the patient directory envelope (`{ success, message, data }`
 * where `data` is a flat list of `PatientResponse` records). Used by the
 * doctor's schedule page only to label queue rows with a real name instead
 * of a bare id — never to invent clinical data.
 */
export const adaptPatientsResponse = (payload) => {
  if (payload?.success !== true || !Array.isArray(payload.data)) {
    throw new Error("Unexpected patients response format");
  }

  return payload.data
    .filter((patient) => patient && patient.id !== null && patient.id !== undefined)
    .map((patient) => ({
      id: patient.id,
      name:
        typeof patient.name === "string" && patient.name.trim().length > 0
          ? patient.name
          : `Patient ${patient.id}`,
    }));
};

export const getPatients = async ({ signal } = {}) => {
  // API_BASE_URL already includes the `/api` prefix.
  const response = await apiClient.get("/patients", { signal });
  return adaptPatientsResponse(response.data);
};

export default { getPatients };
