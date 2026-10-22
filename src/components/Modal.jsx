import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";

import Icon from "./Icon";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  closeLabel,
  className = "",
  bodyClassName = "",
  trapFocus = false,
  closeDisabled = false,
  returnFocusRef,
}) => {
  const { t } = useTranslation();
  const resolvedCloseLabel = closeLabel ?? t("common.close");
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !trapFocus) return;
    const opener = document.activeElement;
    const returnTarget = returnFocusRef?.current ?? opener;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = () =>
      [...dialog.querySelectorAll("*")].filter(
        (node) =>
          node.tabIndex >= 0 &&
          !node.matches(":disabled") &&
          !node.closest("[hidden]") &&
          !node.matches('input[type="hidden"]'),
      );
    const focusInside = () => (focusable()[0] ?? dialog).focus();
    focusInside();
    const containFocus = (event) => {
      if (!dialog.contains(event.target)) focusInside();
    };
    const trap = (event) => {
      if (event.key !== "Tab") return;
      const targets = focusable();
      const first = targets[0],
        last = targets.at(-1);
      if (
        !targets.length ||
        (event.shiftKey && document.activeElement === first) ||
        (!event.shiftKey && document.activeElement === last)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    };
    document.addEventListener("focusin", containFocus);
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("focusin", containFocus);
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = previousOverflow;
      if (returnTarget?.isConnected) returnTarget.focus();
    };
  }, [isOpen, trapFocus, returnFocusRef]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !event.defaultPrevented && !closeDisabled) {
        closeRef.current?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeDisabled]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) {
          onClose?.();
        }
      }}
    >
      <section
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full max-w-lg rounded-lg bg-white p-6 shadow-xl ${className}`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label={resolvedCloseLabel}
            className="rounded p-2 text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className={bodyClassName}>{children}</div>
      </section>
    </div>
  );
};

export default Modal;
