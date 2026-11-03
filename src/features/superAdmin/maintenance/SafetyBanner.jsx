import { memo } from "react";
import Button from "../../../components/Button";
import Icon from "../../../components/Icon";
import { backupAgeDays, relFuture } from "./maintenanceUtils";

export const SafetyBanner = memo(
  ({ latestBackupAt, nextRun, creating, onRunBackup }) => {
    const latestAgeDays = backupAgeDays(latestBackupAt);

    let tone = "success";
    let title = "Backups Healthy";
    let sub = "Your latest system backup is recent and protected.";
    let icon = "shield-check";

    if (latestAgeDays == null) {
      tone = "danger";
      title = "No backup on record";
      sub =
        "Create the first encrypted snapshot to begin protecting system data.";
      icon = "shield-alert";
    } else if (latestAgeDays >= 30) {
      tone = "danger";
      title = `Last backup ${latestAgeDays} days ago`;
      sub =
        "System data is outside the recommended recovery window. Run a backup now.";
      icon = "shield-alert";
    } else if (latestAgeDays >= 7) {
      tone = "warning";
      title = `Last backup ${latestAgeDays} days ago`;
      sub =
        "Consider running a manual backup to keep clinic snapshot up to date.";
      icon = "alert-circle";
    }

    const toneMap = {
      success: "border-emerald-200/80 bg-emerald-50/70 text-emerald-950",
      warning: "border-amber-200/80 bg-amber-50/70 text-amber-950",
      danger: "border-rose-200/80 bg-rose-50/70 text-rose-950",
    };

    const iconTone = {
      success: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
      warning: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
      danger: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
    };

    return (
      <div
        className={`flex flex-col gap-4 rounded-2xl border p-5 transition-all shadow-sm sm:flex-row sm:items-center sm:justify-between ${toneMap[tone]}`}
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${iconTone[tone]}`}
          >
            <Icon name={icon} className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight leading-snug">
              {title}
            </h3>
            <p className="mt-0.5 text-xs opacity-85 leading-relaxed">{sub}</p>
            {nextRun && (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                <Icon
                  name="calendar-clock"
                  className="h-3.5 w-3.5 text-neutral-400"
                />
                <span>
                  Next automatic run{" "}
                  <span className="font-semibold">
                    {relFuture(nextRun.toISOString())}
                  </span>{" "}
                  (
                  {nextRun.toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  )
                </span>
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={onRunBackup}
          loading={creating}
          disabled={creating}
          className="inline-flex shrink-0 items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
        >
          <Icon name="database" className="h-4 w-4" />
          {creating ? "Creating Snapshot…" : "Run backup now"}
        </Button>
      </div>
    );
  },
);

SafetyBanner.displayName = "SafetyBanner";

export default SafetyBanner;
