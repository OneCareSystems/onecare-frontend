import { useCallback, useEffect, useMemo, useState, memo } from "react";

import Button from "../../components/Button";
import ConfirmDialog from "../../components/ConfirmDialog";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import Table from "../../components/Table";
import Toast from "../../components/Toast";
import { SuperAdminPageHeader } from "../../features/superAdmin/SuperAdminPageHeader";
import BackupScheduleEditor from "../../features/superAdmin/BackupScheduleEditor";
import BackupDetailDrawer from "../../features/superAdmin/BackupDetailDrawer";
import {
  createBackup,
  listBackups,
  downloadBackup,
  restoreBackup,
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

const backupAgeDays = (latestBackupAt) => {
  if (!latestBackupAt) return null;
  return Math.floor(
    (Date.now() - new Date(latestBackupAt).getTime()) / 86_400_000,
  );
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

const SafetyBanner = memo(
  ({ latestBackupAt, nextRun, creating, onRunBackup }) => {
    const latestAgeDays = backupAgeDays(latestBackupAt);

    let tone = "success";
    let title = "Backups healthy";
    let sub = "Your latest backup is recent.";
    if (latestAgeDays == null) {
      tone = "danger";
      title = "No backup on record";
      sub =
        "Create the first encrypted snapshot to begin protecting your data.";
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
            <p className={`text-base font-semibold ${titleTone[tone]}`}>
              {title}
            </p>
            <p className={`mt-0.5 text-sm ${subTone[tone]}`}>{sub}</p>
            {nextRun && (
              <p className="mt-2 text-xs font-medium text-neutral-600">
                <Icon
                  name="calendar-clock"
                  className="mr-1 inline h-3.5 w-3.5 align-text-bottom"
                />
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
  },
);
SafetyBanner.displayName = "SafetyBanner";

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
          3,
        )
        : [],
    [schedule],
  );

  if (!runs.length) return null;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {runs.map((run, i) => (
        <div
          key={run.toISOString()}
          className={`rounded-xl border p-3 ${i === 0
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
/* Backup row actions                                                  */
/* ------------------------------------------------------------------ */

const RowActions = memo(
  ({ backup, onOpen, onDownload, downloading }) => (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => onOpen(backup)}
        aria-label={`View backup ${backup.backupId}`}
        className="rounded-md border border-neutral-200 bg-white p-1.5 text-neutral-500 hover:text-neutral-900"
      >
        <Icon name="eye" className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onDownload(backup)}
        disabled={downloading}
        aria-label={`Download backup #${backup.backupId}`}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="download" className="h-3.5 w-3.5" />
        {downloading ? "Downloading…" : "Download"}
      </button>

      <button
        type="button"
        onClick={() => onOpen(backup)}
        className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 hover:border-neutral-300"
      >
        Details
      </button>
    </div>
  ),
);

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

  const [downloadingId, setDownloadingId] = useState(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreSource, setRestoreSource] = useState("stored");
  const [restoreBackupId, setRestoreBackupId] = useState("");
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  const [restoring, setRestoring] = useState(false);

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
    [backups],
  );

  const nextRun = useMemo(() => {
    if (!schedule) return null;
    const runs = computeUpcomingRuns(
      Number(schedule.dayOfMonth),
      schedule.executionTime,
      1,
    );
    return runs[0] ?? null;
  }, [schedule]);

  /* ---- load backups ---- */
  useEffect(() => {
    let cancelled = false;
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
            error?.userMessage ?? "Could not load the backup schedule.",
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
  const handleCreateBackup = useCallback(async () => {
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
        ].slice(0, 5),
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
  }, []);

  const handleDownloadBackup = useCallback(async (backup) => {
    setDownloadingId(backup.backupId);

    try {
      const { blob, filename } = await downloadBackup(backup.backupId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = filename || backup.filename || `onecare-backup-${backup.backupId}.backup`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      // Let the browser begin consuming the generated URL before cleanup.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      setToast({
        type: "success",
        message: `Backup #${backup.backupId} downloaded.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message: error?.userMessage ?? "Could not download the backup.",
      });
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const openRestoreDialog = useCallback((backup = null) => {
    setRestoreSource("stored");
    setRestoreBackupId(backup ? String(backup.backupId) : "");
    setRestoreFile(null);
    setRestoreConfirmed(false);
    setShowRestoreDialog(true);
  }, []);

  const handleRestoreBackup = useCallback(async () => {
    if (!restoreConfirmed) {
      setToast({
        type: "error",
        message: "Confirm that you understand this will replace existing data.",
      });
      return;
    }

    if (restoreSource === "stored" && !restoreBackupId) {
      setToast({ type: "error", message: "Select a stored backup to restore." });
      return;
    }

    if (restoreSource === "upload" && !restoreFile) {
      setToast({ type: "error", message: "Choose a backup file to restore." });
      return;
    }

    setRestoring(true);

    try {
      const result = await restoreBackup({
        backupId: restoreSource === "stored" ? Number(restoreBackupId) : undefined,
        file: restoreSource === "upload" ? restoreFile : undefined,
        confirm: restoreConfirmed,
      });

      setShowRestoreDialog(false);
      setToast({
        type: "success",
        message: "System restore completed successfully.",
      });
      setActivity((previous) => [
        {
          id: `restore-${Date.now()}`,
          at: new Date(),
          text: "System data restored successfully",
          tone: "success",
        },
        ...previous,
      ].slice(0, 5));

      // Refresh metadata in case the restored system has changed.
      setBackupsReload((count) => count + 1);

      return result;
    } catch (error) {
      setToast({
        type: "error",
        message: error?.userMessage ?? "Could not restore system data.",
      });
    } finally {
      setRestoring(false);
    }
  }, [restoreConfirmed, restoreSource, restoreBackupId, restoreFile]);

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
  }, [handleCreateBackup]);

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
        ].slice(0, 5),
      );
    } catch (error) {
      setScheduleError(error?.userMessage ?? "Could not update the schedule.");
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
            <p className="text-[11px] text-neutral-500">
              {relTime(b.createdAt)}
            </p>
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
        header: "Actions",
        headerClass: "text-right",
        render: (backup) => (
          <RowActions
            backup={backup}
            onOpen={setSelectedBackup}
            onDownload={handleDownloadBackup}
            downloading={downloadingId === backup.backupId}
          />
        ),
      },
    ],
    [handleDownloadBackup, downloadingId],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Hero */}
      <SuperAdminPageHeader
        icon="settings"
        badgeText="System maintenance · Operations"
        title="Backup & Recovery"
        description="Timestamped, encrypted snapshots of your clinic data — plus the automatic backup cadence."
        actions={
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
        }
      />

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
                  className={`h-1.5 w-1.5 rounded-full ${a.tone === "success"
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

          <BackupScheduleEditor
            key={schedule?.dayOfMonth}
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
                    e?.userMessage ?? "Could not load the schedule.",
                  ),
                )
                .finally(() => setScheduleLoading(false));
            }}
          />
        </section>

        <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

            <Button
              size="sm"
              variant="outline"
              onClick={() => openRestoreDialog()}
              disabled={restoring}
            >
              <Icon name="upload" className="mr-1.5 h-4 w-4" />
              Restore backup
            </Button>
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

      {showRestoreDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !restoring) {
              setShowRestoreDialog(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-dialog-title"
            className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                <Icon name="database-backup" className="h-5 w-5" />
              </span>

              <div>
                <h2
                  id="restore-dialog-title"
                  className="text-base font-semibold text-neutral-900"
                >
                  Restore system backup
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Restore system data from an existing encrypted backup or an
                  uploaded backup file.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-neutral-800">
                  Backup source
                </legend>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-3">
                  <input
                    type="radio"
                    name="restoreSource"
                    value="stored"
                    checked={restoreSource === "stored"}
                    onChange={() => {
                      setRestoreSource("stored");
                      setRestoreFile(null);
                    }}
                    disabled={restoring}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-neutral-900">
                      Stored backup
                    </span>
                    <span className="mt-1 block text-xs text-neutral-500">
                      Select a backup already stored in OneCare.
                    </span>
                  </span>
                </label>

                {restoreSource === "stored" && (
                  <div>
                    <label
                      htmlFor="restore-backup-id"
                      className="mb-1.5 block text-sm font-medium text-neutral-700"
                    >
                      Select backup
                    </label>
                    <select
                      id="restore-backup-id"
                      value={restoreBackupId}
                      onChange={(event) => setRestoreBackupId(event.target.value)}
                      disabled={restoring || backups.length === 0}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    >
                      <option value="">Choose a backup</option>
                      {backups.map((backup) => (
                        <option key={backup.backupId} value={backup.backupId}>
                          #{backup.backupId} — {backup.filename} (
                          {fmtSize(backup.sizeBytes)})
                        </option>
                      ))}
                    </select>
                    {backups.length === 0 && (
                      <p className="mt-1 text-xs text-neutral-500">
                        No stored backups are available. Choose an uploaded file
                        instead.
                      </p>
                    )}
                  </div>
                )}

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-3">
                  <input
                    type="radio"
                    name="restoreSource"
                    value="upload"
                    checked={restoreSource === "upload"}
                    onChange={() => {
                      setRestoreSource("upload");
                      setRestoreBackupId("");
                    }}
                    disabled={restoring}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-neutral-900">
                      Upload backup file
                    </span>
                    <span className="mt-1 block text-xs text-neutral-500">
                      Use a previously downloaded OneCare backup.
                    </span>
                  </span>
                </label>

                {restoreSource === "upload" && (
                  <div>
                    <label
                      htmlFor="restore-backup-file"
                      className="mb-1.5 block text-sm font-medium text-neutral-700"
                    >
                      Backup file
                    </label>
                    <input
                      id="restore-backup-file"
                      type="file"
                      accept=".backup,application/octet-stream"
                      disabled={restoring}
                      onChange={(event) =>
                        setRestoreFile(event.target.files?.[0] ?? null)
                      }
                      className="block w-full rounded-lg border border-neutral-300 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
                    />
                    {restoreFile && (
                      <p className="mt-1 text-xs text-neutral-600">
                        {restoreFile.name} ({fmtSize(restoreFile.size)})
                      </p>
                    )}
                  </div>
                )}
              </fieldset>

              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-900">
                  This action replaces existing system data.
                </p>
                <p className="mt-1 text-xs leading-5 text-red-800">
                  Only restore a trusted backup. Confirm that you understand the
                  consequences before proceeding.
                </p>
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-red-900">
                  <input
                    type="checkbox"
                    checked={restoreConfirmed}
                    onChange={(event) =>
                      setRestoreConfirmed(event.target.checked)
                    }
                    disabled={restoring}
                    className="mt-1"
                  />
                  <span>
                    I understand that restoring this backup will replace existing
                    data.
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setShowRestoreDialog(false)}
                disabled={restoring}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRestoreBackup}
                loading={restoring}
                disabled={
                  restoring ||
                  !restoreConfirmed ||
                  (restoreSource === "stored" && !restoreBackupId) ||
                  (restoreSource === "upload" && !restoreFile)
                }
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <Icon name="database-backup" className="mr-1.5 h-4 w-4" />
                {restoring ? "Restoring…" : "Restore data"}
              </Button>
            </div>
          </section>
        </div>
      )}

      {/* Drawer + confirm + toast */}
      <BackupDetailDrawer
        backup={selectedBackup}
        onClose={() => setSelectedBackup(null)}
      />

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
