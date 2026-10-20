import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { DAY_LABELS, isValidTime } from "../../constants/schedule";

const overlaps = (a, b) => a.start < b.end && b.start < a.end;

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

const getSlotCount = (days) =>
  days.reduce((total, day) => total + day.timeSlots.length, 0);

const PresetButton = ({ icon, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-xs transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
  >
    <Icon name={icon} className="h-3.5 w-3.5 text-neutral-500" />
    {children}
  </button>
);

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
      className={`min-w-0 rounded-xl border bg-white p-4 ${
        hasOverlap ? "border-danger-300" : "border-neutral-200"
      }`}
      aria-labelledby={`schedule-${day.dayOfWeek}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              slots.length
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
            <p className="text-sm text-neutral-500">No working hours</p>
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
                className={`rounded-lg border p-3 ${
                  invalid || overlapsAnother
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
                    onClick={() => onRemove(day.dayOfWeek, index)}
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
                        onChange(day.dayOfWeek, index, "start", e.target.value)
                      }
                      className="block min-h-10 w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>

                  <span className="pb-3 text-sm text-neutral-400">to</span>

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
                        onChange(day.dayOfWeek, index, "end", e.target.value)
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

export const DoctorScheduleEditor = ({
  days,
  onChangeSlot,
  onAddSlot,
  onRemoveSlot,
  onClearDay,
  onApplyPreset,
  onCancel,
  onSave,
  saving = false,
  formError,
  saveError,
}) => {
  const totalSlots = getSlotCount(days);
  const totalMinutes = weeklyHours(days);

  return (
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
              Update working hours for each day. Your changes will not take effect
              until you save.
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary-200 bg-white px-2.5 py-1 text-xs font-medium text-primary-700">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          Unsaved draft
        </span>
      </div>

      {/* Preset templates */}
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
                  const monday = current.find((day) => day.dayOfWeek === "MONDAY");
                  if (!monday || monday.timeSlots.length === 0) return current;
                  return current.map((day) =>
                    ["TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(
                      day.dayOfWeek
                    )
                      ? {
                          ...day,
                          timeSlots: monday.timeSlots.map((slot) => ({ ...slot })),
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
                    timeSlots: [{ start: "09:00", end: "17:00" }],
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
                  current.map((day) => ({ ...day, timeSlots: [] }))
                )
              }
            >
              Clear all
            </PresetButton>
          </div>
        </div>

        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Templates replace the current draft schedule. Save your changes when
          you are ready.
        </p>
      </section>

      {/* Days grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {days.map((day) => (
          <DayColumn
            key={day.dayOfWeek}
            day={day}
            onChange={onChangeSlot}
            onAdd={onAddSlot}
            onRemove={onRemoveSlot}
            onClearDay={onClearDay}
          />
        ))}
      </div>

      {/* Summary strip */}
      <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-neutral-500">Working days</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">
              {days.filter((day) => day.timeSlots.length > 0).length}
              <span className="text-sm font-normal text-neutral-500"> / 7</span>
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

      {/* Errors */}
      {formError && (
        <div
          className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <Icon name="alert-circle" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{formError}</p>
          </div>
        </div>
      )}

      {saveError && (
        <div
          className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800"
          role="alert"
        >
          <p className="font-medium">Unable to save the schedule</p>
          <p className="mt-1">{saveError.message}</p>
          {saveError.conflicts?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold">Conflicting time slots</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {saveError.conflicts.map((slot, index) => (
                  <li key={`${slot.start}-${slot.end}-${index}`}>
                    {slot.start}–{slot.end}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden text-xs text-neutral-500 sm:block">
          {totalSlots} time slots · {fmtHours(totalMinutes)} per week
        </p>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            loading={saving}
            disabled={saving}
            onClick={onSave}
            className="inline-flex items-center justify-center gap-1.5"
          >
            <Icon name="save" className="h-4 w-4" />
            Save schedule
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DoctorScheduleEditor;
