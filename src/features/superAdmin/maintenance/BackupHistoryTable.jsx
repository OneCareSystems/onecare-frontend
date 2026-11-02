import { memo, useMemo } from "react";
import Button from "../../../components/Button";
import ErrorMessage from "../../../components/ErrorMessage";
import Icon from "../../../components/Icon";
import Table from "../../../components/Table";
import BackupRowActions from "./BackupRowActions";
import { fmtSize, relTime } from "./maintenanceUtils";

export const BackupHistoryTable = memo(
  ({
    backups,
    status,
    onRetry,
    onOpenRestore,
    onSelectBackup,
    onDownloadBackup,
    downloadingId,
    restoring,
  }) => {
    const backupColumns = useMemo(
      () => [
        {
          key: "backupId",
          header: "Backup",
          render: (b) => (
            <div className="flex items-center gap-3 py-0.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">
                <Icon name="shield-check" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-xs font-bold text-neutral-900">
                  #{b.backupId}
                </p>
                <p className="truncate text-[11px] font-medium text-neutral-500 max-w-[200px] sm:max-w-[280px]">
                  {b.filename}
                </p>
              </div>
            </div>
          ),
        },
        {
          key: "createdAt",
          header: "Created Date",
          render: (b) => (
            <div>
              <p className="text-xs font-medium text-neutral-800">
                {b.createdAt
                  ? new Date(b.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
              <p className="text-[11px] text-neutral-400">{relTime(b.createdAt)}</p>
            </div>
          ),
        },
        {
          key: "sizeBytes",
          header: "File Size",
          render: (b) => (
            <span className="font-mono text-xs font-medium text-neutral-700">
              {fmtSize(b.sizeBytes)}
            </span>
          ),
        },
        {
          key: "encryption",
          header: "Security",
          render: () => (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200/70">
              <Icon name="lock" className="h-3 w-3 text-emerald-600" />
              AES-256
            </span>
          ),
        },
        {
          key: "actions",
          header: "Actions",
          headerClass: "text-right",
          render: (backup) => (
            <BackupRowActions
              backup={backup}
              onOpen={onSelectBackup}
              onDownload={onDownloadBackup}
              downloading={downloadingId === backup.backupId}
            />
          ),
        },
      ],
      [onSelectBackup, onDownloadBackup, downloadingId]
    );

    return (
      <section className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Backup History
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {status === "ready"
                ? `${backups.length} snapshot${backups.length === 1 ? "" : "s"} on record`
                : "Retrieving snapshots from storage…"}
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={onOpenRestore}
            disabled={restoring}
            className="inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Icon name="upload" className="h-4 w-4 text-neutral-500" />
            Restore Backup
          </Button>
        </div>

        {status === "loading" ? (
          <div className="animate-pulse space-y-2.5 py-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-neutral-100" />
            ))}
          </div>
        ) : status === "failed" ? (
          <div className="space-y-3 py-4 text-center">
            <ErrorMessage
              title="Could not load stored backups"
              message="The backup service did not answer."
            />
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
            >
              <Icon name="refresh" className="mr-1.5 h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : (
          <Table
            columns={backupColumns}
            data={backups}
            getRowKey={(b) => b.backupId}
            onRowClick={(b) => onSelectBackup(b)}
            emptyTitle="No backups stored"
            emptyMessage="Run a backup snapshot now to begin securing your clinic records."
            label="Stored backups"
          />
        )}
      </section>
    );
  }
);

BackupHistoryTable.displayName = "BackupHistoryTable";

export default BackupHistoryTable;
