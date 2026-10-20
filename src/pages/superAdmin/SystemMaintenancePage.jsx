import { useEffect, useState } from "react";
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


const SystemMaintenancePage = () => {
  const [toast, setToast] = useState(null);
  /** { title, message, confirmLabel, variant, run } | null */
  const [confirm, setConfirm] = useState(null);

  // — Backup & restore (FR010/UC5) — live API ————————————————
  const [backups, setBackups] = useState([]);
  const [backupsStatus, setBackupsStatus] = useState("loading");
  const [backupsReload, setBackupsReload] = useState(0);
  const [creatingBackup, setCreatingBackup] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBackupsStatus("loading");
    listBackups()
      .then((records) => {
        console.log("Backups returned:", records);
        console.log("Is array:", Array.isArray(records));
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

  const backupColumns = [
    {
      key: "backupId",
      header: "Backup ID",
    },
    {
      key: "createdAt",
      header: "Created At",
      render: (backup) =>
        new Date(backup.createdAt).toLocaleString(),
    },
    {
      key: "filename",
      header: "Filename",
    },
    {
      key: "sizeBytes",
      header: "Size",
      render: (backup) =>
        `${(backup.sizeBytes / 1024).toFixed(2)} KB`,
    },
  ];

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
              columns={backupColumns}
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
