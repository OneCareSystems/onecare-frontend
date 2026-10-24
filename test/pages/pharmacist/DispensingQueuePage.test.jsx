
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import DispensingQueuePage from "../../../src/pages/pharmacist/DispensingQueuePage";
import { setupStore } from "../../../src/app/store";

const { mockGetPrescriptionsByStatus, mockGetDispensePreview, mockDispensePrescription } =
  vi.hoisted(() => ({
    mockGetPrescriptionsByStatus: vi.fn(),
    mockGetDispensePreview: vi.fn(),
    mockDispensePrescription: vi.fn(),
  }));

vi.mock("../../../src/services/prescriptionService", () => ({
  getPrescriptionsByStatus: mockGetPrescriptionsByStatus,
  getDispensePreview: mockGetDispensePreview,
  dispensePrescription: mockDispensePrescription,
}));

const samplePrescription = {
  prescriptionId: 501,
  patientId: 25,
  status: "ISSUED",
  date: "2026-10-22",
  items: [
    {
      medicineId: 11,
      medicineName: "Paracetamol",
      dosage: "500 mg",
      frequency: "3 times daily",
      durationDays: 5,
      quantity: 10,
    },
  ],
};

const samplePreview = {
  prescriptionId: 501,
  patientId: 25,
  status: "ISSUED",
  items: [
    {
      itemId: 1,
      medicineId: 11,
      prescribedQuantity: 10,
      quantityDispensed: 0,
      remainingQuantity: 10,
      availableStock: 20,
      unitPrice: 5,
      dispensable: true,
      shortfallQuantity: 0,
      reason: null,
    },
  ],
};

const partialPreview = {
  ...samplePreview,
  items: [
    {
      ...samplePreview.items[0],
      availableStock: 7,
      dispensable: false,
      shortfallQuantity: 3,
      reason: "Insufficient stock",
    },
  ],
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
      <MemoryRouter initialEntries={["/pharmacist/dispensing-queue"]}>
        <Routes>
          <Route
            path="/pharmacist/dispensing-queue"
            element={<DispensingQueuePage />}
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

const selectPrescription = async (user) => {
  await user.click(
    await screen.findByRole("button", { name: /Prescription #501/i }),
  );
};

const verifyPatient = async (user) => {
  await user.click(
    screen.getByRole("checkbox", {
      name: /verified the patient identity and prescription/i,
    }),
  );
};

beforeEach(() => {
  vi.clearAllMocks();

  mockGetPrescriptionsByStatus.mockImplementation(async (status) =>
    status === "ISSUED" ? [samplePrescription] : [],
  );

  mockGetDispensePreview.mockResolvedValue(samplePreview);

  mockDispensePrescription.mockResolvedValue({
    prescriptionId: 501,
    status: "DISPENSED",
  });
});

afterEach(() => {
  cleanup();
});

describe("DispensingQueuePage", () => {
  it("loads issued prescriptions and the backend stock preview", async () => {
    const user = userEvent.setup();
    renderPage();

    await selectPrescription(user);

    await waitFor(() => {
      expect(mockGetDispensePreview).toHaveBeenCalledWith(
        501,
        expect.anything(),
      );
    });

    expect(
      screen.getByRole("checkbox", {
        name: /verified the patient identity and prescription/i,
      }),
    ).toBeInTheDocument();

    expect(mockDispensePrescription).not.toHaveBeenCalled();
  });

  it("does not allow dispensing before patient verification", async () => {
    const user = userEvent.setup();
    renderPage();

    await selectPrescription(user);

    const dispenseButton = await screen.findByRole("button", {
      name: /dispense medicines/i,
    });

    expect(dispenseButton).toBeDisabled();
    expect(mockDispensePrescription).not.toHaveBeenCalled();
  });

  it("requires the dispensing confirmation before calling the API", async () => {
    const user = userEvent.setup();
    renderPage();

    await selectPrescription(user);
    await verifyPatient(user);

    const checkboxes = await screen.findAllByRole("checkbox");

    // The first checkbox verifies patient identity.
    // The next checkbox confirms the dispensing action.
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);

    const dispenseButton = screen.getByRole("button", {
      name: /dispense medicines/i,
    });

    expect(dispenseButton).toBeDisabled();
    expect(mockDispensePrescription).not.toHaveBeenCalled();
  });

  it("submits a confirmed dispensing request to the backend", async () => {
    const user = userEvent.setup();
    renderPage();

    await selectPrescription(user);
    await verifyPatient(user);

    const checkboxes = await screen.findAllByRole("checkbox");
    await user.click(checkboxes[1]);

    const dispenseButton = screen.getByRole("button", {
      name: /dispense medicines/i,
    });

    await waitFor(() => expect(dispenseButton).toBeEnabled());

    await user.click(dispenseButton);

    await waitFor(() => {
      expect(mockDispensePrescription).toHaveBeenCalledWith(
        501,
        expect.objectContaining({ confirmPartial: false }),
      );
    });
  });

 
it("requires partial-dispensing confirmation when stock is insufficient", async () => {
  mockGetDispensePreview.mockResolvedValue(partialPreview);

  const user = userEvent.setup();
  renderPage();

  await selectPrescription(user);

  await waitFor(() => {
    expect(mockGetDispensePreview).toHaveBeenCalledWith(
      501,
      expect.anything(),
    );
  });

  // Wait until the partial stock preview is displayed.
  expect(await screen.findByText(/insufficient stock/i)).toBeInTheDocument();

  const dispenseButton = screen.getByRole("button", {
    name: /confirm partial dispensing/i,
  });

  // Verify the patient.
  await user.click(
    screen.getByRole("checkbox", {
      name: /verified the patient identity and prescription/i,
    }),
  );

  // Confirm the actual dispensing operation.
  await user.click(
    screen.getByRole("checkbox", {
      name: /confirm the actual dispensing operation/i,
    }),
  );

  // Without partial confirmation, dispensing must remain disabled.
  expect(dispenseButton).toBeDisabled();
  expect(mockDispensePrescription).not.toHaveBeenCalled();

  // Explicitly confirm dispensing only the available stock.
  await user.click(
    screen.getByRole("checkbox", {
      name: /confirm dispensing only the available quantities/i,
    }),
  );

  await waitFor(() => {
    expect(dispenseButton).toBeEnabled();
  });

  await user.click(dispenseButton);

  await waitFor(() => {
    expect(mockDispensePrescription).toHaveBeenCalledWith(
      501,
      expect.objectContaining({ confirmPartial: true }),
    );
  });
});


  it("shows an empty state when no prescriptions are pending", async () => {
    mockGetPrescriptionsByStatus.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText("No prescriptions pending dispensing"),
    ).toBeInTheDocument();
  });

  it("shows an error when prescriptions cannot be loaded", async () => {
    mockGetPrescriptionsByStatus.mockRejectedValue(
      new Error("Server error"),
    );

    renderPage();

    expect(
      await screen.findByText("Unable to load prescriptions"),
    ).toBeInTheDocument();
  });

  it("shows an error when the stock preview cannot be loaded", async () => {
    mockGetDispensePreview.mockRejectedValue(new Error("Not found"));

    const user = userEvent.setup();
    renderPage();

    await selectPrescription(user);

    expect(
      await screen.findByText("Unable to load stock preview"),
    ).toBeInTheDocument();

    expect(screen.getByText("Not found")).toBeInTheDocument();
    expect(mockDispensePrescription).not.toHaveBeenCalled();
  });
});
