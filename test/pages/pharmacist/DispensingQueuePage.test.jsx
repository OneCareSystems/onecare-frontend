
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import DispensingQueuePage from "../../../src/pages/pharmacist/DispensingQueuePage";
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

afterEach(resetMswState);

describe("DispensingQueuePage", () => {
  it("displays issued prescriptions and their medicine details", async () => {
    mswState.issuedPrescriptionResponses = [[samplePrescription]];

    const user = userEvent.setup();
    renderPage();

    const prescription = await screen.findByRole("button", {
      name: /Prescription #501/,
    });

    expect(prescription).toBeInTheDocument();
    expect(screen.getByText("Patient ID: 25")).toBeInTheDocument();

    await user.click(prescription);

    expect(screen.getByText("Prescribed medicines")).toBeInTheDocument();
    expect(screen.getByText("Paracetamol")).toBeInTheDocument();
    expect(screen.getByText("Prescribed quantity: 10")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Quantity to prepare (preview only)"),
    ).toHaveValue(10);

    expect(mswState.issuedPrescriptionHits).toHaveLength(1);
    expect(mswState.issuedPrescriptionHits[0].url).toContain(
      "status=ISSUED",
    );
  });

  it("does not allow the preview without patient verification", async () => {
    mswState.issuedPrescriptionResponses = [[samplePrescription]];

    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: /Prescription #501/ }),
    );

    await user.click(
      screen.getByRole("button", { name: /Validate dispensing preview/i }),
    );

    expect(
      screen.getByRole("status"),
    ).toHaveTextContent(
      "Verify the patient and prescription before continuing.",
    );
  });

  it("caps the prepared quantity at the prescribed quantity", async () => {
    mswState.issuedPrescriptionResponses = [[samplePrescription]];

    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: /Prescription #501/ }),
    );

    const quantityInput = screen.getByLabelText(
      "Quantity to prepare (preview only)",
    );

    await user.clear(quantityInput);
    await user.type(quantityInput, "15");

    expect(quantityInput).toHaveValue(10);
  });

  it("shows a preview-only notice after verification and valid quantities", async () => {
    mswState.issuedPrescriptionResponses = [[samplePrescription]];

    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: /Prescription #501/ }),
    );

    await user.click(
      screen.getByRole("checkbox", {
        name: /verified the patient identity and prescription/i,
      }),
    );

    await user.click(
      screen.getByRole("button", { name: /Validate dispensing preview/i }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /Preview only: no medicine has been dispensed and no stock has changed/i,
    );
  });

  it("shows an empty state when there are no issued prescriptions", async () => {
    mswState.issuedPrescriptionResponses = [[]];

    renderPage();

    expect(
      await screen.findByText("No prescriptions pending dispensing"),
    ).toBeInTheDocument();
  });

  it("shows an error and retries loading prescriptions", async () => {
    const user = userEvent.setup();

    mswState.issuedPrescriptionErrorMode = "server-error";
    renderPage();

    expect(
      await screen.findByText("Unable to load prescriptions"),
    ).toBeInTheDocument();

    mswState.issuedPrescriptionErrorMode = null;

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByText("No prescriptions pending dispensing"),
    ).toBeInTheDocument();

    expect(mswState.issuedPrescriptionHits).toHaveLength(2);
  });
});
