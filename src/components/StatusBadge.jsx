const STATUS_STYLES = {
  success: {
    surface: "bg-success-100 text-success-800 border-success-200",
    icon: "✓",
  },
  warning: {
    surface: "bg-warning-100 text-warning-900 border-warning-200",
    icon: "!",
  },
  danger: {
    surface: "bg-danger-100 text-danger-800 border-danger-200",
    icon: "×",
  },
  info: {
    surface: "bg-primary-100 text-primary-800 border-primary-200",
    icon: "i",
  },
  neutral: {
    surface: "bg-neutral-100 text-neutral-800 border-neutral-200",
    icon: "•",
  },
};

const STATUS_MAP = {
  scheduled: { variant: "info", label: "Scheduled", icon: "◷" },
  completed: { variant: "success", label: "Completed", icon: "✓" },
  cancelled: { variant: "danger", label: "Cancelled", icon: "×" },
  "no-show": { variant: "warning", label: "No-show", icon: "!" },

  arrived: { variant: "info", label: "Arrived", icon: "✓" },

  pending: { variant: "warning", label: "Pending", icon: "◷" },
  paid: { variant: "success", label: "Paid", icon: "✓" },

  "pending dispense": {
    variant: "warning",
    label: "Pending Dispense",
    icon: "◷",
  },
  "partially dispensed": {
    variant: "info",
    label: "Partially Dispensed",
    icon: "½",
  },
  "fully dispensed": {
    variant: "success",
    label: "Fully Dispensed",
    icon: "✓",
  },
  "dispensed (external)": {
    variant: "neutral",
    label: "Dispensed (External)",
    icon: "↗",
  },

  "low stock": { variant: "warning", label: "Low stock", icon: "!" },
  "near expiry": { variant: "warning", label: "Near expiry", icon: "◷" },
  expired: { variant: "danger", label: "Expired (unavailable)", icon: "×" },
};

const StatusBadge = ({ status = "neutral", children }) => {
  const normalizedStatus = String(status).trim().toLowerCase();

  const mappedStatus = STATUS_MAP[normalizedStatus];

  const legacyVariant = STATUS_STYLES[normalizedStatus]
    ? normalizedStatus
    : "neutral";

  const variant = mappedStatus?.variant ?? legacyVariant;
  const style = STATUS_STYLES[variant];

  const label = children ?? mappedStatus?.label ?? status;

  const icon = mappedStatus?.icon ?? style.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${style.surface}`}
      data-status={mappedStatus ? normalizedStatus : variant}
    >
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-0 text-xs font-bold"
      >
        {icon}
      </span>

      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;