
import { useTranslation } from "react-i18next";

const EmptyState = ({
  title,
  message,
  description,
  action,
}) => {
  const { t } = useTranslation();

  const displayTitle = title ?? t("emptyState.title");
  const displayMessage =
    message ?? description ?? t("emptyState.description");

  return (
    <section
      className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-xl text-neutral-600"
      >
        ∅
      </span>

      <h2 className="text-lg font-semibold text-neutral-900">
        {displayTitle}
      </h2>

      <p className="max-w-md text-sm text-neutral-600">
        {displayMessage}
      </p>

      {action && <div className="mt-2">{action}</div>}
    </section>
  );
};

export default EmptyState;
