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
    icon: "✕",
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

/**
 * Status is conveyed by an icon and a text label as well as colour
 * (SDS §2.4.10 — no colour-only indicators).
 */
const StatusBadge = ({ status = "neutral", children }) => {
  const key = STATUS_STYLES[status] ? status : "neutral";
  const style = STATUS_STYLES[key];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${style.surface}`}
      data-status={key}
    >
      <span
        aria-hidden="true"
        className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-0 text-xs font-bold"
      >
        {style.icon}
      </span>
      <span>{children}</span>
    </span>
  );
};

export default StatusBadge;
