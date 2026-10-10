
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";

import Table from "../../src/components/Table.jsx";
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

const renderTable = (props = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <Table {...props} />
    </I18nextProvider>
  );

const columns = [
  { key: "name", header: "Name" },
  { key: "status", header: "Status" },
];

const data = [
  { id: 1, name: "Kumar", status: "Active" },
  { id: 2, name: "Nila", status: "Inactive" },
];

describe("Table", () => {
  it("renders column headers", () => {
    renderTable({ columns, data });

    expect(
      screen.getByRole("columnheader", { name: "Name" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("columnheader", { name: "Status" })
    ).toBeInTheDocument();
  });

  it("renders row data", () => {
    renderTable({ columns, data });

    expect(screen.getByText("Kumar")).toBeInTheDocument();
    expect(screen.getByText("Nila")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders EmptyState when there is no data", () => {
    renderTable({ columns, data: [] });

    expect(
      screen.getByText("No results found")
    ).toBeInTheDocument();
  });

  it("renders a dash for missing cell values", () => {
    renderTable({
      columns,
      data: [{ id: 1, name: "Kumar" }],
    });

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("supports custom cell rendering", () => {
    const customColumns = [
      {
        key: "name",
        header: "Name",
        render: (row) => `Patient: ${row.name}`,
      },
    ];

    renderTable({
      columns: customColumns,
      data: [{ id: 1, name: "Kumar" }],
    });

    expect(
      screen.getByText("Patient: Kumar")
    ).toBeInTheDocument();
  });
});
