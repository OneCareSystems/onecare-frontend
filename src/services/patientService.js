import apiClient from "./apiClient";

export const adaptPatientResponse = (payload) => {
  const patient = payload?.data;
  if (
    payload?.success !== true ||
    !patient ||
    (typeof patient.patientId !== "string" &&
      typeof patient.patientId !== "number")
  ) {
    throw new Error("Unexpected patient response format");
  }
  return {
    patientId: patient.patientId,
    fullName:
      typeof patient.fullName === "string" && patient.fullName.trim().length > 0
        ? patient.fullName
        : `Patient ${patient.patientId}`,
  };
};

export const getPatient = async (patientId, { signal } = {}) => {
  // API_BASE_URL already includes the `/api` prefix.
  const response = await apiClient.get(`/patients/${patientId}`, { signal });
  return adaptPatientResponse(response.data);
};

export const adaptPatientsResponse = (payload) => {
  if (payload?.success !== true || !Array.isArray(payload.data)) {
    throw new Error("Unexpected patients response format");
  }

  return payload.data
    .filter(
      (patient) =>
        patient &&
        patient.patientId !== null &&
        patient.patientId !== undefined,
    )
    .map((patient) => ({
      patientId: patient.patientId,
      fullName:
        typeof patient.fullName === "string" &&
        patient.fullName.trim().length > 0
          ? patient.fullName
          : `Patient ${patient.patientId}`,
    }));
};

export const getPatients = async ({ signal } = {}) => {
  // API_BASE_URL already includes the `/api` prefix.
  const response = await apiClient.get("/patients", { signal });
  return adaptPatientsResponse(response.data);
};

// Explicit allowlists keep clinical fields out of the registration workflow.
export const createPatient = async (values) => {
  const body = {
    full_name: values.full_name,
    dateOfBirth: values.dateOfBirth,
    contactNo: values.contactNo,
    address: values.address || null,
    email: values.email || null,
    gender: values.gender || null,
  };
  const response = await apiClient.post("/patients", body);
  const patient = adaptPatientResponse(response.data);
  return {
    ...patient,
    duplicateSuspected: response.data.data.duplicateSuspected === true,
  };
};

export default { getPatient, getPatients, createPatient };
