import { useEffect, useState } from "react";
import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";

const ordinal = (n) => {
  const v = Number(n) % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const last = Number(n) % 10;
  return `${n}${last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th"}`;
};

export const BackupScheduleEditor = ({
  schedule,
  loading,
  error,
  saving,
  scheduleMessage,
  onSave,
  onRetry,
}) => {
  const [dayOfMonth, setDayOfMonth] = useState(() =>
    String(schedule?.dayOfMonth ?? "28"),
  );

  useEffect(() => {
    if (schedule) setDayOfMonth(String(schedule.dayOfMonth));
  }, [schedule]);

  const changed =
    schedule && Number(dayOfMonth) !== Number(schedule.dayOfMonth);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-10 rounded-lg bg-neutral-100" />
        <div className="h-10 rounded-lg bg-neutral-100" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="space-y-3">
        <ErrorMessage
          title="Could not load backup schedule"
          message={error || "The schedule service did not return any data."}
        />
        <Button size="sm" variant="outline" onClick={onRetry}>
          <Icon name="refresh" className="mr-1 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0,
  ).getDate();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(Number(dayOfMonth));
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="backup-day-of-month"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500"
          >
            Day of month
          </label>
          <select
            id="backup-day-of-month"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            required
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={String(d)}>
                {ordinal(d)}
                {d > daysInMonth ? " (clamps to month end)" : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-500">
            If a month is shorter, the last day is used instead.
          </p>
        </div>

        <div>
          <label
            htmlFor="backup-execution-time"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500"
          >
            Execution time
          </label>
          <div className="flex items-center gap-2">
            <input
              id="backup-execution-time"
              type="time"
              value={schedule.executionTime ?? "23:59"}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600"
            />
            <span
              title="The backend controls execution time"
              className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600"
            >
              <Icon name="lock" className="h-3 w-3" /> Fixed
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-danger-50 p-2 text-xs text-danger-800 ring-1 ring-inset ring-danger-200">
          {error}
        </p>
      )}
      {scheduleMessage && (
        <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800 ring-1 ring-inset ring-emerald-200">
          {scheduleMessage}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
        <p className="text-xs text-neutral-500">
          {changed ? (
            <>
              Pending change:{" "}
              <span className="font-semibold text-neutral-800">
                {ordinal(schedule.dayOfMonth)} → {ordinal(Number(dayOfMonth))}
              </span>
            </>
          ) : (
            `Currently runs on the ${ordinal(schedule.dayOfMonth)} of every month.`
          )}
        </p>
        <Button
          type="submit"
          size="sm"
          loading={saving}
          disabled={saving || !changed}
        >
          <Icon name="save" className="mr-1 h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </form>
  );
};

export default BackupScheduleEditor;
