import { useEffect } from "react";
import Button from "../../components/Button";
import Icon from "../../components/Icon";

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

const fmtSize = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

export const BackupDetailDrawer = ({ backup, onClose }) => {
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
            [
              "Created",
              backup.createdAt
                ? new Date(backup.createdAt).toLocaleString()
                : "—",
            ],
            ["Age", relTime(backup.createdAt)],
            ["Size", fmtSize(backup.sizeBytes)],
            ["Encryption", "AES-256-GCM"],
            ["Checksum", backup.checksum || "—", true],
            ["Region", backup.region || "—"],
            ["Created by", backup.createdBy || "system"],
          ].map(([label, value, mono]) => (
            <div
              key={label}
              className="border-b border-neutral-100 pb-2 last:border-0"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                {label}
              </p>
              <p
                className={`mt-0.5 break-words text-sm text-neutral-800 ${
                  mono ? "font-mono text-xs" : ""
                }`}
              >
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
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default BackupDetailDrawer;
