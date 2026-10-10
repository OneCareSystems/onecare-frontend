import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";
import SearchBar from "../../src/components/SearchBar.jsx";
import en from "../../src/locales/en.json";

const testI18n = i18next.createInstance();

await testI18n.init({
  lng: "en",
  fallbackLng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

const renderSearchBar = (props = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <SearchBar {...props} />
    </I18nextProvider>,
  );

describe("SearchBar", () => {
  it("renders an accessible search input", () => {
    renderSearchBar();

    expect(screen.getByRole("searchbox", { name: "Search" }))
      .toBeInTheDocument();
  });

  it("calls onChange when text is entered", () => {
    const onChange = vi.fn();
    renderSearchBar({ onChange });

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "patient" },
    });

    expect(onChange).toHaveBeenCalledWith("patient");
  });

  it("submits the current search value", () => {
    const onSearch = vi.fn();
    renderSearchBar({ defaultValue: "patient", onSearch });

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith("patient");
  });

  it("clears the search value", () => {
    const onChange = vi.fn();
    const onSearch = vi.fn();

    renderSearchBar({ defaultValue: "patient", onChange, onSearch });

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(onChange).toHaveBeenCalledWith("");
    expect(onSearch).toHaveBeenCalledWith("");
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("can be disabled", () => {
    renderSearchBar({ disabled: true });

    expect(screen.getByRole("searchbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
  });

  it("supports a custom placeholder", () => {
    renderSearchBar({ placeholder: "Search patients" });

    expect(screen.getByPlaceholderText("Search patients"))
      .toBeInTheDocument();
  });
});
