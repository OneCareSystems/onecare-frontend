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

import Tabs from "../../src/components/Tabs.jsx";
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

const renderTabs = (props = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <Tabs {...props} />
    </I18nextProvider>
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Tabs", () => {
  const tabs = [
    { id: "overview", label: "Overview", content: "Overview content" },
    { id: "details", label: "Details", content: "Details content" },
    { id: "history", label: "History", content: "History content" },
  ];

  it("renders all tab labels", () => {
    renderTabs({ tabs });

    expect(screen.getByRole("tab", { name: "Overview" }))
      .toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Details" }))
      .toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "History" }))
      .toBeInTheDocument();
  });

  it("shows the first tab content by default", () => {
    renderTabs({ tabs });

    expect(screen.getByRole("tabpanel"))
      .toHaveTextContent("Overview content");
    expect(screen.getByRole("tab", { name: "Overview" }))
      .toHaveAttribute("aria-selected", "true");
  });

  it("switches content when another tab is clicked", () => {
    renderTabs({ tabs });

    fireEvent.click(screen.getByRole("tab", { name: "Details" }));

    expect(screen.getByRole("tabpanel"))
      .toHaveTextContent("Details content");
    expect(screen.getByRole("tab", { name: "Details" }))
      .toHaveAttribute("aria-selected", "true");
  });

  it("calls onChange when a tab is selected", () => {
    const onChange = vi.fn();

    renderTabs({ tabs, onChange });

    fireEvent.click(screen.getByRole("tab", { name: "History" }));

    expect(onChange).toHaveBeenCalledWith("history");
  });

  it("supports a default active tab", () => {
    renderTabs({
      tabs,
      defaultActiveTab: "details",
    });

    expect(screen.getByRole("tabpanel"))
      .toHaveTextContent("Details content");
    expect(screen.getByRole("tab", { name: "Details" }))
      .toHaveAttribute("aria-selected", "true");
  });

  it("renders nothing when there are no tabs", () => {
    const { container } = renderTabs({ tabs: [] });

    expect(container.firstChild).toBeNull();
  });
});
