import { describe, it, expect, vi,beforeEach} from "vitest";
import { render, screen, fireEvent,act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";
import Pagination from "../../src/components/Pagination.jsx";
import en from "../../src/locales/en.json";
import ta from "../../src/locales/ta.json";

const testI18n = i18next.createInstance();

await testI18n.init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: en },
    ta: { translation: ta },
  },
  interpolation: { escapeValue: false },
});

const renderPagination = (props = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <Pagination
        currentPage={2}
        totalPages={5}
        onPageChange={vi.fn()}
        {...props}
      />
    </I18nextProvider>,
  );

  beforeEach(async () => {
  await act(async () => {
    await testI18n.changeLanguage("en");
  });
});

describe("Pagination", () => {
  it("renders the current page and total pages", () => {
    renderPagination();

    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
  });

  it("goes to the previous page", () => {
    const onPageChange = vi.fn();
    renderPagination({ currentPage: 3, onPageChange });

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("goes to the next page", () => {
    const onPageChange = vi.fn();
    renderPagination({ currentPage: 2, onPageChange });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("disables Previous on the first page", () => {
    renderPagination({ currentPage: 1 });

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("disables Next on the last page", () => {
    renderPagination({ currentPage: 5 });

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("does not render when there are no pages", () => {
    renderPagination({ totalPages: 0 });

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("uses Tamil built-in text when Tamil is selected", async () => {
  await act(async () => {
    await testI18n.changeLanguage("ta");
  });

  renderPagination();

  expect(
    screen.getByRole("button", { name: ta.pagination.previous }),
  ).toBeInTheDocument();

  expect(
    screen.getByRole("button", { name: ta.pagination.next }),
  ).toBeInTheDocument();

  expect(
    screen.getByText(
      new RegExp(
        `${ta.pagination.page}.*${ta.pagination.of}`,
      ),
    ),
  ).toBeInTheDocument();
});
});

