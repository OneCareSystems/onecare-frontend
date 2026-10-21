import { useEffect } from "react";
import Button from "../../components/Button";
import Icon from "../../components/Icon";

const DetailRow = ({ label, value, mono }) => (
  <div className="flex flex-col gap-0.5 border-b border-neutral-100 py-2.5 last:border-0">
    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
      {label}
    </span>
    <span
      className={`break-words text-sm text-neutral-800 ${
        mono ? "font-mono text-xs" : ""
      }`}
    >
      {value || "—"}
    </span>
  </div>
);

export const AuditLogDetailDrawer = ({
  log,
  onClose,
  ActorAvatar,
  ActionBadge,
}) => {
  useEffect(() => {
    if (!log) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [log, onClose]);

  if (!log) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-neutral-900/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Audit event detail"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Event #{log.logId}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-neutral-900">
              Event Detail
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 flex items-center gap-3">
            {ActorAvatar && <ActorAvatar username={log.username} />}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">
                {log.username || "Unknown actor"}
              </p>
              {log.ipAddress && (
                <p className="truncate font-mono text-xs text-neutral-500">
                  {log.ipAddress}
                </p>
              )}
            </div>
            <div className="ml-auto">
              {ActionBadge && <ActionBadge action={log.actionType} />}
            </div>
          </div>

          <DetailRow
            label="Timestamp"
            value={log.timestamp?.replace("T", " ")}
            mono
          />
          <DetailRow label="Entity Type" value={log.entityType} />
          <DetailRow label="Entity ID" value={log.entityId} mono />
          <DetailRow label="Description" value={log.description} />
          <DetailRow label="Log ID" value={log.logId} mono />

          <div className="mt-6 rounded-xl bg-neutral-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Raw payload
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-neutral-700">
              {JSON.stringify(log, null, 2)}
            </pre>
          </div>
        </div>

        <footer className="border-t border-neutral-200 px-5 py-3">
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default AuditLogDetailDrawer;
