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

export default { getAppointments, findAppointment };
