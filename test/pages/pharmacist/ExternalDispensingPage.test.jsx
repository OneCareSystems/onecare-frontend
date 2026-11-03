import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
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
  await user.type(screen.getByLabelText(/Prescription ID/), "501");
  await user.type(screen.getByLabelText(/Patient ID/), "25");
  await user.type(screen.getByLabelText(/Medicine ID/), "11");
  await user.type(screen.getByLabelText(/Quantity/), "5");
};

const createRecord = async (user) => {
  await fillPrescriptionForm(user);
  await user.click(screen.getByRole("button", { name: /save and continue/i }));
};

const confirmDispensing = async (user) => {
  await user.click(
    screen.getByRole("button", { name: /^confirm dispensing$/i }),
  );
  const dialog = screen.getByRole("dialog", { name: /^confirm dispensing$/i });
  expect(mockCompleteExternalDispensing).not.toHaveBeenCalled();
  await user.click(
    within(dialog).getByRole("button", { name: "Yes, confirm dispensing" }),
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
  it.each([
    ["501", "25"],
    ["", "25"],
    ["501", ""],
    ["", ""],
  ])(
    "allows optional prescription %s and patient %s without submitting fake IDs",
    async (prescriptionId, patientId) => {
      const user = userEvent.setup();
      mockCreateExternalDispensing.mockResolvedValue({
        ...createdRecord,
        prescriptionId: prescriptionId ? 501 : null,
        patientId: patientId ? 25 : null,
      });
      renderPage();
      if (prescriptionId)
        await user.type(
          screen.getByLabelText(/Prescription ID/),
          prescriptionId,
        );
      if (patientId)
        await user.type(screen.getByLabelText(/Patient ID/), patientId);
      await user.type(screen.getByLabelText(/Medicine ID/), "11");
      await user.click(
        screen.getByRole("button", { name: /save and continue/i }),
      );
      await screen.findByRole("heading", {
        name: /verify patient identity/i,
      });
      expect(mockCreateExternalDispensing).toHaveBeenCalledWith(
        expect.objectContaining({
          prescriptionId: prescriptionId ? 501 : null,
          patientId: patientId ? 25 : null,
        }),
      );
      if (!patientId) expect(screen.getByText("Walk-in")).toBeInTheDocument();
    },
  );
  it("does not offer billing when completion fails", async () => {
    mockCompleteExternalDispensing.mockRejectedValue(
      new Error("Stock update failed"),
    );
    const user = userEvent.setup();
    renderPage();
    await createRecord(user);
    await user.click(
      await screen.findByRole("checkbox", {
        name: /i have checked the patient's identity/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /confirm identity/i }));
    await screen.findByRole("heading", {
      name: /confirm and complete/i,
    });
    await confirmDispensing(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Stock update failed",
    );
    expect(
      screen.queryByRole("button", { name: "View / Generate Invoice" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Dispensing result" }),
    ).not.toBeInTheDocument();
  });
  it("renders the prescription form and medicine fields", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "External Dispensing" }),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Prescription ID (Optional)"),
    ).not.toBeRequired();
    expect(screen.getByLabelText("Patient ID (Optional)")).not.toBeRequired();
    expect(screen.getByLabelText(/Medicine ID/)).toHaveAttribute("min", "1");
    expect(screen.getByLabelText(/Quantity/)).toHaveAttribute("min", "1");

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
      name: /verify patient identity/i,
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

    expect(screen.getByText("Patient ID", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("25", { exact: true })).toBeInTheDocument();

    expect(
      screen.getByText("Dispensing record", { exact: true }),
    ).toBeInTheDocument();
    expect(screen.getByText("9001", { exact: true })).toBeInTheDocument();
  });

  it("does not submit the form when required fields are missing", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole("button", { name: /save and continue/i }),
    );

    expect(mockCreateExternalDispensing).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Medicine ID/)).toHaveValue(null);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please fix the highlighted fields before continuing.",
    );
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

    expect(screen.getByRole("note")).toHaveTextContent(
      /backend does not validate the actual phone number/i,
    );
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
      name: /confirm and complete/i,
    });

    expect(mockVerifyExternalDispensingIdentity).toHaveBeenCalledWith(9001, {
      verificationMethod: "PHONE",
      verified: true,
      notes: "Identity checked by staff against the selected identifier.",
    });

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
      screen.getByRole("heading", { name: /prescription details/i }),
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

    await user.click(screen.getByRole("button", { name: /confirm identity/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Identity verification failed. Please verify and try again.",
    );

    expect(
      screen.getByRole("heading", {
        name: /verify patient identity/i,
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

    await user.click(screen.getByRole("button", { name: /confirm identity/i }));

    await screen.findByRole("heading", {
      name: /confirm and complete/i,
    });

    await confirmDispensing(user);

    expect(
      await screen.findByRole("heading", { name: "Dispensing result" }),
    ).toBeInTheDocument();

    expect(mockCompleteExternalDispensing).toHaveBeenCalledWith(9001);
    expect(screen.getByText("Status", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("DISPENSED", { exact: true })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "View / Generate Invoice" }),
    ).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: /confirm identity/i }));

    await screen.findByRole("heading", {
      name: /confirm and complete/i,
    });

    await confirmDispensing(user);

    expect(screen.getByText("Status", { exact: true })).toBeInTheDocument();
    expect(
      screen.getByText("PARTIALLY_DISPENSED", { exact: true }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/only the available quantity was dispensed/i),
    ).toBeInTheDocument();

    expect(screen.getByText(/follow-up is required/i)).toBeInTheDocument();
  });
});
