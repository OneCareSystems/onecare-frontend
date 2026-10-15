import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import PatientDetails from "../../../src/pages/doctor/PatientDetails";
import { mswState, resetMswState } from "../../msw/handlers";

/** Renders the record view for a given `:patientId`, as the router would. */
const renderRecord = (patientId) =>
  render(
    <MemoryRouter initialEntries={[`/doctor/patient-records/${patientId}`]}>
      <Routes>
        <Route
          path="/doctor/patient-records/:patientId"
          element={<PatientDetails />}
        />
        <Route
          path="/doctor/patient-records"
          element={<div data-testid="directory">All patients</div>}
        />
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  resetMswState();
});

describe("PatientDetails — the record opened from the directory", () => {
  it("loads the patient identified by the route param", async () => {
    renderRecord(7);

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("#7")).toBeInTheDocument();
  });

  it("links back to the patient directory", async () => {
    renderRecord(7);
    await screen.findByText("Jane Doe");

    const back = screen.getByRole("link", { name: /all patients/i });
    expect(back).toHaveAttribute("href", "/doctor/patient-records");
  });

  it("shows an error with a way back when the record cannot be read", async () => {
    mswState.patientErrorMode = "server-error";

    renderRecord(7);

    expect(
      await screen.findByRole("heading", {
        name: /unable to load this patient record/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to all patients/i }),
    ).toBeInTheDocument();
  });

  it("treats a missing record as a failure rather than a blank page", async () => {
    mswState.patientErrorMode = "not-found";

    renderRecord(404);

    expect(
      await screen.findByRole("heading", {
        name: /unable to load this patient record/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to all patients/i }),
    ).toBeInTheDocument();
  });
});
