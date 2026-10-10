
import { useTranslation } from "react-i18next";

const LoadingSpinner = ({
  label,
  size = "md",
  className = "",
}) => {
  const { t } = useTranslation();

  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-[3px]",
    lg: "h-12 w-12 border-4",
  };

  const spinnerSize = sizes[size] ?? sizes.md;
  const resolvedLabel = label ?? t("common.loading");

  return (
    <div
      role="status"
      aria-label={resolvedLabel}
      className={`inline-flex items-center gap-3 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`animate-spin rounded-full border-primary-600 border-r-transparent ${spinnerSize}`}
      />
      <span className="sr-only">{resolvedLabel}</span>
    </div>
  );
};

export default LoadingSpinner;
