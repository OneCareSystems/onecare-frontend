import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";
import Select from "../../src/components/Select.jsx";
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

const renderSelect = (props = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <Select
        id="status"
        name="status"
        label="Status"
        options={[
          { value: "scheduled", label: "Scheduled" },
          { value: "completed", label: "Completed" },
        ]}
        {...props}
      />
    </I18nextProvider>,
  );

describe("Select", () => {
  it("renders its label and options", () => {
    renderSelect();

    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Scheduled" }))
      .toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Completed" }))
      .toBeInTheDocument();
  });

  it("calls onChange when an option is selected", () => {
    const handleChange = vi.fn();
    renderSelect({ onChange: handleChange });

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "completed" },
    });

    expect(handleChange).toHaveBeenCalledOnce();
  });

  it("shows required validation after blur", () => {
    renderSelect({ required: true });
fireEvent.blur(screen.getByRole("combobox", { name: /Status/ }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This field is required.",
    );
  });

  it("shows an error for a submitted invalid field", () => {
    renderSelect({ required: true, submitted: true });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This field is required.",
    );
  });

  it("does not show required validation for a selected value", () => {
    renderSelect({ required: true, defaultValue: "scheduled" });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("can be disabled", () => {
    renderSelect({ disabled: true });

    expect(screen.getByRole("combobox", { name: /Status/ })).toBeDisabled();
  });
});
