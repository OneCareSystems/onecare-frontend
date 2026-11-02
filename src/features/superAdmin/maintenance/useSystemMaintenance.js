import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createBackup,
  listBackups,
  downloadBackup,
  restoreBackup,
} from "../../../services/systemBackupService";
import {
  getBackupSchedule,
  updateBackupSchedule,
} from "../../../services/systemSettingService";
import { computeUpcomingRuns, fmtSize, ordinal } from "./maintenanceUtils";

export const useSystemMaintenance = () => {
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const [backups, setBackups] = useState([]);
  const [backupsStatus, setBackupsStatus] = useState("loading");
  const [backupsReload, setBackupsReload] = useState(0);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
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

  /* Load backups */
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

  const retryBackups = useCallback(() => {
    setBackupsStatus("loading");
    setBackupsReload((c) => c + 1);
  }, []);

  /* Load schedule */
  const fetchSchedule = useCallback(async () => {
    setScheduleLoading(true);
    setScheduleError("");
    try {
      const data = await getBackupSchedule();
      setSchedule(data);
    } catch (error) {
      setScheduleError(
        error?.userMessage ?? "Could not load the backup schedule."
      );
    } finally {
      setScheduleLoading(false);
    }
  }, []);

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

  /* Create backup */
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
  }, []);

  /* Download backup */
  const handleDownloadBackup = useCallback(async (backup) => {
    setDownloadingId(backup.backupId);

    try {
      const { blob, filename } = await downloadBackup(backup.backupId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download =
        filename ||
        backup.filename ||
        `onecare-backup-${backup.backupId}.backup`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      setToast({
        type: "success",
        message: `Backup #${backup.backupId} downloaded successfully.`,
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

  /* Restore backup */
  const handleRestoreBackup = useCallback(
    async ({ source, backupId, file, confirmed }) => {
      if (!confirmed) {
        setToast({
          type: "error",
          message:
            "Please confirm that you understand this will replace existing data.",
        });
        return;
      }

      if (source === "stored" && !backupId) {
        setToast({
          type: "error",
          message: "Please select a stored backup to restore.",
        });
        return;
      }

      if (source === "upload" && !file) {
        setToast({
          type: "error",
          message: "Please select a backup file to restore.",
        });
        return;
      }

      setRestoring(true);

      try {
        const result = await restoreBackup({
          backupId: source === "stored" ? Number(backupId) : undefined,
          file: source === "upload" ? file : undefined,
          confirm: confirmed,
        });

        setShowRestoreDialog(false);
        setToast({
          type: "success",
          message: "System restore completed successfully.",
        });
        setActivity((previous) =>
          [
            {
              id: `restore-${Date.now()}`,
              at: new Date(),
              text: "System data restored successfully",
              tone: "success",
            },
            ...previous,
          ].slice(0, 5)
        );

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
    },
    []
  );

  /* Save Schedule */
  const handleSaveSchedule = useCallback(async (day) => {
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
      setScheduleError(error?.userMessage ?? "Could not update the schedule.");
    } finally {
      setScheduleSaving(false);
    }
  }, []);

  /* Keyboard shortcuts */
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

  return {
    toast,
    setToast,
    confirm,
    setConfirm,
    selectedBackup,
    setSelectedBackup,
    showShortcuts,
    setShowShortcuts,
    showRestoreDialog,
    setShowRestoreDialog,

    backups,
    backupsStatus,
    creatingBackup,
    downloadingId,
    restoring,
    latestBackupAt,
    nextRun,

    schedule,
    scheduleLoading,
    scheduleSaving,
    scheduleError,
    scheduleMessage,

    activity,
    clearActivity: () => setActivity([]),

    handleCreateBackup,
    handleDownloadBackup,
    handleRestoreBackup,
    handleSaveSchedule,
    retryBackups,
    retrySchedule: fetchSchedule,
  };
};

export default useSystemMaintenance;
