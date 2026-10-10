
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const TOAST_STYLES = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

const Toast = ({
  message,
  type = "info",
  onClose,
  duration = 0,
  closeLabel,
  className = "",
}) => {
  const { t } = useTranslation();

  const resolvedCloseLabel =
    closeLabel ?? t("common.dismiss");

  useEffect(() => {
    if (!message || duration <= 0 || !onClose) return undefined;

    const timeoutId = setTimeout(onClose, duration);

    return () => clearTimeout(timeoutId);
  }, [message, duration, onClose]);

  if (!message) return null;

  const styles = TOAST_STYLES[type] ?? TOAST_STYLES.info;
  const role = type === "error" ? "alert" : "status";

  return (
    <div
      role={role}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`flex items-start justify-between gap-4 rounded-md border p-4 text-sm ${styles} ${className}`}
    >
      <p>{message}</p>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={resolvedCloseLabel}
          className="shrink-0 rounded px-2 py-1 font-medium hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Toast;
