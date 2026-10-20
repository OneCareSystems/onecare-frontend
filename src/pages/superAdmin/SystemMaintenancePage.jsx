import { useEffect, useMemo, useRef, useState, memo } from "react";

import Button from "../../components/Button";
import ConfirmDialog from "../../components/ConfirmDialog";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import Table from "../../components/Table";
import Toast from "../../components/Toast";

import {
  createBackup,
  listBackups,
} from "../../services/systemBackupService";

import {
  getBackupSchedule,
  updateBackupSchedule,
} from "../../services/systemSettingService";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const ordinal = (n) => {
  const v = Number(n) % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const last = Number(n) % 10;
  return `${n}${last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th"}`;
};

const relTime = (iso) => {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  return `${day}d ago`;
};

const relFuture = (iso) => {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diffMs = then - Date.now();
  if (diffMs <= 0) return "due now";
  const min = Math.ceil(diffMs / 60000);
  const hr = Math.ceil(min / 60);
  const day = Math.ceil(hr / 24);
  if (min < 60) return `in ${min}m`;
  if (hr < 48) return `in ${hr}h`;
  return `in ${day}d`;
};

const fmtSize = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

const addMonths = (date, n) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
};

/* Compute next N runs from day-of-month + execution time. */
const computeUpcomingRuns = (dayOfMonth, executionTime, count = 3) => {
  if (!dayOfMonth) return [];
  const [hh, mm] = String(executionTime ?? "23:59")
    .split(":")
    .map((x) => Number(x) || 0);

  const runs = [];
  let cursor = new Date();
  for (let i = 0; i < count + 2 && runs.length < count; i++) {
    const base = addMonths(cursor, i);
    const y = base.getFullYear();
    const m = base.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const day = Math.min(dayOfMonth, lastDay);
    const run = new Date(y, m, day, hh, mm, 0, 0);
    if (run.getTime() > Date.now()) runs.push(run);
  }
  return runs.slice(0, count);
};

/* ------------------------------------------------------------------ */
/* Hero safety banner                                                  */
/* ------------------------------------------------------------------ */

const SafetyBanner = memo(({ latestBackupAt, nextRun, creating, onRunBackup }) => {
  const latestAgeMs = latestBackupAt
    ? Date.now() - new Date(latestBackupAt).getTime()
    : null;
  const latestAgeDays =
    latestAgeMs != null ? Math.floor(latestAgeMs / 86_400_000) : null;

  let tone = "success";
  let title = "Backups healthy";
  let sub = "Your latest backup is recent.";
  if (latestAgeDays == null) {
    tone = "danger";
    title = "No backup on record";
    sub = "Create the first encrypted snapshot to begin protecting your data.";
  } else if (latestAgeDays >= 30) {
    tone = "danger";
    title = `Last backup ${latestAgeDays} days ago`;
    sub = "You are past the safe window. Run a backup now.";
  } else if (latestAgeDays >= 7) {
    tone = "warning";
    title = `Last backup ${latestAgeDays} days ago`;
    sub = "Consider running a backup to keep your data fresh.";
  }

  const toneMap = {
    success: "border-emerald-200 bg-emerald-50",
    warning: "border-amber-200 bg-amber-50",
    danger: "border-red-200 bg-red-50",
  };
  const iconTone = {
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
  };
  const titleTone = {
    success: "text-emerald-900",
    warning: "text-amber-900",
    danger: "text-red-900",
  };
  const subTone = {
    success: "text-emerald-800",
    warning: "text-amber-800",
    danger: "text-red-800",
  };

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between ${toneMap[tone]}`}
    >
      <div className="flex items-start gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconTone[tone]}`}
        >
          <Icon name="shield-check" className="h-5 w-5" />
        </span>
        <div>
          <p className={`text-base font-semibold ${titleTone[tone]}`}>{title}</p>
          <p className={`mt-0.5 text-sm ${subTone[tone]}`}>{sub}</p>
          {nextRun && (
            <p className="mt-2 text-xs font-medium text-neutral-600">
              <Icon name="calendar-clock" className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
              Next automatic run {relFuture(nextRun.toISOString())} —{" "}
              {nextRun.toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>

      <Button
        onClick={onRunBackup}
        loading={creating}
        disabled={creating}
        className="inline-flex shrink-0 items-center gap-2"
      >
        <Icon name="database" className="h-4 w-4" />
        {creating ? "Running…" : "Run backup now"}
      </Button>
    </div>
  );
});
SafetyBanner.displayName = "SafetyBanner";

/* ------------------------------------------------------------------ */
/* Backup detail drawer                                                */
/* ------------------------------------------------------------------ */

const BackupDrawer = ({ backup, onClose }) => {
  useEffect(() => {
    if (!backup) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [backup, onClose]);

  if (!backup) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-neutral-900/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Backup #{backup.backupId}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-neutral-900">
              Backup details
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {[
            ["Filename", backup.filename, true],
            ["Created", backup.createdAt ? new Date(backup.createdAt).toLocaleString() : "—"],
            ["Age", relTime(backup.createdAt)],
            ["Size", fmtSize(backup.sizeBytes)],
            ["Encryption", "AES-256-GCM"],
            ["Checksum", backup.checksum || "—", true],
            ["Region", backup.region || "—"],
            ["Created by", backup.createdBy || "system"],
          ].map(([label, value, mono]) => (
            <div key={label} className="border-b border-neutral-100 pb-2 last:border-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                {label}
              </p>
              <p className={`mt-0.5 break-words text-sm text-neutral-800 ${mono ? "font-mono text-xs" : ""}`}>
                {value}
              </p>
            </div>
          ))}

          <div className="mt-4 rounded-xl bg-neutral-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Raw record
            </p>
            <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-neutral-700">
{JSON.stringify(backup, null, 2)}
            </pre>
          </div>
        </div>

        <footer className="border-t border-neutral-200 px-5 py-3">
          <Button variant="tertiary" onClick={onClose} className="w-full">
            Close
          </Button>
        </footer>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Upcoming runs strip                                                 */
/* ------------------------------------------------------------------ */

const UpcomingRuns = memo(({ schedule }) => {
  const runs = useMemo(
    () =>
      schedule
        ? computeUpcomingRuns(
            Number(schedule.dayOfMonth),
            schedule.executionTime,
            3
          )
        : [],
    [schedule]
  );

  if (!runs.length) return null;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {runs.map((run, i) => (
        <div
          key={run.toISOString()}
          className={`rounded-xl border p-3 ${
            i === 0
              ? "border-primary-200 bg-primary-50/60"
              : "border-neutral-200 bg-white"
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            {i === 0 ? "Next run" : i === 1 ? "Then" : "After that"}
          </p>
          <p className="mt-1 text-sm font-semibold text-neutral-900">
            {run.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="text-xs text-neutral-500">
            {run.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {relFuture(run.toISOString())}
          </p>
        </div>
      ))}
    </div>
  );
});
UpcomingRuns.displayName = "UpcomingRuns";

/* ------------------------------------------------------------------ */
/* Schedule editor                                                     */
/* ------------------------------------------------------------------ */

const ScheduleEditor = ({
  schedule,
  loading,
  error,
  saving,
  scheduleMessage,
  onSave,
  onRetry,
}) => {
  const [dayOfMonth, setDayOfMonth] = useState(
    () => String(schedule?.dayOfMonth ?? "28")
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
    0
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
        <Button type="submit" size="sm" loading={saving} disabled={saving || !changed}>
          <Icon name="save" className="mr-1 h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </form>
  );
};

/* ------------------------------------------------------------------ */
/* Backup row actions                                                  */
/* ------------------------------------------------------------------ */

const RowActions = memo(({ backup, onOpen }) => (
  <div className="flex items-center justify-end gap-1.5">
    <button
      type="button"
      onClick={() => onOpen(backup)}
      className="rounded-md border border-neutral-200 bg-white p-1.5 text-neutral-500 shadow-xs transition hover:border-neutral-300 hover:text-neutral-900"
      aria-label={`View backup ${backup.backupId}`}
    >
      <Icon name="eye" className="h-3.5 w-3.5" />
    </button>
    <button
      type="button"
      onClick={() => onOpen(backup)}
      className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 shadow-xs transition hover:border-neutral-300"
    >
      Details
    </button>
  </div>
));
RowActions.displayName = "RowActions";

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

const SystemMaintenancePage = () => {
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [backups, setBackups] = useState([]);
  const [backupsStatus, setBackupsStatus] = useState("loading");
  const [backupsReload, setBackupsReload] = useState(0);
  const [creatingBackup, setCreatingBackup] = useState(false);

  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState("");

  const [activity, setActivity] = useState([]);

  const latestBackupAt = useMemo(
    () =>
      backups
        .map((b) => b.createdAt)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null,
    [backups]
  );

  const nextRun = useMemo(() => {
    if (!schedule) return null;
    const runs = computeUpcomingRuns(
      Number(schedule.dayOfMonth),
      schedule.executionTime,
      1
    );
    return runs[0] ?? null;
  }, [schedule]);

  /* ---- shortcuts ---- */
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        handleCreateBackup();
      } else if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      } else if (e.key === "Escape") {
        setShowShortcuts(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- load backups ---- */
  useEffect(() => {
    let cancelled = false;
    setBackupsStatus("loading");
    listBackups()
      .then((records) => {
        if (cancelled) return;
        setBackups(records);
        setBackupsStatus("ready");
      })
      .catch(() => !cancelled && setBackupsStatus("failed"));
    return () => {
      cancelled = true;
    };
  }, [backupsReload]);

  /* ---- load schedule ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setScheduleLoading(true);
      setScheduleError("");
      try {
        const data = await getBackupSchedule();
        if (cancelled) return;
        setSchedule(data);
      } catch (error) {
        if (!cancelled)
          setScheduleError(
            error?.userMessage ?? "Could not load the backup schedule."
          );
      } finally {
        if (!cancelled) setScheduleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- create backup ---- */
  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const record = await createBackup();
      setBackups((cur) => [
        record,
        ...cur.filter((b) => b.backupId !== record.backupId),
      ]);
      setActivity((prev) =>
        [
          {
            id: `backup-${record.backupId}`,
            at: new Date(),
            text: `Backup #${record.backupId} created (${fmtSize(record.sizeBytes)})`,
            tone: "success",
          },
          ...prev,
        ].slice(0, 5)
      );
      setToast({
        type: "success",
        message: `Backup #${record.backupId} created — ${record.filename}.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message: error?.userMessage ?? "Could not create the backup.",
      });
    } finally {
      setCreatingBackup(false);
    }
  };

  /* ---- save schedule ---- */
  const handleSaveSchedule = async (day) => {
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setScheduleError("Choose a backup day between 1 and 31.");
      return;
    }
    setScheduleSaving(true);
    setScheduleError("");
    setScheduleMessage("");
    try {
      const updated = await updateBackupSchedule(day);
      setSchedule(updated);
      setScheduleMessage("Schedule updated.");
      setActivity((prev) =>
        [
          {
            id: `sched-${Date.now()}`,
            at: new Date(),
            text: `Schedule moved to the ${ordinal(updated.dayOfMonth)} of every month`,
            tone: "info",
          },
          ...prev,
        ].slice(0, 5)
      );
    } catch (error) {
      setScheduleError(
        error?.userMessage ?? "Could not update the schedule."
      );
    } finally {
      setScheduleSaving(false);
    }
  };

  /* ---- columns ---- */
  const backupColumns = useMemo(
    () => [
      {
        key: "backupId",
        header: "Backup",
        render: (b) => (
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Icon name="shield-check" className="h-4 w-4" />
            </span>
            <div>
              <p className="font-mono text-xs font-semibold text-neutral-900">
                #{b.backupId}
              </p>
              <p className="truncate text-[11px] text-neutral-500">
                {b.filename}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "createdAt",
        header: "Created",
        render: (b) => (
          <div>
            <p className="text-xs text-neutral-800">
              {b.createdAt
                ? new Date(b.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </p>
            <p className="text-[11px] text-neutral-500">{relTime(b.createdAt)}</p>
          </div>
        ),
      },
      {
        key: "sizeBytes",
        header: "Size",
        render: (b) => (
          <span className="font-mono text-xs text-neutral-700">
            {fmtSize(b.sizeBytes)}
          </span>
        ),
      },
      {
        key: "encryption",
        header: "Encryption",
        render: () => (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
            <Icon name="lock" className="h-3 w-3" />
            AES-256
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        headerClass: "text-right",
        render: (b) => <RowActions backup={b} onOpen={setSelectedBackup} />,
      },
    ],
    []
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Hero */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            <Icon name="settings" className="h-3.5 w-3.5" />
            System maintenance
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            Backup & Recovery
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Timestamped, encrypted snapshots of your clinic data — plus the
            automatic backup cadence.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowShortcuts((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
        >
          <kbd className="rounded bg-neutral-100 px-1 font-mono text-[10px]">
            ⌘K
          </kbd>
          Shortcuts
        </button>
      </header>

      {/* Safety banner */}
      <SafetyBanner
        latestBackupAt={latestBackupAt}
        nextRun={nextRun}
        creating={creatingBackup}
        onRunBackup={handleCreateBackup}
      />

      {/* Upcoming runs */}
      {schedule && !scheduleLoading && <UpcomingRuns schedule={schedule} />}

      {/* Activity trail */}
      {activity.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-xs sm:p-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Recent activity
            </span>
            <div className="h-px flex-1 bg-neutral-100" />
            <button
              type="button"
              onClick={() => setActivity([])}
              className="text-[11px] text-neutral-400 hover:text-neutral-700"
            >
              Clear
            </button>
          </div>
          <ul className="mt-2 space-y-1.5">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-xs">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    a.tone === "success"
                      ? "bg-emerald-500"
                      : a.tone === "info"
                      ? "bg-primary-500"
                      : "bg-neutral-400"
                  }`}
                />
                <span className="text-neutral-700">{a.text}</span>
                <span className="ml-auto text-[11px] text-neutral-400">
                  {relTime(a.at.toISOString())}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Schedule + backups */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs lg:col-span-1">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Automatic schedule
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              The system runs a full encrypted backup once a month.
            </p>
          </div>

          <ScheduleEditor
            schedule={schedule}
            loading={scheduleLoading}
            error={scheduleError}
            saving={scheduleSaving}
            scheduleMessage={scheduleMessage}
            onSave={handleSaveSchedule}
            onRetry={() => {
              setScheduleLoading(true);
              setScheduleError("");
              getBackupSchedule()
                .then(setSchedule)
                .catch((e) =>
                  setScheduleError(
                    e?.userMessage ?? "Could not load the schedule."
                  )
                )
                .finally(() => setScheduleLoading(false));
            }}
          />
        </section>

        <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Backup history
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                {backupsStatus === "ready"
                  ? `${backups.length} snapshot${backups.length === 1 ? "" : "s"} on record`
                  : "Loading snapshots…"}
              </p>
            </div>
          </div>

          {backupsStatus === "loading" ? (
            <div className="animate-pulse space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-neutral-100" />
              ))}
            </div>
          ) : backupsStatus === "failed" ? (
            <div className="space-y-3">
              <ErrorMessage
                title="Could not load stored backups"
                message="The backup service did not answer."
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBackupsReload((c) => c + 1)}
              >
                <Icon name="refresh" className="mr-1 h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              <Table
                columns={backupColumns}
                data={backups}
                getRowKey={(b) => b.backupId}
                onRowClick={(b) => setSelectedBackup(b)}
                emptyTitle="No backups stored"
                emptyMessage="Run a backup now to create the first encrypted snapshot."
                label="Stored backups"
              />
            </div>
          )}
        </section>
      </div>

      {/* Shortcuts popover */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/30 p-4 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-neutral-900">
              Keyboard shortcuts
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ["⌘ / Ctrl + B", "Run backup now"],
                ["⌘ / Ctrl + K", "Toggle shortcuts"],
                ["Esc", "Close drawer / dialog"],
              ].map(([k, label]) => (
                <li key={k} className="flex items-center justify-between">
                  <span className="text-neutral-600">{label}</span>
                  <kbd className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[11px] text-neutral-700">
                    {k}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Drawer + confirm + toast */}
      <BackupDrawer backup={selectedBackup} onClose={() => setSelectedBackup(null)} />

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.run?.();
          setConfirm(null);
        }}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel}
        variant={confirm?.variant ?? "primary"}
      />

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

export default SystemMaintenancePage;