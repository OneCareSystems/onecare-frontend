import { TIME_PATTERN, normalizeTime } from "../constants/schedule";
import apiClient from "./apiClient";

const isValidSlot = (slot) =>
  slot &&
  typeof slot.start === "string" &&
  typeof slot.end === "string" &&
  TIME_PATTERN.test(slot.start) &&
  TIME_PATTERN.test(slot.end);

export const adaptDoctorScheduleResponse = (payload) => {
  const data = payload?.data;

  if (
    payload?.success !== true ||
    !data ||
    !["number", "string"].includes(typeof data.doctorId) ||
    !Array.isArray(data.days) ||
    data.days.length !== 7
  ) {
    throw new Error("Unexpected schedule response format");
  }

  const seenDays = new Set();

  const days = data.days.map((day) => {
    const dayOfWeek = String(day?.dayOfWeek ?? "")
      .trim()
      .toUpperCase();

    if (
      !dayOfWeek ||
      !Array.isArray(day.timeSlots) ||
      seenDays.has(dayOfWeek)
    ) {
      throw new Error("Unexpected schedule response format");
    }

    seenDays.add(dayOfWeek);

    if (!day.timeSlots.every(isValidSlot)) {
      throw new Error("Unexpected schedule response format");
    }

    return {
      dayOfWeek,
      timeSlots: day.timeSlots.map((slot) => ({
        start: normalizeTime(slot.start),
        end: normalizeTime(slot.end),
      })),
    };
  });

  return {
    doctorId: Number(data.doctorId),
    days,
  };
};

export const getDoctorSchedule = async (doctorId, { signal } = {}) => {
  const response = await apiClient.get(`/doctors/${doctorId}/schedule`, {
    signal,
  });

  return adaptDoctorScheduleResponse(response.data);
};

export const setDoctorSchedule = async (doctorId, { days }) => {
  if (!Array.isArray(days) || days.length !== 7) {
    throw new Error("Provide a schedule entry for every weekday");
  }

  const payload = {
    days: days.map((day) => ({
      dayOfWeek: String(day.dayOfWeek).trim().toUpperCase(),
      timeSlots: (day.timeSlots ?? []).map((slot) => ({
        start: normalizeTime(slot.start),
        end: normalizeTime(slot.end),
      })),
    })),
  };

  if (payload.days.some((day) => !Array.isArray(day.timeSlots))) {
    throw new Error("Every weekday must have a timeSlots array");
  }

  if (
    payload.days.some((day) =>
      day.timeSlots.some(
        (slot) =>
          !TIME_PATTERN.test(slot.start) ||
          !TIME_PATTERN.test(slot.end) ||
          slot.end <= slot.start,
      ),
    )
  ) {
    throw new Error("Time slots must use HH:mm and end after they start");
  }

  const uniqueDays = new Set(payload.days.map((day) => day.dayOfWeek));
  if (uniqueDays.size !== 7) {
    throw new Error("Each weekday must appear exactly once");
  }

  const response = await apiClient.put(
    `/doctors/${doctorId}/schedule`,
    payload,
  );

  return adaptDoctorScheduleResponse(response.data);
};

export const extractConflictSlots = (error) => {
  const slots = error?.response?.data?.data?.conflictingSlots;
  if (!Array.isArray(slots)) return null;

  return slots
    .filter(
      (slot) =>
        slot && typeof slot.start === "string" && typeof slot.end === "string",
    )
    .map((slot) => ({ start: slot.start, end: slot.end }));
};

export default {
  getDoctorSchedule,
  setDoctorSchedule,
  extractConflictSlots,
};
