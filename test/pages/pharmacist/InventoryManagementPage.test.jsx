import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
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
    expiryDate: "2027-11-01",
    isQuarantined: false,
  },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <InventoryManagementPage />
    </MemoryRouter>,
  );

// Desktop rows and mobile cards coexist in jsdom; scope inventory assertions
// to the table so responsive copies do not make medicine queries ambiguous.
const inventory = () => within(screen.getByRole("table"));
const findMedicine = (name) => waitFor(() => inventory().getByText(name));
const adjustStock = (user, name) =>
  user.click(
    within(inventory().getByText(name).closest("tr")).getByRole("button", {
      name: "Adjust",
      exact: true,
    }),
  );

const changeAdjustment = (label, value) => {
  const input = within(
    screen.getByRole("dialog", { name: "Adjust stock" }),
  ).getByLabelText(label);
  fireEvent.change(input, { target: { value } });
};

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

    expect(await findMedicine("Paracetamol")).toBeInTheDocument();

    expect(inventory().getByText("Amoxicillin")).toBeInTheDocument();
    expect(inventory().getByText("50")).toBeInTheDocument();
    expect(searchMedicines).toHaveBeenCalledWith(
      "",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("searches medicines by name", async () => {
    const user = userEvent.setup();
    renderPage();

    await findMedicine("Paracetamol");

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

    expect(await findMedicine("Paracetamol")).toBeInTheDocument();
    expect(inventory().queryByText("Amoxicillin")).not.toBeInTheDocument();
  });

  it("loads low-stock medicines when the filter changes", async () => {
    const user = userEvent.setup();
    renderPage();

    await findMedicine("Paracetamol");

    await user.click(screen.getByRole("tab", { name: "Low stock" }));

    expect(await findMedicine("Amoxicillin")).toBeInTheDocument();

    await waitFor(() => {
      expect(getLowStockMedicines).toHaveBeenCalled();
    });

    expect(inventory().queryByText("Paracetamol")).not.toBeInTheDocument();
  });

  it("loads near-expiry medicines when selected", async () => {
    const user = userEvent.setup();
    renderPage();

    await findMedicine("Paracetamol");

    await user.click(screen.getByRole("tab", { name: "Near expiry" }));

    await waitFor(() => {
      expect(getNearExpiryMedicines).toHaveBeenCalled();
    });

    expect(await screen.findByText("No medicines found")).toBeInTheDocument();
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

    expect(await findMedicine("Paracetamol")).toBeInTheDocument();
  });

  it("rejects a zero stock adjustment", async () => {
    const user = userEvent.setup();
    renderPage();

    await findMedicine("Paracetamol");

    await adjustStock(user, "Paracetamol");

    changeAdjustment("Stock change", "0");
    changeAdjustment("Reason for adjustment", "Stock count correction");

    await user.click(
      screen.getByRole("button", { name: "Confirm adjustment" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a non-zero whole-number stock change.",
    );

    expect(adjustMedicineStock).not.toHaveBeenCalled();
  });

  it("requires a reason for a stock adjustment", async () => {
    const user = userEvent.setup();
    renderPage();

    await findMedicine("Paracetamol");

    await adjustStock(user, "Paracetamol");

    changeAdjustment("Stock change", "10");

    // The browser's required-field validation prevents empty submission.
    expect(screen.getByLabelText("Reason for adjustment")).toBeRequired();

    expect(adjustMedicineStock).not.toHaveBeenCalled();
  });

  it("rejects an adjustment that would make stock negative", async () => {
    const user = userEvent.setup();
    renderPage();

    await findMedicine("Paracetamol");

    await adjustStock(user, "Amoxicillin");

    changeAdjustment("Stock change", "-6");
    changeAdjustment("Reason for adjustment", "Damaged stock");

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

    await findMedicine("Paracetamol");

    await adjustStock(user, "Paracetamol");

    changeAdjustment("Stock change", "10");
    changeAdjustment("Reason for adjustment", "New stock received");

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

    await findMedicine("Paracetamol");

    await adjustStock(user, "Paracetamol");

    changeAdjustment("Stock change", "5");
    changeAdjustment("Reason for adjustment", "Stock received");

    await user.click(
      screen.getByRole("button", { name: "Confirm adjustment" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to update medicine stock.",
    );
  });
});
