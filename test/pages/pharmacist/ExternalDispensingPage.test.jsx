
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const {
  mockCreateExternalDispensing,
  mockVerifyExternalDispensingIdentity,
  mockCompleteExternalDispensing,
} = vi.hoisted(() => ({
  mockCreateExternalDispensing: vi.fn(),
  mockVerifyExternalDispensingIdentity: vi.fn(),
  mockCompleteExternalDispensing: vi.fn(),
}));

vi.mock("../../../src/services/externalDispensingService", () => ({
  createExternalDispensing: mockCreateExternalDispensing,
  verifyExternalDispensingIdentity: mockVerifyExternalDispensingIdentity,
  completeExternalDispensing: mockCompleteExternalDispensing,
}));

import ExternalDispensingPage from "../../../src/pages/pharmacist/ExternalDispensingPage";

const createdRecord = {
  dispenseId: 9001,
  prescriptionId: 501,
  patientId: 25,
  verificationMethod: "PHONE",
  verificationStatus: "PENDING",
  status: "PENDING",
};

const verifiedRecord = {
  ...createdRecord,
  verificationStatus: "VERIFIED",
};

const completedRecord = {
  ...verifiedRecord,
  status: "DISPENSED",
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/pharmacist/external-dispensing"]}>
      <ExternalDispensingPage />
    </MemoryRouter>,
  );

const fillPrescriptionForm = async (user) => {
  await user.type(screen.getByLabelText("Prescription ID"), "501");
  await user.type(screen.getByLabelText("Patient ID"), "25");
  await user.type(screen.getByLabelText("Medicine ID"), "11");
  await user.type(screen.getByLabelText("Quantity"), "5");
};

const createRecord = async (user) => {
  await fillPrescriptionForm(user);
  await user.click(
    screen.getByRole("button", { name: /save and continue/i }),
  );
};

beforeEach(() => {
  vi.clearAllMocks();

  mockCreateExternalDispensing.mockResolvedValue(createdRecord);
  mockVerifyExternalDispensingIdentity.mockResolvedValue(verifiedRecord);
  mockCompleteExternalDispensing.mockResolvedValue(completedRecord);
});

afterEach(() => {
  cleanup();
});

describe("ExternalDispensingPage", () => {
  it("renders the prescription form and medicine fields", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "External Dispensing" }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Prescription ID")).toBeRequired();
    expect(screen.getByLabelText("Patient ID")).toBeRequired();
    expect(screen.getByLabelText("Medicine ID")).toBeRequired();
    expect(screen.getByLabelText("Quantity")).toBeRequired();

    expect(
      screen.getByRole("button", { name: /save and continue/i }),
    ).toBeInTheDocument();

    expect(mockCreateExternalDispensing).not.toHaveBeenCalled();
  });

  it("creates an external dispensing record with the entered details", async () => {
    const user = userEvent.setup();
    renderPage();

    await createRecord(user);

    await screen.findByRole("heading", {
      name: /step 2: verify patient identity/i,
    });

    expect(mockCreateExternalDispensing).toHaveBeenCalledWith({
      prescriptionId: 501,
      patientId: 25,
      verificationMethod: "PHONE",
      deliveryMethod: "PICK_UP",
      items: [
        {
          medicineId: 11,
          prescriptionItemId: null,
          medicineName: null,
          quantity: 15,
        },
      ],
    });

    expect(screen.getByText("Patient ID: 25")).toBeInTheDocument();
    expect(screen.getByText("Dispensing record: 9001")).toBeInTheDocument();
  });

  it("does not submit the form when required fields are missing", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole("button", { name: /save and continue/i }),
    );

    expect(mockCreateExternalDispensing).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Prescription ID")).toBeInvalid();
  });

  it("requires identity confirmation before verification", async () => {
    const user = userEvent.setup();
    renderPage();

    await createRecord(user);

    const confirmButton = await screen.findByRole("button", {
      name: /confirm identity/i,
    });

    expect(confirmButton).toBeDisabled();
    expect(mockVerifyExternalDispensingIdentity).not.toHaveBeenCalled();

    expect(
      screen.getByRole("note"),
    ).toHaveTextContent(/backend does not validate the actual phone number/i);
  });

  it("verifies identity after staff confirmation", async () => {
    const user = userEvent.setup();
    renderPage();

    await createRecord(user);

    const identityCheckbox = await screen.findByRole("checkbox", {
      name: /i have checked the patient's identity/i,
    });

    await user.click(identityCheckbox);

    const confirmButton = screen.getByRole("button", {
      name: /confirm identity/i,
    });

    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);

    await screen.findByRole("heading", {
      name: /step 3: confirm and complete/i,
    });

    expect(mockVerifyExternalDispensingIdentity).toHaveBeenCalledWith(
      9001,
      {
        verificationMethod: "PHONE",
        verified: true,
        notes: "Identity checked by staff against the selected identifier.",
      },
    );

    expect(mockCompleteExternalDispensing).not.toHaveBeenCalled();
  });

  it("shows an error when creating the dispensing record fails", async () => {
    mockCreateExternalDispensing.mockRejectedValue(
      new Error("Unable to create the external dispensing record."),
    );

    const user = userEvent.setup();
    renderPage();

    await createRecord(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to create the external dispensing record.",
    );

    expect(
      screen.getByRole("heading", { name: /step 1: prescription details/i }),
    ).toBeInTheDocument();
  });

  it("shows an error when identity verification fails", async () => {
    mockVerifyExternalDispensingIdentity.mockRejectedValue(
      new Error("Identity verification failed. Please try again."),
    );

    const user = userEvent.setup();
    renderPage();

    await createRecord(user);

    await user.click(
      await screen.findByRole("checkbox", {
        name: /i have checked the patient's identity/i,
      }),
    );

    await user.click(
      screen.getByRole("button", { name: /confirm identity/i }),
    );

   expect(await screen.findByRole("alert")).toHaveTextContent(
  "Identity verification failed. Please verify and try again."
);

    expect(
      screen.getByRole("heading", {
        name: /step 2: verify patient identity/i,
      }),
    ).toBeInTheDocument();
  });

  it("completes dispensing and displays the successful result", async () => {
    const user = userEvent.setup();
    renderPage();

    await createRecord(user);

    await user.click(
      await screen.findByRole("checkbox", {
        name: /i have checked the patient's identity/i,
      }),
    );

    await user.click(
      screen.getByRole("button", { name: /confirm identity/i }),
    );

    await screen.findByRole("heading", {
      name: /step 3: confirm and complete/i,
    });

    await user.click(
      screen.getByRole("button", { name: /confirm dispensing/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Dispensing result" }),
    ).toBeInTheDocument();

    expect(mockCompleteExternalDispensing).toHaveBeenCalledWith(9001);
    expect(screen.getByText("Status: DISPENSED")).toBeInTheDocument();
    expect(screen.getByText("Dispensing completed.")).toBeInTheDocument();
  });

  it("displays the partial dispensing result and follow-up message", async () => {
    mockCompleteExternalDispensing.mockResolvedValue({
      ...verifiedRecord,
      status: "PARTIALLY_DISPENSED",
    });

    const user = userEvent.setup();
    renderPage();

    await createRecord(user);

    await user.click(
      await screen.findByRole("checkbox", {
        name: /i have checked the patient's identity/i,
      }),
    );

    await user.click(
      screen.getByRole("button", { name: /confirm identity/i }),
    );

    await screen.findByRole("heading", {
      name: /step 3: confirm and complete/i,
    });

    await user.click(
      screen.getByRole("button", { name: /confirm dispensing/i }),
    );

    expect(
      await screen.findByText("Status: PARTIALLY_DISPENSED"),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/only the available quantity was dispensed/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/follow-up is required/i),
    ).toBeInTheDocument();
  });
});
