import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import PatientRecordsPage from "../../../src/pages/doctor/PatientRecordsPage";
import PatientDetails from "../../../src/pages/doctor/PatientDetails";
import { setupStore } from "../../../src/app/store";
import { mswState, resetMswState } from "../../msw/handlers";

/** PAGE_SIZE is 10, so 12 patients are enough to span two pages. */
const makePatients = (count) =>
  Array.from({ length: count }, (_, index) => ({
    patientId: index + 1,
    fullName: `Patient ${index + 1}`,
  }));

const renderPage = (initialPath = "/doctor/patient-records") => {
  const store = setupStore({
    auth: {
      accessToken: "test-token",
      role: "DOCTOR",
      authStatus: "authenticated",
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/doctor/patient-records"
            element={<PatientRecordsPage />}
          />
          <Route
            path="/doctor/patient-records/:patientId"
            element={<PatientDetails />}
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

afterEach(() => {
  resetMswState();
});

describe("PatientRecordsPage — all patients with pagination", () => {
  it("lists the directory and shows only the first page", async () => {
    mswState.patientsResponses = [makePatients(12)];

    renderPage();

    expect(await screen.findByText(/12\s*patients/)).toBeInTheDocument();

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Patient 10")).toBeInTheDocument();
    // Row 11 belongs to page 2.
    expect(screen.queryByText("Patient 11")).not.toBeInTheDocument();

    expect(screen.getByText(/Page\s*1\s*of\s*2/)).toBeInTheDocument();
  });

  it("moves to the second page with Next", async () => {
    mswState.patientsResponses = [makePatients(12)];

    renderPage();
    await screen.findByText(/12\s*patients/);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Patient 11")).toBeInTheDocument();
    expect(screen.getByText("Patient 12")).toBeInTheDocument();
    expect(screen.queryByText("Patient 1")).not.toBeInTheDocument();
    expect(screen.getByText(/Page\s*2\s*of\s*2/)).toBeInTheDocument();
  });

  it("hides the pager when everything fits on one page", async () => {
    mswState.patientsResponses = [makePatients(3)];

    renderPage();
    await screen.findByText(/3\s*patients/);

    expect(screen.getByText("Patient 3")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Next" }),
    ).not.toBeInTheDocument();
  });

  it("opens the selected patient when View More is clicked", async () => {
    mswState.patientsResponses = [makePatients(12)];

    renderPage();
    await screen.findByText(/12\s*patients/);

    // PatientDetails reads the profile from GET /patients/:id/history.
    mswState.historyResponses = [
      {
        patient: { patientId: 1, fullName: "Jane Doe" },
        patientId: 1,
        appointments: [],
        prescriptions: [],
      },
    ];
    fireEvent.click(screen.getAllByRole("button", { name: "View More" })[0]);

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /All patients/i }),
    ).toBeInTheDocument();
  });

  it("surfaces a failed directory load with a retry", async () => {
    mswState.patientsErrorMode = "server-error";

    renderPage();

    expect(
      await screen.findByRole("heading", { name: /unable to load patients/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("retries successfully after the failure clears", async () => {
    mswState.patientsErrorMode = "server-error";

    renderPage();
    await screen.findByRole("heading", { name: /unable to load patients/i });

    mswState.patientsErrorMode = null;
    mswState.patientsResponses = [makePatients(2)];
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText(/2\s*patients/)).toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
