import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";

import ConfirmDialog from "../../src/components/ConfirmDialog.jsx";
import en from "../../src/locales/en.json";

const testI18n = i18next.createInstance();

await testI18n.init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      translation: en,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

const renderConfirmDialog = (props = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <ConfirmDialog {...props} />
    </I18nextProvider>
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ConfirmDialog", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: "Delete Medicine",
    message: "Are you sure you want to delete this medicine?",
  };

  it("renders the dialog title and message when open", () => {
    renderConfirmDialog(defaultProps);

    expect(
      screen.getByRole("dialog")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Delete Medicine")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Are you sure you want to delete this medicine?"
      )
    ).toBeInTheDocument();
  });

  it("does not render the dialog when closed", () => {
    renderConfirmDialog({
      ...defaultProps,
      isOpen: false,
    });

    expect(
      screen.queryByRole("dialog")
    ).not.toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = vi.fn();

    renderConfirmDialog({
      ...defaultProps,
      onConfirm,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Confirm" })
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the cancel button is clicked", () => {
    const onClose = vi.fn();

    renderConfirmDialog({
      ...defaultProps,
      onClose,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Cancel" })
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses custom confirm and cancel labels", () => {
    renderConfirmDialog({
      ...defaultProps,
      confirmLabel: "Delete",
      cancelLabel: "Keep",
    });

    expect(
      screen.getByRole("button", { name: "Delete" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Keep" })
    ).toBeInTheDocument();
  });

  it("does not call onConfirm while loading", () => {
    const onConfirm = vi.fn();

    renderConfirmDialog({
      ...defaultProps,
      onConfirm,
      loading: true,
    });

    const confirmButton = screen.getByRole("button", {
      name: "Confirm",
    });

    fireEvent.click(confirmButton);

    expect(onConfirm).not.toHaveBeenCalled();

    expect(
      screen.getByRole("button", { name: "Cancel" })
    ).toBeDisabled();
  });
});
