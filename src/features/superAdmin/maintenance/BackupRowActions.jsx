import { memo } from "react";
import Icon from "../../../components/Icon";

export const BackupRowActions = memo(
  ({ backup, onOpen, onDownload, downloading }) => (
    <div
      className="flex items-center justify-end gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onOpen(backup)}
        title="View Details"
        aria-label={`View backup ${backup.backupId}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
      >
        <Icon name="eye" className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => onDownload(backup)}
        disabled={downloading}
        aria-label={`Download backup #${backup.backupId}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="download" className="h-3.5 w-3.5 text-neutral-500" />
        {downloading ? "Downloading…" : "Download"}
      </button>
    </div>
  ),
);

BackupRowActions.displayName = "BackupRowActions";

export default BackupRowActions;
