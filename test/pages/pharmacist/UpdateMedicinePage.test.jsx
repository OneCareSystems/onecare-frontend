
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import UpdateMedicinePage from "../../../src/pages/pharmacist/UpdateMedicinePage";
import { setupStore } from "../../../src/app/store";
import { mswState, resetMswState } from "../../msw/handlers";

const medicine = {
  medicineId: 101,
  name: "Paracetamol",
  genericName: "Acetaminophen",
  category: "Analgesic",
  unit: "tablet",
  price: 125.5,
  stockQuantity: 50,
  expiryDate: "2027-12-31",
  reorderLevel: 10,
  isQuarantined: false,
};

const renderPage = () => {
  const testStore = setupStore({
    auth: {
      accessToken: "test-token",
      role: "PHARMACIST",
      authStatus: "authenticated",
    },
  });

  return render(
    <Provider store={testStore}>
      <MemoryRouter initialEntries={["/pharmacist/medicines/101/edit"]}>
        <Routes>
          <Route
            path="/pharmacist/medicines/:medicineId/edit"
            element={<UpdateMedicinePage />}
          />
          <Route
            path="/pharmacist/inventory"
            element={<h1>Inventory page</h1>}
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

const loadMedicine = () => {
  mswState.medicineByIdResponses = [{ ...medicine }];
};

const fillUpdatedMedicine = async (user) => {
  const nameInput = await screen.findByLabelText(/medicine name/i);

  await user.clear(nameInput);
  await user.type(nameInput, "Paracetamol Forte");

  const priceInput = screen.getByLabelText(/unit price/i);
  await user.clear(priceInput);
  await user.type(priceInput, "150");

  const categoryInput = screen.getByLabelText(/^category/i);
  await user.clear(categoryInput);
  await user.type(categoryInput, "Analgesic");
};

afterEach(() => {
  resetMswState();
  vi.restoreAllMocks();
});

describe("UpdateMedicinePage", () => {
  it("loads and displays existing medicine details", async () => {
    loadMedicine();

    renderPage();

    expect(
      await screen.findByRole("heading", { name: /update medicine/i }),
    ).toBeInTheDocument();

    expect(await screen.findByLabelText(/medicine name/i)).toHaveValue(
      "Paracetamol",
    );
    expect(screen.getByLabelText(/generic name/i)).toHaveValue(
      "Acetaminophen",
    );
    expect(screen.getByLabelText(/unit price/i)).toHaveValue(125.5);
    expect(mswState.medicineByIdHits).toHaveLength(1);
    expect(mswState.medicineByIdHits[0].id).toBe("101");
  });

  it("keeps stock quantity read-only while editing", async () => {
    loadMedicine();

    renderPage();

    const stockInput = await screen.findByLabelText(/current stock/i);

    expect(stockInput).toHaveValue(50);
    expect(stockInput).toHaveAttribute("readonly");
    expect(
      screen.getByRole("button", { name: /update medicine/i }),
    ).toBeInTheDocument();
  });

  it("updates medicine details and displays confirmation", async () => {
    const user = userEvent.setup();
    loadMedicine();

    renderPage();
    await fillUpdatedMedicine(user);

    await user.click(
      screen.getByRole("button", { name: /update medicine/i }),
    );

    expect(
      await screen.findByText(/medicine details updated successfully/i),
    ).toBeInTheDocument();

    expect(mswState.medicineUpdateHits).toHaveLength(1);
    expect(mswState.medicineUpdateHits[0]).toMatchObject({
      id: "101",
      body: {
        name: "Paracetamol Forte",
        genericName: "Acetaminophen",
        category: "Analgesic",
        unit: "tablet",
        price: 150,
        expiryDate: "2027-12-31",
        reorderLevel: 10,
      },
    });

    expect(mswState.medicineUpdateHits[0].body).not.toHaveProperty(
      "stockQuantity",
    );
  });

  it("shows an API error and preserves entered form data", async () => {
    const user = userEvent.setup();
    loadMedicine();
    mswState.medicineUpdateErrorMode = "server-error";

    renderPage();
    await fillUpdatedMedicine(user);

    await user.click(
      screen.getByRole("button", { name: /update medicine/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to update medicine/i,
    );

    expect(screen.getByLabelText(/medicine name/i)).toHaveValue(
      "Paracetamol Forte",
    );
    expect(screen.getByLabelText(/unit price/i)).toHaveValue(150);
    expect(mswState.medicineUpdateHits).toHaveLength(1);
  });

  it("deactivates the medicine after confirmation", async () => {
    const user = userEvent.setup();
    loadMedicine();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();

    await screen.findByLabelText(/medicine name/i);
    await user.click(
      screen.getByRole("button", { name: /deactivate medicine/i }),
    );

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Paracetamol"),
    );

    expect(
      await screen.findByRole("heading", { name: /inventory page/i }),
    ).toBeInTheDocument();

    expect(mswState.medicineDeactivateHits).toHaveLength(1);
    expect(mswState.medicineDeactivateHits[0].id).toBe("101");
  });

  it("shows a clear error when pending prescriptions prevent deactivation", async () => {
    const user = userEvent.setup();
    loadMedicine();
    mswState.medicineDeactivateErrorMode = "pending-prescriptions";
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();

    await screen.findByLabelText(/medicine name/i);
    await user.click(
      screen.getByRole("button", { name: /deactivate medicine/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /pending prescriptions/i,
    );

    expect(mswState.medicineDeactivateHits).toHaveLength(1);
  });

  it("does not deactivate when the user cancels confirmation", async () => {
    const user = userEvent.setup();
    loadMedicine();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    renderPage();

    await screen.findByLabelText(/medicine name/i);
    await user.click(
      screen.getByRole("button", { name: /deactivate medicine/i }),
    );

    expect(mswState.medicineDeactivateHits).toHaveLength(0);
    expect(
      screen.getByRole("heading", { name: /update medicine/i }),
    ).toBeInTheDocument();
  });
});
