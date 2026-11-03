import { memo } from "react";

import { tintFor, initialsFor } from "../../utils/avatarUtils";

/**
 * Compact avatar + patient name cell reused across PatientRecordsPage and
 * TodaySchedulePage.  Pass `subtitle` for an optional secondary line.
 */
const PatientAvatarCell = memo(function PatientAvatarCell({
  name,
  subtitle,
  avatarSize = "md",
}) {
  const sizeClass = avatarSize === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-xs";

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-inset ring-black/5 ${sizeClass} ${tintFor(name)}`}
      >
        {initialsFor(name)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-neutral-900">{name ?? "—"}</p>
        {subtitle && <p className="text-xs text-neutral-400">{subtitle}</p>}
      </div>
    </div>
  );
});

export default PatientAvatarCell;
