
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import AddMedicinePage from "../../../src/pages/pharmacist/AddMedicinePage";
import { setupStore } from "../../../src/app/store";
import { mswState, resetMswState } from "../../msw/handlers";

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
      <MemoryRouter initialEntries={["/pharmacist/medicines/new"]}>
        <Routes>
          <Route
            path="/pharmacist/medicines/new"
            element={<AddMedicinePage />}
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

const fillValidMedicine = async (user) => {
  await user.type(screen.getByLabelText(/medicine name/i), "Paracetamol");
  await user.type(screen.getByLabelText(/generic name/i), "Acetaminophen");
  await user.type(screen.getByLabelText(/^category/i), "Analgesic");
  await user.type(screen.getByLabelText(/^unit \*/i), "tablet");
  await user.type(screen.getByLabelText(/unit price/i), "125.5");
  await user.type(
    screen.getByLabelText(/low-stock threshold/i),
    "10",
  );
  await user.type(
    screen.getByLabelText(/expiry date/i),
    "2027-12-31",
  );
};

afterEach(() => {
  resetMswState();
});

describe("AddMedicinePage", () => {
  it("creates a medicine and displays the success confirmation", async () => {
    const user = userEvent.setup();

    mswState.medicineCreateResponses = [
      {
        medicineId: 101,
        name: "Paracetamol",
        genericName: "Acetaminophen",
        category: "Analgesic",
        unit: "tablet",
        price: "125.5",
        stockQuantity: 0,
        expiryDate: "2027-12-31",
        reorderLevel: 10,
      },
    ];

    renderPage();
    await fillValidMedicine(user);

    await user.click(
      screen.getByRole("button", { name: /save medicine/i }),
    );

    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent(/medicine saved successfully/i);

    expect(screen.getByText(/Paracetamol has been added/i)).toBeInTheDocument();
    expect(mswState.medicineCreateHits).toHaveLength(1);

    const requestBody = mswState.medicineCreateHits[0].body;

    expect(requestBody).toMatchObject({
      name: "Paracetamol",
      genericName: "Acetaminophen",
      category: "Analgesic",
      unit: "tablet",
      price: "125.5",
      expiryDate: "2027-12-31",
      reorderLevel: 10,
    });

    expect(requestBody).not.toHaveProperty("stockQuantity");
  });

  it("shows inline errors and blocks submission when required fields are empty", async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(
      screen.getByRole("button", { name: /save medicine/i }),
    );

    expect(await screen.findByText("Medicine name is required.")).toBeInTheDocument();
    expect(screen.getByText("Category is required.")).toBeInTheDocument();
    expect(screen.getByText("Unit is required.")).toBeInTheDocument();
    expect(screen.getByText("Price is required.")).toBeInTheDocument();
    expect(
      screen.getByText("Low-stock threshold is required."),
    ).toBeInTheDocument();
    expect(screen.getByText("Expiry date is required.")).toBeInTheDocument();

    expect(mswState.medicineCreateHits).toHaveLength(0);
  });

  it("rejects zero and negative prices", async () => {
    const user = userEvent.setup();

    renderPage();
    await fillValidMedicine(user);

    const priceInput = screen.getByLabelText(/unit price/i);

    await user.clear(priceInput);
    await user.type(priceInput, "0");
    await user.click(
      screen.getByRole("button", { name: /save medicine/i }),
    );

    expect(
      await screen.findByText("Price must be greater than 0."),
    ).toBeInTheDocument();
    expect(mswState.medicineCreateHits).toHaveLength(0);

    await user.clear(priceInput);
    await user.type(priceInput, "-5");
    await user.click(
      screen.getByRole("button", { name: /save medicine/i }),
    );

    expect(
      screen.getByText("Price must be greater than 0."),
    ).toBeInTheDocument();
    expect(mswState.medicineCreateHits).toHaveLength(0);
  });

  it("rejects an expiry date in the past", async () => {
    const user = userEvent.setup();

    renderPage();
    await fillValidMedicine(user);

    const expiryInput = screen.getByLabelText(/expiry date/i);

    await user.clear(expiryInput);
    await user.type(expiryInput, "2020-01-01");

    await user.click(
      screen.getByRole("button", { name: /save medicine/i }),
    );

    expect(
      await screen.findByText("Expiry date cannot be in the past."),
    ).toBeInTheDocument();

    expect(mswState.medicineCreateHits).toHaveLength(0);
  });

  it("shows a duplicate medicine error when the API returns 409", async () => {
    const user = userEvent.setup();

    mswState.medicineCreateErrorMode = "conflict";

    renderPage();
    await fillValidMedicine(user);

    await user.click(
      screen.getByRole("button", { name: /save medicine/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /already exists|duplicate/i,
    );

    expect(mswState.medicineCreateHits).toHaveLength(1);
  });


it("disables the submit button while saving", async () => {
  const user = userEvent.setup();

  mswState.medicineCreateDelayMs = 1000;

  renderPage();
  await fillValidMedicine(user);

  await user.click(
    screen.getByRole("button", { name: /save medicine/i }),
  );

  const savingButton = await screen.findByRole("button", {
    name: /saving/i,
  });

  expect(savingButton).toBeDisabled();

  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent(
      /medicine saved successfully/i,
    );
  });
});

});
