
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import EmptyState from "../../src/components/EmptyState.jsx";
import en from "../../src/locales/en.json";
import ta from "../../src/locales/ta.json";


const testI18n = i18n.createInstance();

beforeEach(async () => {
  await testI18n.init({
    resources: {
      en: { translation: en },
      ta: { translation: ta },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
});

const renderEmptyState = (ui, language = "en") => {
  testI18n.changeLanguage(language);

  return render(
    <I18nextProvider i18n={testI18n}>
      {ui}
    </I18nextProvider>,
  );
};

describe("EmptyState", () => {
  it("renders the default English empty state", () => {
    renderEmptyState(<EmptyState />);

    expect(
      screen.getByRole("heading", { name: "No results found" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("There is no data to display yet."),
    ).toBeInTheDocument();
  });

  it("renders Tamil messages when language is ta", () => {
    renderEmptyState(<EmptyState />, "ta");

    expect(
      screen.getByRole("heading", {
        name: "முடிவுகள் எதுவும் கிடைக்கவில்லை",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("காண்பிப்பதற்கான தரவு தற்போது இல்லை."),
    ).toBeInTheDocument();
  });

  it("renders custom title and message", () => {
    renderEmptyState(
      <EmptyState
        title="No appointments"
        message="Try changing the selected date."
      />,
    );

    expect(
      screen.getByRole("heading", { name: "No appointments" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Try changing the selected date."),
    ).toBeInTheDocument();
  });

  it("renders an optional action", () => {
    renderEmptyState(
      <EmptyState
        title="No results"
        action={<button type="button">Retry</button>}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Retry" }),
    ).toBeInTheDocument();
  });

  it("exposes the empty state to assistive technology", () => {
    renderEmptyState(<EmptyState />);

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });
});
