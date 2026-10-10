
import { useTranslation } from "react-i18next";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  loading = false,
}) => {
  const { t } = useTranslation();

  const resolvedConfirmLabel =
    confirmLabel ?? t("common.confirm");
  const resolvedCancelLabel =
    cancelLabel ?? t("common.cancel");

  const handleConfirm = () => {
    if (!loading) {
      onConfirm?.();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          {message}
        </p>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {resolvedCancelLabel}
          </Button>

          <Button
            type="button"
            variant={variant}
            onClick={handleConfirm}
            loading={loading}
          >
            {resolvedConfirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
