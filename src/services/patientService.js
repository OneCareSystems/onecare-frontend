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

// Only documented create fields are sent; the result retains minimal identity.
export const createPatient = async (values) => {
  const body = {
    full_name: values.full_name,
    dateOfBirth: values.dateOfBirth,
    contactNo: values.contactNo,
    address: values.address || null,
    email: values.email || null,
    gender: values.gender || null,
    bloodGroup: values.bloodGroup || null,
  };
  const response = await apiClient.post("/patients", body);
  const patient = adaptPatientResponse(response.data);
  return {
    ...patient,
    duplicateSuspected: response.data.data.duplicateSuspected === true,
  };
};

export default { getPatient, getPatients, createPatient };

const patientPath = (id) => {
  if (
    !/^[1-9]\d*$/.test(String(id)) ||
    (typeof id === "number" && !Number.isSafeInteger(id))
  )
    throw new Error("Invalid patient ID");
  return `/patients/${id}`;
};

// Administrative demographic allowlist. Never spread a raw PatientResponse.
export const adaptPatientDemographics = (payload) => {
  const identity = adaptPatientResponse(payload);
  patientPath(identity.patientId);
  const patient = payload.data;
  const text = (key) => (typeof patient[key] === "string" ? patient[key] : "");
  return {
    ...identity,
    dateOfBirth: text("dateOfBirth"),
    contactNo: text("contactNo"),
    address: text("address"),
    email: text("email"),
    gender: text("gender"),
    isActive: patient.isActive === true,
  };
};

export const searchPatients = async ({
  search,
  page = 0,
  size = 10,
  signal,
}) => {
  const response = await apiClient.get("/patients", {
    params: { search, page, size, sort: "fullName,asc" },
    signal,
  });
  if (response.data?.success !== true || !Array.isArray(response.data.data))
    throw new Error("Unexpected patients response format");
  return response.data.data.map((patient) => {
    const safe = adaptPatientDemographics({ success: true, data: patient });
    return {
      patientId: safe.patientId,
      fullName: safe.fullName,
      contactNo: safe.contactNo,
      dateOfBirth: safe.dateOfBirth,
    };
  });
};
export const getPatientDemographics = async (id, { signal } = {}) => {
  const response = await apiClient.get(patientPath(id), { signal });
  return adaptPatientDemographics(response.data);
};
export const updatePatientDemographics = async (id, changes) => {
  const body = {};
  for (const field of [
    "full_name",
    "contactNo",
    "address",
    "email",
    "gender",
  ]) {
    if (
      changes[field] !== undefined &&
      changes[field] !== null &&
      !(field === "gender" && changes[field] === "")
    )
      body[field] = changes[field];
  }
  const response = await apiClient.put(patientPath(id), body);
  return adaptPatientDemographics(response.data);
};
