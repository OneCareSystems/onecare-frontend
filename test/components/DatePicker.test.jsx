import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";
import DatePicker from "../../src/components/DatePicker.jsx";
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

const renderDatePicker = (props = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <DatePicker
        id="appointmentDate"
        name="appointmentDate"
        label="Appointment date"
        {...props}
      />
    </I18nextProvider>,
  );

describe("DatePicker", () => {
  it("renders a labeled date input", () => {
    renderDatePicker();

    expect(
      screen.getByLabelText(/Appointment date/),
    ).toHaveAttribute("type", "date");
  });

  it("calls onChange when the date changes", () => {
    const handleChange = vi.fn();
    renderDatePicker({ onChange: handleChange });

    fireEvent.change(screen.getByLabelText(/Appointment date/), {
      target: { value: "2026-10-15" },
    });

    expect(handleChange).toHaveBeenCalledOnce();
  });

  it("shows required validation after blur", () => {
    renderDatePicker({ required: true });

    fireEvent.blur(screen.getByLabelText(/Appointment date/));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This field is required.",
    );
  });

  it("shows an error for a submitted invalid field", () => {
    renderDatePicker({ required: true, submitted: true });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This field is required.",
    );
  });

  it("does not show required validation when a date is selected", () => {
    renderDatePicker({
      required: true,
      defaultValue: "2026-10-15",
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("supports minimum and maximum dates", () => {
    renderDatePicker({
      min: "2026-10-01",
      max: "2026-10-31",
    });

    const input = screen.getByLabelText(/Appointment date/);

    expect(input).toHaveAttribute("min", "2026-10-01");
    expect(input).toHaveAttribute("max", "2026-10-31");
  });

  it("can be disabled", () => {
    renderDatePicker({ disabled: true });

    expect(screen.getByLabelText(/Appointment date/)).toBeDisabled();
  });
});
