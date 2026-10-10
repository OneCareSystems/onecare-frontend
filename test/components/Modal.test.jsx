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

import Modal from "../../src/components/Modal.jsx";
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

const renderModal = (props = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <Modal {...props} />
    </I18nextProvider>
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Modal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: "Confirm",
    children: "Content",
  };

  it("does not render when closed", () => {
    renderModal({
      ...defaultProps,
      isOpen: false,
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders its title and content when open", () => {
    renderModal(defaultProps);

    expect(screen.getByRole("heading", { name: "Confirm" }))
      .toBeInTheDocument();

    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("exposes modal dialog semantics", () => {
    renderModal(defaultProps);

    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-modal",
      "true"
    );
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();

    renderModal({
      ...defaultProps,
      onClose,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Close" })
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();

    renderModal({
      ...defaultProps,
      onClose,
    });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();

    const { container } = renderModal({
      ...defaultProps,
      onClose,
    });

    fireEvent.mouseDown(container.firstChild);

    expect(onClose).toHaveBeenCalledOnce();
  });
});
