
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";

import Toast from "../../src/components/Toast.jsx";
import en from "../../src/locales/en.json";

const testI18n = i18next.createInstance();

await testI18n.init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: en },
  },
  interpolation: { escapeValue: false },
});

const renderToast = (props = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <Toast {...props} />
    </I18nextProvider>
  );

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Toast", () => {
  it("renders the notification message", () => {
    renderToast({ message: "Patient saved successfully" });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Patient saved successfully"
    );
  });

  it("uses an alert role for error notifications", () => {
    renderToast({
      type: "error",
      message: "Unable to save patient",
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to save patient"
    );
  });

  it("supports success, warning, and info notification types", () => {
    const { rerender } = renderToast({
      type: "success",
      message: "Saved",
    });

    expect(screen.getByRole("status")).toHaveClass("bg-green-50");

    rerender(
      <I18nextProvider i18n={testI18n}>
        <Toast type="warning" message="Check details" />
      </I18nextProvider>
    );

    expect(screen.getByRole("status")).toHaveClass("bg-amber-50");

    rerender(
      <I18nextProvider i18n={testI18n}>
        <Toast type="info" message="Information" />
      </I18nextProvider>
    );

    expect(screen.getByRole("status")).toHaveClass("bg-blue-50");
  });

  it("calls onClose when the dismiss button is clicked", () => {
    const onClose = vi.fn();

    renderToast({
      message: "Saved",
      onClose,
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Dismiss notification",
      })
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose after the configured duration", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    renderToast({
      message: "Saved",
      onClose,
      duration: 3000,
    });

    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders nothing when the message is empty", () => {
    const { container } = renderToast({ message: "" });

    expect(container.firstChild).toBeNull();
  });
});
