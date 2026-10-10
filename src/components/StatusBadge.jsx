
import {
    LuTriangleAlert,
  LuArrowUpRight,
  LuCalendarClock,
  LuCheck,
  LuCircleHelp,
  LuClock,
  LuInfo,
  LuPackageCheck,
  LuPill,
  LuUserCheck,
  LuX,
} from "react-icons/lu";

const STATUS_STYLES = {
  success: {
    surface: "bg-success-100 text-success-800 border-success-200",
    icon: LuCheck,
  },
  warning: {
    surface: "bg-warning-100 text-warning-900 border-warning-200",
    icon:   LuTriangleAlert,
  },
  danger: {
    surface: "bg-danger-100 text-danger-800 border-danger-200",
    icon: LuX,
  },
  info: {
    surface: "bg-primary-100 text-primary-800 border-primary-200",
    icon: LuInfo,
  },
  neutral: {
    surface: "bg-neutral-100 text-neutral-800 border-neutral-200",
    icon: LuCircleHelp,
  },
};

const STATUS_MAP = {
  scheduled: {
    variant: "info",
    label: "Scheduled",
    icon: LuCalendarClock,
  },
  completed: {
    variant: "success",
    label: "Completed",
    icon: LuCheck,
  },
  cancelled: {
    variant: "danger",
    label: "Cancelled",
    icon: LuX,
  },
  "no-show": {
    variant: "warning",
    label: "No-show",
    icon:   LuTriangleAlert,
  },
  arrived: {
    variant: "info",
    label: "Arrived",
    icon: LuUserCheck,
  },
  pending: {
    variant: "warning",
    label: "Pending",
    icon: LuClock,
  },
  paid: {
    variant: "success",
    label: "Paid",
    icon: LuCheck,
  },
  "pending dispense": {
    variant: "warning",
    label: "Pending Dispense",
    icon: LuClock,
  },
  "partially dispensed": {
    variant: "info",
    label: "Partially Dispensed",
    icon: LuPill,
  },
  "fully dispensed": {
    variant: "success",
    label: "Fully Dispensed",
    icon: LuPackageCheck,
  },
  "dispensed (external)": {
    variant: "neutral",
    label: "Dispensed (External)",
    icon: LuArrowUpRight,
  },
  "low stock": {
    variant: "warning",
    label: "Low stock",
    icon:   LuTriangleAlert,
  },
  "near expiry": {
    variant: "warning",
    label: "Near expiry",
    icon: LuCalendarClock,
  },
  expired: {
    variant: "danger",
    label: "Expired (unavailable)",
    icon: LuX,
  },
};

const StatusBadge = ({ status = "neutral", children }) => {
  const normalizedStatus = String(status).trim().toLowerCase();
  const mappedStatus = STATUS_MAP[normalizedStatus];

  // Preserve support for callers that pass a legacy style variant.
  const legacyVariant = STATUS_STYLES[normalizedStatus]
    ? normalizedStatus
    : "neutral";

  const variant = mappedStatus?.variant ?? legacyVariant;
  const style = STATUS_STYLES[variant];
  const label = children ?? mappedStatus?.label ?? status;
  const Icon = mappedStatus?.icon ?? style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-medium ${style.surface}`}
      data-status={mappedStatus ? normalizedStatus : variant}
    >
      <Icon
        aria-hidden="true"
        focusable="false"
        className="h-4 w-4 shrink-0"
      />
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
