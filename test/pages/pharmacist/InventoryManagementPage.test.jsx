
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InventoryManagementPage from "../../../src/pages/pharmacist/InventoryManagementPage";
import {
  adjustMedicineStock,
  getLowStockMedicines,
  getNearExpiryMedicines,
  searchMedicines,
} from "../../../src/services/medicineService";

vi.mock("../../../src/services/medicineService", () => ({
  searchMedicines: vi.fn(),
  getLowStockMedicines: vi.fn(),
  getNearExpiryMedicines: vi.fn(),
  adjustMedicineStock: vi.fn(),
}));

const medicines = [
  {
    medicineId: 1,
    name: "Paracetamol",
    stockQuantity: 50,
    reorderLevel: 10,
    expiryDate: "2027-12-31",
    isQuarantined: false,
  },
  {
    medicineId: 2,
    name: "Amoxicillin",
    stockQuantity: 5,
    reorderLevel: 10,
    expiryDate: "2026-11-01",
    isQuarantined: false,
  },
];

const renderPage = () => render(<InventoryManagementPage />);

describe("InventoryManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchMedicines.mockResolvedValue(medicines);
    getLowStockMedicines.mockResolvedValue([medicines[1]]);
    getNearExpiryMedicines.mockResolvedValue([]);
    adjustMedicineStock.mockResolvedValue({
      ...medicines[0],
      stockQuantity: 60,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("loads and displays the medicine inventory", async () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Inventory Management" }),
    ).toBeInTheDocument();

    expect(
      await screen.findByText("Paracetamol"),
    ).toBeInTheDocument();

    expect(screen.getByText("Amoxicillin")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(searchMedicines).toHaveBeenCalledWith(
      "",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("searches medicines by name", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Paracetamol");

    await user.type(
      screen.getByRole("searchbox", { name: "Search medicines" }),
      "Para",
    );

    await waitFor(() => {
      expect(searchMedicines).toHaveBeenLastCalledWith(
        "Para",
        expect.objectContaining({ signal: expect.anything() }),
      );
    });

    expect(await screen.findByText("Paracetamol")).toBeInTheDocument();
    expect(screen.queryByText("Amoxicillin")).not.toBeInTheDocument();
  });

  it("loads low-stock medicines when the filter changes", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Paracetamol");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter inventory" }),
      "low",
    );

    expect(await screen.findByText("Amoxicillin")).toBeInTheDocument();

    await waitFor(() => {
      expect(getLowStockMedicines).toHaveBeenCalled();
    });

    expect(screen.queryByText("Paracetamol")).not.toBeInTheDocument();
  });

  it("loads near-expiry medicines when selected", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Paracetamol");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter inventory" }),
      "near",
    );

    await waitFor(() => {
      expect(getNearExpiryMedicines).toHaveBeenCalled();
    });

    expect(
      await screen.findByText("No medicines found"),
    ).toBeInTheDocument();
  });

  it("shows an error and retries when inventory loading fails", async () => {
    const user = userEvent.setup();
    searchMedicines.mockRejectedValueOnce(new Error("Network error"));

    renderPage();

    expect(
      await screen.findByText("Unable to load inventory"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(searchMedicines).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText("Paracetamol")).toBeInTheDocument();
  });

  it("rejects a zero stock adjustment", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Paracetamol");

    await user.click(
      screen.getAllByRole("button", { name: "Adjust stock" })[0],
    );

    await user.type(screen.getByLabelText("Stock change"), "0");
    await user.type(
      screen.getByLabelText("Reason for adjustment"),
      "Stock count correction",
    );

    await user.click(
      screen.getByRole("button", { name: "Confirm adjustment" }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Enter a non-zero whole-number stock change.");

    expect(adjustMedicineStock).not.toHaveBeenCalled();
  });

  it("requires a reason for a stock adjustment", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Paracetamol");

    await user.click(
      screen.getAllByRole("button", { name: "Adjust stock" })[0],
    );

    await user.type(screen.getByLabelText("Stock change"), "10");

    // The browser's required-field validation prevents empty submission.
    expect(
      screen.getByLabelText("Reason for adjustment"),
    ).toBeRequired();

    expect(adjustMedicineStock).not.toHaveBeenCalled();
  });

  it("rejects an adjustment that would make stock negative", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Paracetamol");

    await user.click(
      screen.getAllByRole("button", { name: "Adjust stock" })[1],
    );

    await user.type(screen.getByLabelText("Stock change"), "-6");
    await user.type(
      screen.getByLabelText("Reason for adjustment"),
      "Damaged stock",
    );

    await user.click(
      screen.getByRole("button", { name: "Confirm adjustment" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Stock cannot become negative. Current quantity: 5.",
    );

    expect(adjustMedicineStock).not.toHaveBeenCalled();
  });

  it("submits a valid stock adjustment and displays success", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Paracetamol");

    await user.click(
      screen.getAllByRole("button", { name: "Adjust stock" })[0],
    );

    await user.type(screen.getByLabelText("Stock change"), "10");
    await user.type(
      screen.getByLabelText("Reason for adjustment"),
      "New stock received",
    );

    await user.click(
      screen.getByRole("button", { name: "Confirm adjustment" }),
    );

    await waitFor(() => {
      expect(adjustMedicineStock).toHaveBeenCalledWith(1, 10);
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Stock updated successfully",
    );

    expect(adjustMedicineStock).toHaveBeenCalledTimes(1);
  });

  it("shows a permission error when stock adjustment returns 403", async () => {
    const user = userEvent.setup();
    adjustMedicineStock.mockRejectedValueOnce({
      response: { status: 403 },
    });

    renderPage();

    await screen.findByText("Paracetamol");

    await user.click(
      screen.getAllByRole("button", { name: "Adjust stock" })[0],
    );

    await user.type(screen.getByLabelText("Stock change"), "5");
    await user.type(
      screen.getByLabelText("Reason for adjustment"),
      "Stock received",
    );

    await user.click(
      screen.getByRole("button", { name: "Confirm adjustment" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to update medicine stock.",
    );
  });
});
