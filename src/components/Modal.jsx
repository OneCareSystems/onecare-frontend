import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  closeLabel,
  className = "",
}) => {
  const { t } = useTranslation();
  const resolvedCloseLabel = closeLabel ?? t("common.close");

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`w-full max-w-lg rounded-lg bg-white p-6 shadow-xl ${className}`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="modal-title" className="text-lg font-semibold">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label={resolvedCloseLabel}
            className="rounded p-2 text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div>{children}</div>
      </section>
    </div>
  );
};

export default Modal;
