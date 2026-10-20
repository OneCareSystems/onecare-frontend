import apiClient from "./apiClient";

// Adjust the import above to match your existing API client.

export const getBackupSchedule = async () => {
  const response = await apiClient.get("/system/backup/schedule");

  // Assumes the standard ApiResponse wrapper:
  // { success, message, data: { dayOfMonth, executionTime, nextRunDate } }
  return response.data.data;
};

export const updateBackupSchedule = async (dayOfMonth) => {
  const response = await apiClient.put("/system/backup/schedule", {
    dayOfMonth,
  });

  return response.data.data;
};

export const getConsultationFee = async () => {
  const response = await apiClient.get("/system/settings/consultation-fee");
  return response.data.data;
};

export const updateConsultationFee = async (consultationFee) => {
  const response = await apiClient.put("/system/settings/consultation-fee", {
    consultationFee,
  });
  return response.data.data;
};
