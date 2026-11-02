import {
  DAY_LABELS,
  WORKING_DAYS,
  isValidTime,
} from "../../../constants/schedule";

export const createEmptyWeek = () =>
  WORKING_DAYS.map((dayOfWeek) => ({ dayOfWeek, timeSlots: [] }));

export const normalizeWeek = (days = []) =>
  WORKING_DAYS.map((dayOfWeek) => ({
    dayOfWeek,
    timeSlots: (
      days.find((day) => day.dayOfWeek === dayOfWeek)?.timeSlots ?? []
    ).map((slot) => ({ start: slot.start, end: slot.end })),
  }));

export const getSlotCount = (days) =>
  days.reduce((total, day) => total + day.timeSlots.length, 0);

const minutesBetween = (start, end) => {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
};

export const weeklyHours = (days) =>
  days.reduce(
    (sum, day) =>
      sum +
      day.timeSlots.reduce(
        (daySum, slot) =>
          isValidTime(slot.start) && isValidTime(slot.end)
            ? daySum + Math.max(0, minutesBetween(slot.start, slot.end))
            : daySum,
        0,
      ),
    0,
  );

export const formatHours = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const overlaps = (first, second) =>
  first.start < second.end && second.start < first.end;

export const validateWeek = (days) => {
  const errors = [];
  for (const day of days) {
    const slots = day.timeSlots;
    if (
      slots.some((slot) => !isValidTime(slot.start) || !isValidTime(slot.end))
    ) {
      errors.push({
        dayOfWeek: day.dayOfWeek,
        message: `${DAY_LABELS[day.dayOfWeek]}: every slot needs a valid start and end.`,
      });
      continue;
    }
    if (slots.some((slot) => slot.end <= slot.start)) {
      errors.push({
        dayOfWeek: day.dayOfWeek,
        message: `${DAY_LABELS[day.dayOfWeek]}: each slot must end after it starts.`,
      });
      continue;
    }
    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    for (let index = 1; index < sorted.length; index++) {
      if (overlaps(sorted[index - 1], sorted[index])) {
        errors.push({
          dayOfWeek: day.dayOfWeek,
          message: `${DAY_LABELS[day.dayOfWeek]}: time slots cannot overlap.`,
        });
        break;
      }
    }
  }
  return errors;
};

export const getHeadlineStats = (doctors, schedulesMap) => {
  let configured = 0;
  let totalSlots = 0;
  let totalMinutes = 0;
  for (const doctor of doctors) {
    const schedule = schedulesMap[doctor.userId];
    if (schedule?.status === "ready") {
      const slotCount = getSlotCount(schedule.days);
      if (slotCount > 0) configured++;
      totalSlots += slotCount;
      totalMinutes += weeklyHours(schedule.days);
    }
  }
  return {
    doctorCount: doctors.length,
    configured,
    totalSlots,
    totalMinutes,
  };
};
