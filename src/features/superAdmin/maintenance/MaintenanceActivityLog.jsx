import { memo } from "react";
import { relTime } from "./maintenanceUtils";

export const MaintenanceActivityLog = memo(({ activity, onClear }) => {
  if (!activity || activity.length === 0) return null;

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
          Recent Activity
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-medium text-neutral-400 hover:text-neutral-700 transition"
        >
          Clear Log
        </button>
      </div>
      <ul className="mt-2.5 space-y-2">
        {activity.map((a) => (
          <li key={a.id} className="flex items-center gap-2.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                a.tone === "success"
                  ? "bg-emerald-500"
                  : a.tone === "info"
                  ? "bg-primary-500"
                  : "bg-neutral-400"
              }`}
            />
            <span className="font-medium text-neutral-700">{a.text}</span>
            <span className="ml-auto text-[11px] text-neutral-400">
              {relTime(a.at?.toISOString?.() ?? a.at)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
});

MaintenanceActivityLog.displayName = "MaintenanceActivityLog";

export default MaintenanceActivityLog;
