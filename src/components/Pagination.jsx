import { useTranslation } from "react-i18next";
import Button from "./Button.jsx";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className = "",
}) => {
  const { t } = useTranslation();

  if (totalPages <= 0) return null;

  const page = Math.min(Math.max(1, currentPage), totalPages);

  return (
    <nav
      aria-label={`${t("pagination.page")} ${page} ${t("pagination.of")} ${totalPages}`}
      className={`flex items-center justify-center gap-4 ${className}`}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        {t("pagination.previous")}
      </Button>

      <span className="text-sm text-neutral-700" aria-live="polite">
        {t("pagination.page")} {page} {t("pagination.of")} {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {t("pagination.next")}
      </Button>
    </nav>
  );
};

export default Pagination;
