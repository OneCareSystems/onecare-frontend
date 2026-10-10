
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import Input from "../../src/components/Input.jsx";
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

  await testI18n.changeLanguage("en");
});

const renderWithI18n = (ui, language = "en") => {
  testI18n.changeLanguage(language);

  return render(
    <I18nextProvider i18n={testI18n}>
      {ui}
    </I18nextProvider>,
  );
};

describe("Input", () => {
  it("renders an accessible label", () => {
    renderWithI18n(
      <Input
        id="patientName"
        name="patientName"
        label="Patient name"
      />,
    );

    expect(
      screen.getByRole("textbox", { name: "Patient name" }),
    ).toBeInTheDocument();
  });

  it("shows required validation after the field loses focus", () => {
    renderWithI18n(
      <Input
        id="patientName"
        name="patientName"
        label="Patient name"
        required
      />,
    );

    const input = screen.getByRole("textbox", {
      name: "Patient name",
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.blur(input);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This field is required.",
    );

    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("shows separate validation messages for multiple invalid fields on submit", () => {
    renderWithI18n(
      <>
        <Input
          id="patientName"
          name="patientName"
          label="Patient name"
          required
          submitted
        />

        <Input
          id="email"
          name="email"
          label="Email"
          required
          submitted
        />
      </>,
    );

    expect(screen.getAllByRole("alert")).toHaveLength(2);

    expect(
      screen.getByRole("textbox", { name: /Patient name/ }),
    ).toHaveAttribute("aria-invalid", "true");

    expect(
      screen.getByRole("textbox", { name: /Email/ }),
    ).toHaveAttribute("aria-invalid", "true");
  });

  it("does not show required validation for a non-empty value", () => {
    renderWithI18n(
      <Input
        id="patientName"
        name="patientName"
        label="Patient name"
        defaultValue="Kamal"
        required
        submitted
      />,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the required validation message in Tamil", () => {
    renderWithI18n(
      <Input
        id="patientName"
        name="patientName"
        label="நோயாளியின் பெயர்"
        required
      />,
      "ta",
    );

    fireEvent.blur(
      screen.getByRole("textbox", { name: "நோயாளியின் பெயர்" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "இந்தப் புலத்தை நிரப்புவது அவசியம்.",
    );
  });
});
