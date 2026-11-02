import { memo, useMemo } from "react";
import { computeUpcomingRuns, relFuture } from "./maintenanceUtils";

export const UpcomingRuns = memo(({ schedule }) => {
  const runs = useMemo(
    () =>
      schedule
        ? computeUpcomingRuns(
            Number(schedule.dayOfMonth),
            schedule.executionTime,
            3
          )
        : [],
    [schedule]
  );

  if (!runs.length) return null;

  return (
    <div className="grid grid-cols-1 gap-2">
      {runs.map((run, i) => (
        <div
          key={run.toISOString()}
          className={`relative overflow-hidden rounded-xl border p-3 transition-all sm:flex sm:items-center sm:justify-between sm:gap-3 ${
            i === 0
              ? "border-primary-200 bg-primary-50/40 shadow-xs"
              : "border-neutral-200/80 bg-white"
          }`}
        >
          {i === 0 && (
            <span className="absolute top-3 right-3 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
          )}
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {i === 0 ? "Next Scheduled Run" : i === 1 ? "Following Month" : "Later Month"}
          </p>
          <p className="mt-1 text-sm font-semibold text-neutral-900">
            {run.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {run.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · <span className="font-medium text-neutral-700">{relFuture(run.toISOString())}</span>
          </p>
        </div>
      ))}
    </div>
  );
});

UpcomingRuns.displayName = "UpcomingRuns";

export default UpcomingRuns;
