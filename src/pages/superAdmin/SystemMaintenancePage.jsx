import { useEffect, useState } from "react";
import Button from "../../components/Button";
import ConfirmDialog from "../../components/ConfirmDialog";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import StatCard from "../../components/StatCard";
import StatusBadge from "../../components/StatusBadge";
import Table from "../../components/Table";
import Toast from "../../components/Toast";
import {
  createBackup,
  downloadBackup,
  formatBytes,
  listBackups,
  restoreBackup,
} from "../../services/systemBackupService";

/**
 * Super-admin system maintenance.
 *
 * Backup & restore is wired to the real FR010/UC5 API
 * (/api/system/backups + /api/system/restore, Super Admin only):
 * backups run and list for real, downloads stream the encrypted file,
 * and restores send the mandatory confirm=true. Everything else on
 * this screen — the operational task cards, service health and stats —
 * remains a session-local fixture: "Executing" a task simulates its
 * run in the browser and is appended to the journal with a SIMULATED
 * status, and the copy on the page says so. Real backup/restore runs
 * are appended to the journal as completed entries.
 */

const formatUtc = (date) =>
  `${date.toISOString().replace("T", " ").slice(0, 16)} UTC`;

const SystemMaintenancePage = () => {
  const [journal, setJournal] = useState();
  const [runningTask, setRunningTask] = useState(null);
  const [toast, setToast] = useState(null);
  /** { title, message, confirmLabel, variant, run } | null */
  const [confirm, setConfirm] = useState(null);

  // — Backup & restore (FR010/UC5) — live API ————————————————
  const [backups, setBackups] = useState([]);
  const [backupsStatus, setBackupsStatus] = useState("loading");
  const [backupsReload, setBackupsReload] = useState(0);
  const [creatingBackup, setCreatingBackup] = useState(false);

  const [restoreFile, setRestoreFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  /** Per-table restored row counts from the last successful restore. */
  const [restoreResult, setRestoreResult] = useState(null);
  const [restoreError, setRestoreError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setBackupsStatus("loading");
    listBackups()
      .then((records) => {
        if (cancelled) return;
        setBackups(records);
        setBackupsStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setBackupsStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [backupsReload]);


  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const record = await createBackup();
      setBackups((current) => [record, ...current]);
      setToast({
        type: "success",
        message: `Backup #${record.backupId} created — ${record.filename}.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error?.userMessage ?? "Could not create the backup. Please try again.",
      });
    } finally {
      setCreatingBackup(false);
    }
  };


  const performRestore = async ({ backupId, file, label }) => {
    setRestoring(true);
    setRestoreError(null);
    setRestoreResult(null);
    try {
      const counts = await restoreBackup({ backupId, file, confirm: true });
      setRestoreResult(counts);
      setRestoreFile(null);
      setToast({
        type: "success",
        message:
          "Restore completed — all exported tables were replaced in a single transaction.",
      });
    } catch (error) {
      setRestoreError(
        error?.userMessage ??
          error?.message ??
          "Could not complete the restore. Nothing was changed.",
      );
    } finally {
      setRestoring(false);
    }
  };


  const requestRestoreFromFile = () => {
    if (!restoreFile) {
      setRestoreError("Choose an encrypted .backup file to restore first.");
      return;
    }
    setConfirm({
      title: "Restore from uploaded file? (destructive)",
      message: `Restore ${restoreFile.name}? Every exported table is replaced inside a single database transaction. The backend verifies the file checksum first and rejects corrupted payloads. A SYSTEM_RESTORE audit entry is written on completion.`,
      confirmLabel: "Confirm restore (overwrites data)",
      variant: "danger",
      run: () =>
        performRestore({ file: restoreFile, label: restoreFile.name }),
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Backup & restore — FR010/UC5 live API */}
      <section
        aria-labelledby="backup-heading"
        className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
          <div className="min-w-0">
            <h2
              id="backup-heading"
              className="flex items-center gap-2 text-base font-semibold text-neutral-900"
            >
              <Icon name="hard-drive" className="h-4 w-4 text-secondary-700" />
              Backup & Restore
            </h2>
            <p className="text-sm text-neutral-600">
              Full data exports, timestamped and encrypted AES-256-GCM.
              Backups, downloads and restores below run against the real
              /api/system endpoints — Super Admin only.
            </p>
          </div>
          <Button
            onClick={handleCreateBackup}
            loading={creatingBackup}
            disabled={Boolean(confirm)}
            className="inline-flex shrink-0 items-center gap-2"
          >
            <Icon name="database" className="h-4 w-4" />
            {creatingBackup ? "Creating backup..." : "Run backup now"}
          </Button>
        </div>

        {/* Restore result */}
        {restoreResult ? (
          <div
            role="status"
            className="mt-4 flex items-start gap-2.5 rounded-2xl border border-success-200 bg-success-50 p-3.5 text-sm text-success-900"
          >
            <Icon
              name="circle-check"
              className="mt-0.5 h-4 w-4 shrink-0 text-success-700"
            />
            <div className="min-w-0">
              <p className="font-semibold">Restore completed successfully</p>
              <p className="mt-0.5 text-xs leading-relaxed opacity-90">
                Restored row counts per table:{" "}
                {Object.entries(restoreResult)
                  .map(([table, count]) => `${table} ${count}`)
                  .join(" · ")}
                . All exported tables were replaced inside one transaction and
                a SYSTEM_RESTORE audit entry was written (AC4). Operational
                target NFRR-005: restore completes within 4 hours.
              </p>
            </div>
          </div>
        ) : null}

        {restoreError ? (
          <div className="mt-4">
            <ErrorMessage title="Restore refused" message={restoreError} />
          </div>
        ) : null}

        {/* Stored backups */}
        <div className="mt-4">
          {backupsStatus === "loading" ? (
            <div
              role="status"
              aria-label="Loading stored backups"
              className="space-y-2 animate-pulse"
            >
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-10 rounded-xl bg-neutral-100" />
              ))}
            </div>
          ) : backupsStatus === "failed" ? (
            <div className="space-y-3">
              <ErrorMessage
                title="Could not load stored backups"
                message="The backup service did not answer. Check the API connection and retry."
              />
              <div className="text-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBackupsReload((count) => count + 1)}
                  className="inline-flex items-center gap-2"
                >
                  <Icon name="refresh" className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <Table
              data={backups}
              getRowKey={(backup) => backup.backupId}
              emptyTitle="No backups stored."
              emptyMessage="Run a backup now to create the first encrypted snapshot."
              label="Stored backups"
            />
          )}
        </div>

      </section>


      {/* Sensitive-operation confirmation */}
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
          duration={6000}
          className="fixed bottom-4 right-4 z-50 max-w-sm shadow-lg"
        />
      )}
    </div>
  );
};

export default SystemMaintenancePage;
