import { memo, useEffect, useState } from "react";
import Button from "../../../components/Button";
import Icon from "../../../components/Icon";
import { fmtSize } from "./maintenanceUtils";

export const RestoreBackupModal = memo(
  ({ isOpen, onClose, backups = [], onRestore, restoring, initialBackupId = "" }) => {
    const [restoreSource, setRestoreSource] = useState("stored");
    const [restoreBackupId, setRestoreBackupId] = useState("");
    const [restoreFile, setRestoreFile] = useState(null);
    const [restoreConfirmed, setRestoreConfirmed] = useState(false);

    useEffect(() => {
      if (isOpen) {
        setRestoreSource("stored");
        setRestoreBackupId(initialBackupId ? String(initialBackupId) : "");
        setRestoreFile(null);
        setRestoreConfirmed(false);
      }
    }, [isOpen, initialBackupId]);

    if (!isOpen) return null;

    const handleFormSubmit = (e) => {
      e?.preventDefault();
      onRestore({
        source: restoreSource,
        backupId: restoreSource === "stored" ? restoreBackupId : undefined,
        file: restoreSource === "upload" ? restoreFile : undefined,
        confirmed: restoreConfirmed,
      });
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-xs"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !restoring) {
            onClose();
          }
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-dialog-title"
          className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
        >
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200/60">
              <Icon name="database-backup" className="h-5 w-5" />
            </span>

            <div>
              <h2
                id="restore-dialog-title"
                className="text-base font-semibold text-neutral-900"
              >
                Restore System Data
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed">
                Restore system state from a stored backup snapshot or upload an external recovery file.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Backup Source Selection
              </legend>

              {/* Stored Backup Option */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                  restoreSource === "stored"
                    ? "border-primary-500 bg-primary-50/20 ring-1 ring-primary-500/20"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
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
                  className="mt-0.5 text-primary-600 focus:ring-primary-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-neutral-900">
                    Stored Snapshot
                  </span>
                  <span className="mt-0.5 block text-[11px] text-neutral-500">
                    Restore from an encrypted snapshot stored locally in OneCare.
                  </span>
                </span>
              </label>

              {restoreSource === "stored" && (
                <div className="pl-7 pt-1">
                  <label
                    htmlFor="restore-backup-id"
                    className="mb-1 block text-xs font-medium text-neutral-700"
                  >
                    Select Target Backup
                  </label>
                  <select
                    id="restore-backup-id"
                    value={restoreBackupId}
                    onChange={(event) => setRestoreBackupId(event.target.value)}
                    disabled={restoring || backups.length === 0}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-50"
                  >
                    <option value="">Choose stored snapshot</option>
                    {backups.map((backup) => (
                      <option key={backup.backupId} value={backup.backupId}>
                        #{backup.backupId} — {backup.filename} ({fmtSize(backup.sizeBytes)})
                      </option>
                    ))}
                  </select>
                  {backups.length === 0 && (
                    <p className="mt-1 text-[11px] text-neutral-500">
                      No stored snapshots available. Choose an external file instead.
                    </p>
                  )}
                </div>
              )}

              {/* File Upload Option */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                  restoreSource === "upload"
                    ? "border-primary-500 bg-primary-50/20 ring-1 ring-primary-500/20"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
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
                  className="mt-0.5 text-primary-600 focus:ring-primary-500"
                />
                <span>
                  <span className="block text-xs font-semibold text-neutral-900">
                    Upload Recovery File
                  </span>
                  <span className="mt-0.5 block text-[11px] text-neutral-500">
                    Upload a valid `.backup` archive file from your computer.
                  </span>
                </span>
              </label>

              {restoreSource === "upload" && (
                <div className="pl-7 pt-1">
                  <label
                    htmlFor="restore-backup-file"
                    className="mb-1 block text-xs font-medium text-neutral-700"
                  >
                    Choose Backup File
                  </label>
                  <input
                    id="restore-backup-file"
                    type="file"
                    accept=".backup,application/octet-stream"
                    disabled={restoring}
                    onChange={(event) => setRestoreFile(event.target.files?.[0] ?? null)}
                    className="block w-full text-xs text-neutral-500 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-neutral-700 hover:file:bg-neutral-200"
                  />
                  {restoreFile && (
                    <p className="mt-1.5 text-[11px] font-medium text-neutral-600">
                      Selected: {restoreFile.name} ({fmtSize(restoreFile.size)})
                    </p>
                  )}
                </div>
              )}
            </fieldset>

            {/* Danger Warning Box */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5">
              <p className="text-xs font-semibold text-rose-900">
                Warning: System Overwrite Action
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-rose-800">
                Restoring data will replace your active database state with the contents of this snapshot.
              </p>
              <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-xs font-medium text-rose-900">
                <input
                  type="checkbox"
                  checked={restoreConfirmed}
                  onChange={(event) => setRestoreConfirmed(event.target.checked)}
                  disabled={restoring}
                  className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                />
                <span>I understand and wish to proceed with data replacement.</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={restoring}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFormSubmit}
              loading={restoring}
              size="sm"
              disabled={
                restoring ||
                !restoreConfirmed ||
                (restoreSource === "stored" && !restoreBackupId) ||
                (restoreSource === "upload" && !restoreFile)
              }
              className="bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500"
            >
              <Icon name="database-backup" className="mr-1.5 h-4 w-4" />
              {restoring ? "Restoring System Data…" : "Restore System Data"}
            </Button>
          </div>
        </section>
      </div>
    );
  }
);

RestoreBackupModal.displayName = "RestoreBackupModal";

export default RestoreBackupModal;
