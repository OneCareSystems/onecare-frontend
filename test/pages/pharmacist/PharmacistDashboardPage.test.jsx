import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import PharmacistDashboardPage from "../../../src/pages/pharmacist/PharmacistDashboardPage";
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
      <MemoryRouter initialEntries={["/pharmacist/dashboard"]}>
        <Routes>
          <Route
            path="/pharmacist/dashboard"
            element={<PharmacistDashboardPage />}
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

afterEach(resetMswState);

describe("PharmacistDashboardPage", () => {
  it("renders issued prescriptions and medicine inventory alerts", async () => {
    mswState.issuedPrescriptionResponses = [
      [
        {
          prescriptionId: 501,
          patientId: 25,
          status: "ISSUED",
          date: "2026-10-22",
        },
      ],
    ];

    mswState.lowStockMedicineResponses = [
      [
        {
          medicineId: 11,
          medicineName: "Paracetamol",
          stockQuantity: 4,
        },
      ],
    ];

    mswState.nearExpiryMedicineResponses = [
      [
        {
          medicineId: 12,
          medicineName: "Amoxicillin",
          expiryDate: "2026-11-05",
          stockQuantity: 10,
        },
      ],
    ];

    renderPage();

    expect(await screen.findByText("Prescription #501")).toBeInTheDocument();
    expect(screen.getByText("Paracetamol")).toBeInTheDocument();
    expect(screen.getByText("Amoxicillin")).toBeInTheDocument();

    expect(mswState.issuedPrescriptionHits).toHaveLength(1);
    expect(mswState.lowStockMedicineHits).toHaveLength(1);
    expect(mswState.nearExpiryMedicineHits).toHaveLength(1);

    expect(mswState.issuedPrescriptionHits[0].url).toContain("status=ISSUED");
  });

  it("shows an error and retries the failed section", async () => {
    const user = userEvent.setup();

    mswState.issuedPrescriptionErrorMode = "server-error";

    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();

    mswState.issuedPrescriptionErrorMode = null;

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByText("No Issued Prescriptions"),
    ).toBeInTheDocument();

    // The other two dashboard sections are loaded independently.
    expect(mswState.lowStockMedicineHits).toHaveLength(1);
    expect(mswState.nearExpiryMedicineHits).toHaveLength(1);
    expect(mswState.issuedPrescriptionHits).toHaveLength(2);
  });
});
