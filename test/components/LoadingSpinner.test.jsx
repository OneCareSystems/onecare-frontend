
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";

import LoadingSpinner from "../../src/components/LoadingSpinner.jsx";
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

const renderSpinner = (props = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <LoadingSpinner {...props} />
    </I18nextProvider>
  );

describe("LoadingSpinner", () => {
  it("renders the translated default loading label", () => {
    renderSpinner();

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading..."
    );
  });

  it("supports a custom label", () => {
    renderSpinner({ label: "Loading patients" });

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading patients"
    );
  });

  it("supports small, medium, and large sizes", () => {
    const { rerender, container } = renderSpinner({ size: "sm" });

    expect(container.querySelector(".h-4.w-4")).toBeInTheDocument();

    rerender(
      <I18nextProvider i18n={testI18n}>
        <LoadingSpinner size="md" />
      </I18nextProvider>
    );
    expect(container.querySelector(".h-8.w-8")).toBeInTheDocument();

    rerender(
      <I18nextProvider i18n={testI18n}>
        <LoadingSpinner size="lg" />
      </I18nextProvider>
    );
    expect(container.querySelector(".h-12.w-12")).toBeInTheDocument();
  });

  it("uses the medium size for an unknown size", () => {
    const { container } = renderSpinner({ size: "unknown" });

    expect(container.querySelector(".h-8.w-8")).toBeInTheDocument();
  });
});
