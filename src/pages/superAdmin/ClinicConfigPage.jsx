import { useEffect, useState } from "react";
import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import Input from "../../components/Input";
import Toast from "../../components/Toast";
import {
  DAY_LABELS,
  WORKING_DAYS,
  isValidTime,
} from "../../constants/schedule";
import {
  extractConflictSlots,
  getDoctorSchedule,
  setDoctorSchedule,
} from "../../services/doctorScheduleService";
import { getUsers } from "../../services/userService";

const createEmptyWeek = () =>
  WORKING_DAYS.map((dayOfWeek) => ({
    dayOfWeek,
    timeSlots: [],
  }));

const normalizeWeek = (days = []) =>
  WORKING_DAYS.map((dayOfWeek) => ({
    dayOfWeek,
    timeSlots: (
      days.find((day) => day.dayOfWeek === dayOfWeek)?.timeSlots ?? []
    ).map((slot) => ({ start: slot.start, end: slot.end })),
  }));

const getSlotCount = (days) =>
  days.reduce((total, day) => total + day.timeSlots.length, 0);

const ClinicConfigPage = () => {
  const [toast, setToast] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [doctorsStatus, setDoctorsStatus] = useState("loading");
  const [doctorsReload, setDoctorsReload] = useState(0);
  const [schedulesMap, setSchedulesMap] = useState({});

  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [editDays, setEditDays] = useState(createEmptyWeek);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleFormError, setScheduleFormError] = useState("");
  const [scheduleSaveError, setScheduleSaveError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadDoctors = async () => {
      setDoctorsStatus("loading");

      try {
        const users = await getUsers();
        if (cancelled) return;

        const fetchedDoctors = users.filter((user) => user.role === "DOCTOR");
        setDoctors(fetchedDoctors);
        setDoctorsStatus("ready");

        const initialMap = {};
        fetchedDoctors.forEach((doctor) => {
          initialMap[doctor.userId] = {
            status: "loading",
            days: createEmptyWeek(),
            loadError: null,
          };
        });
        setSchedulesMap(initialMap);

        await Promise.all(
          fetchedDoctors.map(async (doctor) => {
            try {
              const schedule = await getDoctorSchedule(doctor.userId);
              if (cancelled) return;

              setSchedulesMap((previous) => ({
                ...previous,
                [doctor.userId]: {
                  status: "ready",
                  days: normalizeWeek(schedule.days),
                  loadError: null,
                },
              }));
            } catch (error) {
              if (cancelled) return;

              setSchedulesMap((previous) => ({
                ...previous,
                [doctor.userId]: {
                  status: "failed",
                  days: createEmptyWeek(),
                  loadError: error?.userMessage ?? "Could not load schedule.",
                },
              }));
            }
          }),
        );
      } catch {
        if (!cancelled) setDoctorsStatus("failed");
      }
    };

    loadDoctors();
    return () => {
      cancelled = true;
    };
  }, [doctorsReload]);

  const handleStartEdit = (doctor) => {
    const schedule = schedulesMap[doctor.userId];
    setEditingDoctorId(doctor.userId);
    setEditDays(normalizeWeek(schedule?.days));
    setScheduleFormError("");
    setScheduleSaveError(null);
  };

  const handleCancelEdit = () => {
    setEditingDoctorId(null);
    setScheduleFormError("");
    setScheduleSaveError(null);
    setEditDays(createEmptyWeek());
  };

  const updateDaySlots = (dayOfWeek, updater) => {
    setEditDays((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, timeSlots: updater(day.timeSlots) }
          : day,
      ),
    );
  };

  const changeSlotTime = (dayOfWeek, slotIndex, field, value) => {
    updateDaySlots(dayOfWeek, (slots) =>
      slots.map((slot, index) =>
        index === slotIndex ? { ...slot, [field]: value } : slot,
      ),
    );
  };

  const addTimeSlot = (dayOfWeek) => {
    updateDaySlots(dayOfWeek, (slots) => [
      ...slots,
      { start: "", end: "" },
    ]);
  };

  const removeTimeSlot = (dayOfWeek, slotIndex) => {
    updateDaySlots(dayOfWeek, (slots) =>
      slots.filter((_, index) => index !== slotIndex),
    );
  };

  const handleScheduleSave = async (event, doctorId) => {
    event.preventDefault();
    setScheduleFormError("");
    setScheduleSaveError(null);

    if (getSlotCount(editDays) === 0) {
      setScheduleFormError(
        "Add at least one time slot. A schedule must contain at least one working period.",
      );
      return;
    }

    for (const day of editDays) {
      const slots = day.timeSlots;

      if (
        slots.some(
          (slot) => !isValidTime(slot.start) || !isValidTime(slot.end),
        )
      ) {
        setScheduleFormError(
          `${DAY_LABELS[day.dayOfWeek] ?? day.dayOfWeek}: every time slot needs valid HH:mm start and end times.`,
        );
        return;
      }

      if (slots.some((slot) => slot.end <= slot.start)) {
        setScheduleFormError(
          `${DAY_LABELS[day.dayOfWeek] ?? day.dayOfWeek}: each time slot must end after it starts.`,
        );
        return;
      }

      const sortedSlots = [...slots].sort((a, b) =>
        a.start.localeCompare(b.start),
      );
      for (let index = 1; index < sortedSlots.length; index += 1) {
        if (sortedSlots[index].start < sortedSlots[index - 1].end) {
          setScheduleFormError(
            `${DAY_LABELS[day.dayOfWeek] ?? day.dayOfWeek}: time slots cannot overlap.`,
          );
          return;
        }
      }
    }

    setSavingSchedule(true);
    try {
      const updated = await setDoctorSchedule(doctorId, { days: editDays });

      setSchedulesMap((previous) => ({
        ...previous,
        [doctorId]: {
          status: "ready",
          days: normalizeWeek(updated.days),
          loadError: null,
        },
      }));

      const doctor = doctors.find((item) => item.userId === doctorId);
      setToast({
        type: "success",
        message: `Schedule saved for ${doctor?.fullName ?? "the doctor"}.`,
      });
      setEditingDoctorId(null);
    } catch (error) {
      setScheduleSaveError({
        message:
          error?.userMessage ??
          error?.message ??
          "Could not save the schedule. No changes were saved.",
        conflicts: extractConflictSlots(error),
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  const renderWeeklySchedule = (schedule) => {
    const days = normalizeWeek(schedule.days);

    if (getSlotCount(days) === 0) {
      return (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-4">
          <p className="text-sm font-medium text-neutral-700">
            No individual schedule configured
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Configure each weekday below. Days without time slots are treated
            as days off.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {days.map(({ dayOfWeek, timeSlots }) => {
          const isWorkingDay = timeSlots.length > 0;

          return (
            <div
              key={dayOfWeek}
              className={`rounded-xl border p-3 ${
                isWorkingDay
                  ? "border-primary-200 bg-primary-50"
                  : "border-neutral-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-neutral-800">
                  {DAY_LABELS[dayOfWeek] ?? dayOfWeek}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    isWorkingDay
                      ? "bg-primary-100 text-primary-800"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {isWorkingDay ? "Working" : "Day off"}
                </span>
              </div>

              {isWorkingDay ? (
                <div className="mt-3 space-y-2">
                  {timeSlots.map((slot, index) => (
                    <div
                      key={`${slot.start}-${slot.end}-${index}`}
                      className="flex items-center gap-2 rounded-lg border border-primary-100 bg-white px-2.5 py-2 text-xs text-neutral-700"
                    >
                      <Icon
                        name="clock"
                        className="h-4 w-4 shrink-0 text-primary-700"
                      />
                      <span>
                        {slot.start} – {slot.end}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-neutral-500">Not available</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section
        aria-labelledby="doctor-schedule-heading"
        className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
          <div className="flex items-start gap-3">
            <Icon
              name="calendar-clock"
              className="mt-0.5 h-5 w-5 shrink-0 text-primary-700"
            />
            <div>
              <h2
                id="doctor-schedule-heading"
                className="text-base font-semibold text-neutral-900"
              >
                Doctor working schedules
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                View and edit each doctor's availability independently for
                every weekday.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-warning-200 bg-warning-100 px-2.5 py-0.5 text-xs font-semibold text-warning-900">
            SCHEDULE_MANAGE
          </span>
        </div>

        {doctorsStatus === "failed" ? (
          <div className="space-y-3">
            <ErrorMessage
              title="Unable to load doctors"
              message="The staff directory could not be fetched, so no schedules can be displayed."
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setDoctorsReload((key) => key + 1)}
              className="inline-flex items-center gap-2"
            >
              <Icon name="refresh" className="h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : doctorsStatus === "loading" ? (
          <div
            role="status"
            aria-label="Loading doctors and schedules"
            aria-busy="true"
            className="motion-safe:animate-pulse space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-6"
          >
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-12 rounded bg-neutral-100" />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <p className="text-sm text-neutral-600">No doctors provisioned.</p>
        ) : (
          <div className="space-y-6">
            {doctors.map((doctor) => {
              const schedule = schedulesMap[doctor.userId] ?? {
                status: "loading",
                days: createEmptyWeek(),
              };
              const isEditing = editingDoctorId === doctor.userId;

              return (
                <article
                  key={doctor.userId}
                  className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900">
                        {doctor.fullName}
                        <span className="ml-1 font-normal text-neutral-500">
                          (@{doctor.username})
                        </span>
                      </h3>
                      <p className="mt-1 text-xs text-neutral-500">
                        Doctor ID: {doctor.userId}
                      </p>
                    </div>

                    {!isEditing && schedule.status === "ready" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(doctor)}
                        className="inline-flex items-center gap-1.5"
                      >
                        <Icon name="edit" className="h-4 w-4" />
                        Edit schedule
                      </Button>
                    )}
                  </div>

                  {schedule.status === "loading" ? (
                    <div
                      role="status"
                      aria-label={`Loading schedule for ${doctor.fullName}`}
                      className="motion-safe:animate-pulse grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                    >
                      {Array.from({ length: 4 }, (_, index) => (
                        <div
                          key={index}
                          className="h-24 rounded-xl bg-neutral-100"
                        />
                      ))}
                    </div>
                  ) : schedule.status === "failed" ? (
                    <ErrorMessage
                      title="Unable to load schedule"
                      message={schedule.loadError ?? "Please try again."}
                    />
                  ) : !isEditing ? (
                    renderWeeklySchedule(schedule)
                  ) : (
                    <form
                      onSubmit={(event) =>
                        handleScheduleSave(event, doctor.userId)
                      }
                      className="space-y-5 pt-1"
                    >
                      <p className="text-xs text-neutral-600">
                        Add one or more slots to a working day. Leave a day's
                        slots empty to mark it as a day off.
                      </p>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {editDays.map(({ dayOfWeek, timeSlots }) => (
                          <fieldset
                            key={dayOfWeek}
                            className="min-w-0 space-y-3 rounded-xl border border-neutral-200 bg-white p-3"
                          >
                            <legend className="px-1 text-sm font-semibold text-neutral-800">
                              {DAY_LABELS[dayOfWeek] ?? dayOfWeek}
                            </legend>

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-neutral-500">
                                {timeSlots.length
                                  ? `${timeSlots.length} slot(s)`
                                  : "Day off"}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addTimeSlot(dayOfWeek)}
                                className="inline-flex items-center gap-1"
                              >
                                <Icon name="plus" className="h-3.5 w-3.5" />
                                Add slot
                              </Button>
                            </div>

                            {timeSlots.length === 0 ? (
                              <p className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">
                                No slots configured. This day will be off.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {timeSlots.map((slot, index) => (
                                  <div
                                    key={`${dayOfWeek}-${index}`}
                                    className="space-y-2 rounded-lg border border-neutral-200 p-2"
                                  >
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        id={`slot-start-${doctor.userId}-${dayOfWeek}-${index}`}
                                        name={`slot-start-${dayOfWeek}-${index}`}
                                        label={`Slot ${index + 1} start`}
                                        type="time"
                                        value={slot.start}
                                        onChange={(event) =>
                                          changeSlotTime(
                                            dayOfWeek,
                                            index,
                                            "start",
                                            event.target.value,
                                          )
                                        }
                                      />
                                      <Input
                                        id={`slot-end-${doctor.userId}-${dayOfWeek}-${index}`}
                                        name={`slot-end-${dayOfWeek}-${index}`}
                                        label={`Slot ${index + 1} end`}
                                        type="time"
                                        value={slot.end}
                                        onChange={(event) =>
                                          changeSlotTime(
                                            dayOfWeek,
                                            index,
                                            "end",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        removeTimeSlot(dayOfWeek, index)
                                      }
                                      aria-label={`Remove ${DAY_LABELS[dayOfWeek] ?? dayOfWeek} slot ${index + 1}`}
                                      className="inline-flex items-center gap-1"
                                    >
                                      <Icon
                                        name="circle-x"
                                        className="h-4 w-4 text-danger-600"
                                      />
                                      Remove slot
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </fieldset>
                        ))}
                      </div>

                      {scheduleFormError && (
                        <ErrorMessage
                          title="Check the schedule"
                          message={scheduleFormError}
                        />
                      )}

                      {scheduleSaveError && (
                        <ErrorMessage
                          title={
                            scheduleSaveError.conflicts?.length
                              ? "Time slot conflict"
                              : "Unable to save the schedule"
                          }
                          message={`${scheduleSaveError.message}${
                            scheduleSaveError.conflicts?.length
                              ? ` Overlapping slots: ${scheduleSaveError.conflicts
                                  .map((slot) => `${slot.start}–${slot.end}`)
                                  .join(", ")}. No changes were saved.`
                              : ""
                          }`}
                        />
                      )}

                      <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={savingSchedule}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          loading={savingSchedule}
                          disabled={savingSchedule}
                          className="inline-flex items-center gap-1.5"
                        >
                          <Icon name="save" className="h-3.5 w-3.5" />
                          Save changes
                        </Button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={6000}
          className="fixed bottom-4 right-4 z-50 max-w-sm shadow-lg"
        />
      )}
    </div>
  );
};

export default ClinicConfigPage;
