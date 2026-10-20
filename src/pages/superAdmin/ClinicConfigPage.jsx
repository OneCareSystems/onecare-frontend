import { useEffect, useMemo, useRef, useState, memo } from "react";
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
import {
  getConsultationFee,
  updateConsultationFee,
} from "../../services/systemSettingService";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const createEmptyWeek = () =>
  WORKING_DAYS.map((dayOfWeek) => ({ dayOfWeek, timeSlots: [] }));

const normalizeWeek = (days = []) =>
  WORKING_DAYS.map((dayOfWeek) => ({
    dayOfWeek,
    timeSlots: (
      days.find((day) => day.dayOfWeek === dayOfWeek)?.timeSlots ?? []
    ).map((slot) => ({ start: slot.start, end: slot.end })),
  }));

const getSlotCount = (days) =>
  days.reduce((total, day) => total + day.timeSlots.length, 0);

const minutesBetween = (a, b) => {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
};

const weeklyHours = (days) =>
  days.reduce(
    (sum, d) =>
      sum +
      d.timeSlots.reduce(
        (ds, s) =>
          isValidTime(s.start) && isValidTime(s.end)
            ? ds + Math.max(0, minutesBetween(s.start, s.end))
            : ds,
        0
      ),
    0
  );

const fmtHours = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const overlaps = (a, b) => a.start < b.end && b.start < a.end;

/** Group slots by day, detect overlaps per day. */
const validateWeek = (days) => {
  const errors = [];
  for (const day of days) {
    const slots = day.timeSlots;
    if (slots.some((s) => !isValidTime(s.start) || !isValidTime(s.end))) {
      errors.push({
        dayOfWeek: day.dayOfWeek,
        message: `${DAY_LABELS[day.dayOfWeek]}: every slot needs a valid start and end.`,
      });
      continue;
    }
    if (slots.some((s) => s.end <= s.start)) {
      errors.push({
        dayOfWeek: day.dayOfWeek,
        message: `${DAY_LABELS[day.dayOfWeek]}: each slot must end after it starts.`,
      });
      continue;
    }
    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i++) {
      if (overlaps(sorted[i - 1], sorted[i])) {
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

/* ------------------------------------------------------------------ */
/* Visual primitives                                                   */
/* ------------------------------------------------------------------ */

const hueFromId = (s) => {
  let h = 0;
  for (const ch of String(s ?? "")) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};

const DoctorAvatar = memo(({ name, seed }) => {
  const initials = String(name || "?")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  const hue = hueFromId(seed ?? name);
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-xs"
      style={{ backgroundColor: `hsl(${hue} 55% 45%)` }}
    >
      {initials || "?"}
    </span>
  );
});
DoctorAvatar.displayName = "DoctorAvatar";

/** 7-dot strip showing which days have hours and the size of each slot block. */
const WeekStrip = memo(({ days }) => (
  <div
    className="flex items-end gap-1"
    aria-label="Weekly load indicator"
    title="Weekly load"
  >
    {days.map((d) => {
      const count = d.timeSlots.length;
      const height = count === 0 ? "h-1.5" : count === 1 ? "h-3" : count === 2 ? "h-4" : "h-5";
      const tone =
        count === 0
          ? "bg-neutral-200"
          : "bg-primary-500";
      return (
        <span
          key={d.dayOfWeek}
          title={`${DAY_LABELS[d.dayOfWeek]}: ${count} slot${count === 1 ? "" : "s"}`}
          className={`w-1.5 rounded-sm ${height} ${tone}`}
        />
      );
    })}
  </div>
));
WeekStrip.displayName = "WeekStrip";

const PresetButton = ({ children, onClick, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-600 shadow-xs transition hover:border-neutral-300 hover:text-neutral-900"
  >
    {icon && <Icon name={icon} className="h-3 w-3" />}
    {children}
  </button>
);

/* ------------------------------------------------------------------ */
/* Fee card with live invoice preview                                  */
/* ------------------------------------------------------------------ */

const FeeCard = ({
  status,
  fee,
  setFee,
  saved,
  saving,
  error,
  onSave,
  onRetry,
}) => {
  const amount = Number(fee);
  const previewValid = Number.isFinite(amount) && amount >= 0 && fee !== "";
  const tax = previewValid ? amount * 0.08 : 0;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Icon name="banknote" className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Consultation fee
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Applies to new invoices only.
            </p>
          </div>
        </div>
        {status === "ready" && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            Live
          </span>
        )}
      </div>

      {status === "loading" ? (
        <div className="mt-4 animate-pulse space-y-3">
          <div className="h-4 w-40 rounded bg-neutral-100" />
          <div className="h-10 rounded-lg bg-neutral-100" />
        </div>
      ) : status === "failed" ? (
        <div className="mt-4 space-y-3">
          <ErrorMessage title="Unable to load fee" message={error} />
          <Button variant="outline" size="sm" onClick={onRetry}>
            <Icon name="refresh" className="mr-1 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : (
        <form onSubmit={onSave} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="consultation-fee"
                className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500"
              >
                Amount
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-400">
                  $
                </span>
                <input
                  id="consultation-fee"
                  name="consultationFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  disabled={saving}
                  required
                  className="block w-full rounded-lg border border-neutral-200 bg-white py-2 pl-7 pr-3 text-sm text-neutral-900 shadow-xs transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-neutral-50"
                />
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                {fee !== saved ? (
                  <span className="text-amber-600">Unsaved change</span>
                ) : (
                  "Currently active"
                )}
              </p>
            </div>

            <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Sample invoice
              </p>
              <dl className="mt-1.5 space-y-0.5 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <dt>Consultation</dt>
                  <dd className="font-mono">
                    {previewValid ? `$${amount.toFixed(2)}` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <dt>Est. tax (8%)</dt>
                  <dd className="font-mono">
                    {previewValid ? `$${tax.toFixed(2)}` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-1 font-semibold text-neutral-900">
                  <dt>Total</dt>
                  <dd className="font-mono">
                    {previewValid ? `$${(amount + tax).toFixed(2)}` : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-danger-50 p-2 text-xs text-danger-800 ring-1 ring-inset ring-danger-200">
              {error}
            </p>
          )}

          <div className="flex justify-end border-t border-neutral-100 pt-3">
            <Button
              type="submit"
              size="sm"
              loading={saving}
              disabled={saving || fee.trim() === "" || fee === saved}
              className="inline-flex items-center gap-1.5"
            >
              <Icon name="save" className="h-3.5 w-3.5" />
              Save fee
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Week grid editor                                                    */
/* ------------------------------------------------------------------ */


const DayColumn = ({
  day,
  onChange,
  onAdd,
  onRemove,
  onClearDay,
}) => {
  const dayLabel = DAY_LABELS[day.dayOfWeek] ?? day.dayOfWeek;
  const slots = day.timeSlots;
  const sortedSlots = [...slots].sort((a, b) =>
    a.start.localeCompare(b.start)
  );

  const hasOverlap =
    sortedSlots.every(
      (slot) => isValidTime(slot.start) && isValidTime(slot.end)
    ) &&
    sortedSlots.some(
      (slot, index) =>
        index > 0 && overlaps(sortedSlots[index - 1], slot)
    );

  return (
    <section
      className={`min-w-0 rounded-xl border bg-white p-4 ${hasOverlap
          ? "border-danger-300"
          : "border-neutral-200"
        }`}
      aria-labelledby={`schedule-${day.dayOfWeek}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${slots.length
                ? "bg-primary-50 text-primary-700"
                : "bg-neutral-100 text-neutral-500"
              }`}
          >
            <Icon
              name={slots.length ? "clock" : "calendar"}
              className="h-4 w-4"
            />
          </span>

          <div>
            <h4
              id={`schedule-${day.dayOfWeek}`}
              className="text-sm font-semibold text-neutral-900"
            >
              {dayLabel}
            </h4>
            <p className="text-xs text-neutral-500">
              {slots.length
                ? `${slots.length} time slot${slots.length === 1 ? "" : "s"}`
                : "Day off"}
            </p>
          </div>
        </div>

        {slots.length > 0 && (
          <button
            type="button"
            onClick={() => onClearDay(day.dayOfWeek)}
            className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-danger-50 hover:text-danger-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label={`Clear all time slots for ${dayLabel}`}
          >
            Clear day
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {slots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-5 text-center">
            <p className="text-sm text-neutral-500">
              No working hours
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Add a time slot to make this a working day.
            </p>
          </div>
        ) : (
          slots.map((slot, index) => {
            const invalid =
              !isValidTime(slot.start) ||
              !isValidTime(slot.end) ||
              slot.end <= slot.start;

            const overlapsAnother = slots.some(
              (other, otherIndex) =>
                otherIndex !== index &&
                isValidTime(slot.start) &&
                isValidTime(slot.end) &&
                isValidTime(other.start) &&
                isValidTime(other.end) &&
                overlaps(slot, other)
            );

            return (
              <div
                key={index}
                className={`rounded-lg border p-3 ${invalid || overlapsAnother
                    ? "border-danger-200 bg-danger-50/50"
                    : "border-neutral-200 bg-neutral-50/50"
                  }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-neutral-600">
                    Time slot {index + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      onRemove(day.dayOfWeek, index)
                    }
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 transition hover:bg-danger-100 hover:text-danger-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    aria-label={`Remove ${dayLabel} time slot ${index + 1}`}
                  >
                    <Icon name="trash-2" className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
                  <div className="min-w-0">
                    <label
                      htmlFor={`start-${day.dayOfWeek}-${index}`}
                      className="mb-1 block text-xs font-medium text-neutral-600"
                    >
                      Start time
                    </label>
                    <input
                      id={`start-${day.dayOfWeek}-${index}`}
                      type="time"
                      value={slot.start}
                      onChange={(e) =>
                        onChange(
                          day.dayOfWeek,
                          index,
                          "start",
                          e.target.value
                        )
                      }
                      className="block min-h-10 w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>

                  <span className="pb-3 text-sm text-neutral-400">
                    to
                  </span>

                  <div className="min-w-0">
                    <label
                      htmlFor={`end-${day.dayOfWeek}-${index}`}
                      className="mb-1 block text-xs font-medium text-neutral-600"
                    >
                      End time
                    </label>
                    <input
                      id={`end-${day.dayOfWeek}-${index}`}
                      type="time"
                      value={slot.end}
                      onChange={(e) =>
                        onChange(
                          day.dayOfWeek,
                          index,
                          "end",
                          e.target.value
                        )
                      }
                      className="block min-h-10 w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>

                {(invalid || overlapsAnother) && (
                  <p className="mt-2 text-xs text-danger-700" role="alert">
                    {overlapsAnother
                      ? "This time overlaps another slot."
                      : "Enter a valid start and end time. The end must be later than the start."}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={() => onAdd(day.dayOfWeek)}
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary-300 px-3 py-2 text-sm font-medium text-primary-700 transition hover:border-primary-500 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <Icon name="plus" className="h-4 w-4" />
        Add time slot
      </button>
    </section>
  );
};

const WeekEditor = ({
  days,
  onChange,
  onAdd,
  onRemove,
  onClearDay,
  onApplyPreset,
}) => {
  const totalSlots = getSlotCount(days);
  const totalMinutes = weeklyHours(days);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-neutral-900">
              Schedule templates
            </h4>
            <p className="mt-1 text-xs text-neutral-500">
              Apply a template, then adjust individual days as needed.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <PresetButton
              icon="copy"
              onClick={() =>
                onApplyPreset((current) => {
                  const monday = current.find(
                    (day) => day.dayOfWeek === "MONDAY"
                  );

                  if (!monday || monday.timeSlots.length === 0) {
                    return current;
                  }

                  return current.map((day) =>
                    [
                      "TUESDAY",
                      "WEDNESDAY",
                      "THURSDAY",
                      "FRIDAY",
                    ].includes(day.dayOfWeek)
                      ? {
                        ...day,
                        timeSlots: monday.timeSlots.map((slot) => ({
                          ...slot,
                        })),
                      }
                      : day
                  );
                })
              }
            >
              Copy Monday to weekdays
            </PresetButton>

            <PresetButton
              icon="clock"
              onClick={() =>
                onApplyPreset((current) =>
                  current.map((day) => ({
                    ...day,
                    timeSlots: [
                      { start: "09:00", end: "17:00" },
                    ],
                  }))
                )
              }
            >
              9 AM–5 PM every day
            </PresetButton>

            <PresetButton
              icon="rotate-ccw"
              onClick={() =>
                onApplyPreset((current) =>
                  current.map((day) => ({
                    ...day,
                    timeSlots: [],
                  }))
                )
              }
            >
              Clear all
            </PresetButton>
          </div>
        </div>

        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Templates replace the current draft schedule. Save your
          changes when you are ready.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {days.map((day) => (
          <DayColumn
            key={day.dayOfWeek}
            day={day}
            onChange={onChange}
            onAdd={onAdd}
            onRemove={onRemove}
            onClearDay={onClearDay}
          />
        ))}
      </div>

      <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-neutral-500">Working days</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">
              {days.filter((day) => day.timeSlots.length > 0).length}
              <span className="text-sm font-normal text-neutral-500">
                {" "}/ 7
              </span>
            </p>
          </div>

          <div>
            <p className="text-xs text-neutral-500">Time slots</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">
              {totalSlots}
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs text-neutral-500">Weekly working hours</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">
              {fmtHours(totalMinutes)}
            </p>
          </div>
        </div>

        {totalMinutes > 60 * 60 && (
          <p className="mt-3 text-xs font-medium text-amber-700">
            This schedule exceeds 60 hours per week. Please double-check it.
          </p>
        )}
      </section>
    </div>
  );
};



/* ------------------------------------------------------------------ */
/* Doctor card                                                         */
/* ------------------------------------------------------------------ */

const DoctorCard = memo(
  ({
    doctor,
    schedule,
    isEditing,
    editDays,
    onStartEdit,
    onCancelEdit,
    onSave,
    onChangeSlot,
    onAddSlot,
    onRemoveSlot,
    onClearDay,
    onApplyPreset,
    scheduleFormError,
    scheduleSaveError,
    saving,
  }) => {
    const totalMinutes = weeklyHours(
      isEditing ? editDays : schedule.days
    );
    const slotCount = getSlotCount(isEditing ? editDays : schedule.days);

    return (
      <article
        className={`overflow-hidden rounded-2xl border bg-white shadow-xs transition ${isEditing ? "border-primary-300 ring-2 ring-primary-100" : "border-neutral-200"
          }`}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <DoctorAvatar name={doctor.fullName} seed={doctor.userId} />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-neutral-900">
                {doctor.fullName}
              </h3>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                <span className="truncate font-mono">@{doctor.username}</span>
                {schedule.status === "ready" && (
                  <>
                    <span className="text-neutral-300">·</span>
                    <span>
                      {slotCount === 0
                        ? "No schedule"
                        : `${fmtHours(totalMinutes)} / week`}
                    </span>
                  </>
                )}
              </div>
            </div>
            {schedule.status === "ready" && (
              <div className="ml-2 hidden sm:block">
                <WeekStrip days={schedule.days} />
              </div>
            )}
          </div>

          {!isEditing && schedule.status === "ready" && (
            <button
              type="button"
              onClick={() => onStartEdit(doctor)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-xs transition hover:border-neutral-300 hover:text-neutral-900"
            >
              <Icon name="pencil" className="h-3.5 w-3.5" />
              Edit schedule
            </button>
          )}
        </header>

        <div className="p-4">
          {schedule.status === "loading" ? (
            <div className="animate-pulse grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : schedule.status === "failed" ? (
            <ErrorMessage
              title="Unable to load schedule"
              message={schedule.loadError ?? "Please try again."}
            />


          ) : isEditing ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-xl border border-primary-100 bg-primary-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-700 shadow-xs">
                    <Icon name="calendar" className="h-5 w-5" />
                  </span>

                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900">
                      Editing weekly schedule
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">
                      Update working hours for each day. Your changes will
                      not take effect until you save.
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary-200 bg-white px-2.5 py-1 text-xs font-medium text-primary-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                  Unsaved draft
                </span>
              </div>

              <WeekEditor
                days={editDays}
                onChange={onChangeSlot}
                onAdd={onAddSlot}
                onRemove={onRemoveSlot}
                onClearDay={onClearDay}
                onApplyPreset={onApplyPreset}
              />

              {scheduleFormError && (
                <div
                  className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800"
                  role="alert"
                >
                  <div className="flex items-start gap-2">
                    <Icon
                      name="alert-circle"
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <p>{scheduleFormError}</p>
                  </div>
                </div>
              )}

              {scheduleSaveError && (
                <div
                  className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800"
                  role="alert"
                >
                  <p className="font-medium">
                    Unable to save the schedule
                  </p>
                  <p className="mt-1">
                    {scheduleSaveError.message}
                  </p>

                  {scheduleSaveError.conflicts?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold">
                        Conflicting time slots
                      </p>
                      <ul className="mt-1 list-inside list-disc text-xs">
                        {scheduleSaveError.conflicts.map((slot, index) => (
                          <li key={`${slot.start}-${slot.end}-${index}`}>
                            {slot.start}–{slot.end}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <p className="hidden text-xs text-neutral-500 sm:block">
                  {getSlotCount(editDays)} time slots · {fmtHours(weeklyHours(editDays))} per week
                </p>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    loading={saving}
                    disabled={saving}
                    onClick={() => onSave(doctor.userId)}
                    className="inline-flex items-center justify-center gap-1.5"
                  >
                    <Icon name="save" className="h-4 w-4" />
                    Save schedule
                  </Button>
                </div>
              </div>
            </div>


          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {schedule.days.map((day) => {
                const isWorking = day.timeSlots.length > 0;
                return (
                  <div
                    key={day.dayOfWeek}
                    className={`rounded-lg border p-2 ${isWorking
                        ? "border-primary-200 bg-primary-50/60"
                        : "border-neutral-200 bg-neutral-50/60"
                      }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      {DAY_LABELS[day.dayOfWeek]?.slice(0, 3) ?? day.dayOfWeek}
                    </p>
                    {isWorking ? (
                      <div className="mt-1 space-y-0.5">
                        {day.timeSlots.map((s, i) => (
                          <p
                            key={i}
                            className="font-mono text-[11px] text-primary-800"
                          >
                            {s.start}–{s.end}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-neutral-400">Off</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </article>
    );
  }
);
DoctorCard.displayName = "DoctorCard";

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

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
  const [justSavedId, setJustSavedId] = useState(null);

  const [rosterQuery, setRosterQuery] = useState("");

  const [consultationFee, setConsultationFee] = useState("");
  const [savedConsultationFee, setSavedConsultationFee] = useState("");
  const [feeStatus, setFeeStatus] = useState("loading");
  const [feeReload, setFeeReload] = useState(0);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeError, setFeeError] = useState("");

  const rosterSearchRef = useRef(null);

  /* ---- load fee ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFeeStatus("loading");
      setFeeError("");
      try {
        const res = await getConsultationFee();
        if (cancelled) return;
        const fee = String(res.consultationFee ?? "");
        setConsultationFee(fee);
        setSavedConsultationFee(fee);
        setFeeStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setFeeError(e?.userMessage ?? "Could not load fee.");
        setFeeStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feeReload]);

  /* ---- load doctors + schedules ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDoctorsStatus("loading");
      try {
        const users = await getUsers();
        if (cancelled) return;
        const docs = users.filter((u) => u.role === "DOCTOR");
        setDoctors(docs);
        setDoctorsStatus("ready");

        const initial = {};
        docs.forEach((d) => {
          initial[d.userId] = {
            status: "loading",
            days: createEmptyWeek(),
            loadError: null,
          };
        });
        setSchedulesMap(initial);

        await Promise.all(
          docs.map(async (d) => {
            try {
              const schedule = await getDoctorSchedule(d.userId);
              if (cancelled) return;
              setSchedulesMap((p) => ({
                ...p,
                [d.userId]: {
                  status: "ready",
                  days: normalizeWeek(schedule.days),
                  loadError: null,
                },
              }));
            } catch (e) {
              if (cancelled) return;
              setSchedulesMap((p) => ({
                ...p,
                [d.userId]: {
                  status: "failed",
                  days: createEmptyWeek(),
                  loadError: e?.userMessage ?? "Could not load schedule.",
                },
              }));
            }
          })
        );
      } catch {
        if (!cancelled) setDoctorsStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorsReload]);

  /* ---- fee save ---- */
  const handleFeeSave = async (e) => {
    e.preventDefault();
    setFeeError("");
    const trimmed = consultationFee.trim();
    if (!trimmed) return setFeeError("Enter a consultation fee.");
    const amount = Number(trimmed);
    if (!Number.isFinite(amount) || amount < 0)
      return setFeeError("Enter a valid fee ≥ 0.");
    setFeeSaving(true);
    try {
      const res = await updateConsultationFee(amount);
      const updated = String(res.consultationFee);
      setConsultationFee(updated);
      setSavedConsultationFee(updated);
      setToast({ type: "success", message: "Consultation fee updated." });
    } catch (e) {
      setFeeError(e?.userMessage ?? "Could not update fee.");
    } finally {
      setFeeSaving(false);
    }
  };

  /* ---- schedule edit handlers ---- */
  const startEdit = (doctor) => {
    const s = schedulesMap[doctor.userId];
    setEditingDoctorId(doctor.userId);
    setEditDays(normalizeWeek(s?.days));
    setScheduleFormError("");
    setScheduleSaveError(null);
  };

  const cancelEdit = () => {
    setEditingDoctorId(null);
    setEditDays(createEmptyWeek());
    setScheduleFormError("");
    setScheduleSaveError(null);
  };

  const changeSlot = (dayOfWeek, index, field, value) =>
    setEditDays((cur) =>
      cur.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? {
            ...d,
            timeSlots: d.timeSlots.map((s, i) =>
              i === index ? { ...s, [field]: value } : s
            ),
          }
          : d
      )
    );

  const addSlot = (dayOfWeek) =>
    setEditDays((cur) =>
      cur.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, timeSlots: [...d.timeSlots, { start: "", end: "" }] }
          : d
      )
    );

  const removeSlot = (dayOfWeek, index) =>
    setEditDays((cur) =>
      cur.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, timeSlots: d.timeSlots.filter((_, i) => i !== index) }
          : d
      )
    );

  const clearDay = (dayOfWeek) =>
    setEditDays((cur) =>
      cur.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, timeSlots: [] } : d
      )
    );

  const applyPreset = (mutator) => setEditDays((cur) => mutator(cur));

  /* ---- schedule save ---- */
  const saveSchedule = async (doctorId) => {
    setScheduleFormError("");
    setScheduleSaveError(null);

    if (getSlotCount(editDays) === 0) {
      setScheduleFormError(
        "Add at least one time slot — a schedule cannot be empty."
      );
      return;
    }

    const errors = validateWeek(editDays);
    if (errors.length > 0) {
      setScheduleFormError(errors[0].message);
      return;
    }

    setSavingSchedule(true);
    try {
      const updated = await setDoctorSchedule(doctorId, { days: editDays });
      setSchedulesMap((p) => ({
        ...p,
        [doctorId]: {
          status: "ready",
          days: normalizeWeek(updated.days),
          loadError: null,
        },
      }));
      const doc = doctors.find((d) => d.userId === doctorId);
      setToast({
        type: "success",
        message: `Schedule saved for ${doc?.fullName ?? "doctor"}.`,
      });
      setJustSavedId(doctorId);
      setTimeout(() => setJustSavedId(null), 1200);
      setEditingDoctorId(null);
    } catch (e) {
      setScheduleSaveError({
        message:
          e?.userMessage ??
          e?.message ??
          "Could not save schedule. No changes saved.",
        conflicts: extractConflictSlots(e),
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  /* ---- roster filter ---- */
  const filteredDoctors = useMemo(() => {
    const q = rosterQuery.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.fullName?.toLowerCase().includes(q) ||
        d.username?.toLowerCase().includes(q)
    );
  }, [doctors, rosterQuery]);

  /* ---- headline stats ---- */
  const headlineStats = useMemo(() => {
    let configured = 0;
    let totalSlots = 0;
    let totalMinutes = 0;
    for (const d of doctors) {
      const s = schedulesMap[d.userId];
      if (s?.status === "ready") {
        const n = getSlotCount(s.days);
        if (n > 0) configured++;
        totalSlots += n;
        totalMinutes += weeklyHours(s.days);
      }
    }
    return {
      doctorCount: doctors.length,
      configured,
      totalSlots,
      totalMinutes,
    };
  }, [doctors, schedulesMap]);

  /* ---- render ---- */
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Hero */}
      <header>
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          <Icon name="settings" className="h-3.5 w-3.5" />
          Clinic configuration
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
          Operations & Availability
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Fee structure and doctor working schedules — what the clinic charges
          and when it's open.
        </p>
      </header>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Doctors",
            value: headlineStats.doctorCount,
            hint: `${headlineStats.configured} scheduled`,
            tone: "primary",
          },
          {
            label: "Weekly slots",
            value: headlineStats.totalSlots,
            hint: "All doctors",
            tone: "teal",
          },
          {
            label: "Weekly coverage",
            value: fmtHours(headlineStats.totalMinutes),
            hint: "Aggregate hours",
            tone: "emerald",
          },
          {
            label: "Consultation fee",
            value: savedConsultationFee ? `$${Number(savedConsultationFee).toFixed(2)}` : "—",
            hint: "Active clinic-wide",
            tone: "amber",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-xs"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              {s.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-neutral-900">
              {s.value}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-500">{s.hint}</p>
          </div>
        ))}
      </div>

      {/* Two-column: fee + roster */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <FeeCard
            status={feeStatus}
            fee={consultationFee}
            setFee={setConsultationFee}
            saved={savedConsultationFee}
            saving={feeSaving}
            error={feeError}
            onSave={handleFeeSave}
            onRetry={() => setFeeReload((k) => k + 1)}
          />
        </div>

        <div className="space-y-4 lg:col-span-2">
          {/* Roster heading + search */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Doctor working schedules
              </h2>
              <p className="text-xs text-neutral-500">
                {filteredDoctors.length === doctors.length
                  ? `${doctors.length} doctors`
                  : `${filteredDoctors.length} of ${doctors.length} shown`}
              </p>
            </div>
            <div className="relative">
              <input
                ref={rosterSearchRef}
                type="search"
                value={rosterQuery}
                onChange={(e) => setRosterQuery(e.target.value)}
                placeholder="Filter doctors…"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 shadow-xs placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:w-56"
              />
            </div>
          </div>

          {/* Roster */}
          {doctorsStatus === "failed" ? (
            <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-xs">
              <ErrorMessage
                title="Unable to load doctors"
                message="The staff directory could not be fetched."
              />
              <Button
                variant="outline"
                onClick={() => setDoctorsReload((k) => k + 1)}
              >
                <Icon name="refresh" className="mr-1 h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : doctorsStatus === "loading" ? (
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl border border-neutral-200 bg-neutral-50"
                />
              ))}
            </div>
          ) : doctors.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
              No doctors provisioned yet.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredDoctors.map((doc) => (
                <div
                  key={doc.userId}
                  className={
                    justSavedId === doc.userId
                      ? "animate-[pulse-once_1s_ease-out]"
                      : ""
                  }
                >
                  <DoctorCard
                    doctor={doc}
                    schedule={
                      schedulesMap[doc.userId] ?? {
                        status: "loading",
                        days: createEmptyWeek(),
                      }
                    }
                    isEditing={editingDoctorId === doc.userId}
                    editDays={editDays}
                    onStartEdit={startEdit}
                    onCancelEdit={cancelEdit}
                    onSave={saveSchedule}
                    onChangeSlot={changeSlot}
                    onAddSlot={addSlot}
                    onRemoveSlot={removeSlot}
                    onClearDay={clearDay}
                    onApplyPreset={applyPreset}
                    scheduleFormError={scheduleFormError}
                    scheduleSaveError={scheduleSaveError}
                    saving={savingSchedule}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={5000}
          className="fixed bottom-4 right-4 z-50 max-w-sm shadow-xl"
        />
      )}
    </div>
  );
};

export default ClinicConfigPage;