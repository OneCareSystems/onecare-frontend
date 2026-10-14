import apiClient from "./apiClient";

export const adaptAppointmentsResponse = (payload) => {
  if (payload?.success !== true || !Array.isArray(payload.data)) {
    throw new Error("Unexpected appointments response format");
  }

  return payload.data.filter(
    (record) =>
      record &&
      (typeof record.appointmentId === "string" ||
        typeof record.appointmentId === "number"),
  );
};

export const getAppointments = async ({ signal } = {}) => {
  const response = await apiClient.get("/appointments", { signal });
  return adaptAppointmentsResponse(response.data);
};

/** Resolve one appointment from the doctor's list; `null` when unknown. */
export const findAppointment = async (appointmentId, { signal } = {}) => {
  const appointments = await getAppointments({ signal });
  const match = appointments.find(
    (record) => String(record.appointmentId) === String(appointmentId),
  );
  return match ?? null;
};

/*
 * Clinical-notes endpoints below come from the backend branch
 * `fix/44/align-clinical-notes` (clinical notes moved from the prescription
 * onto the appointment entity). That branch is NOT merged into develop yet —
 * until it lands, `saveClinicalNotes` is a silent no-op against a develop
 * backend (the unknown `clinicalNotes` key is ignored) and the two read
 * endpoints answer 404. The UI treats read failures as "no notes available".
 */

/** `AppointmentClinicalNotesResponse` for GET /appointments/{id}/clinical-notes. */
export const adaptClinicalNotesResponse = (payload) => {
  const data = payload?.data;
  if (
    payload?.success !== true ||
    !data ||
    (typeof data.appointmentId !== "string" &&
      typeof data.appointmentId !== "number")
  ) {
    throw new Error("Unexpected clinical notes response format");
  }
  return {
    appointmentId: data.appointmentId,
    patientId: data.patientId ?? null,
    doctorId: data.doctorId ?? null,
    clinicalNotes:
      typeof data.clinicalNotes === "string" ? data.clinicalNotes : "",
  };
};

export const getClinicalNotes = async (appointmentId, { signal } = {}) => {
  const response = await apiClient.get(
    `/appointments/${appointmentId}/clinical-notes`,
    { signal },
  );
  return adaptClinicalNotesResponse(response.data);
};

/**
 * Save the appointment's clinical notes (doctor-only, max 2000 chars;
 * the backend rejects saves on CANCELLED appointments with HTTP 400).
 * `PUT /api/appointments/{id}` treats every field as optional — sending
 * only `clinicalNotes` leaves date/reason/doctor untouched.
 */
export const saveClinicalNotes = async (
  appointmentId,
  clinicalNotes,
  { signal } = {},
) => {
  const response = await apiClient.put(
    `/appointments/${appointmentId}`,
    { clinicalNotes },
    { signal },
  );
  return response.data;
};

/** `PatientHistoryResponse`: previous appointments (with notes) + prescriptions. */
export const adaptPatientHistoryResponse = (payload) => {
  const data = payload?.data;
  if (payload?.success !== true || !data || data.patientId === undefined) {
    throw new Error("Unexpected patient history response format");
  }
  return {
    patientId: data.patientId,
    appointments: Array.isArray(data.appointments) ? data.appointments : [],
    prescriptions: Array.isArray(data.prescriptions) ? data.prescriptions : [],
  };
};

export const getPatientHistory = async (patientId, { signal } = {}) => {
  const response = await apiClient.get(
    `/appointments/patient/${patientId}/history`,
    { signal },
  );
  return adaptPatientHistoryResponse(response.data);
};

export default {
  getAppointments,
  findAppointment,
  getClinicalNotes,
  saveClinicalNotes,
  getPatientHistory,
};
