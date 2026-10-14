import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ConsultationPage from "../../../src/pages/doctor/ConsultationPage";
import { mswState, resetMswState } from "../../msw/handlers";

const appointment = (overrides = {}) => ({
  appointmentId: 101,
  patientId: 7,
  doctorId: 3,
  appointmentDate: "2026-10-14",
  timeSlot: "09:30:00",
  status: "SCHEDULED",
  reason: "Follow-up visit",
  ...overrides,
});

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/doctor/consultation/:appointmentId"
          element={<ConsultationPage />}
        />
        <Route
          path="/doctor/today-schedule"
          element={<h1>Today’s schedule</h1>}
        />
      </Routes>
    </MemoryRouter>,
  );

afterEach(resetMswState);

describe("ConsultationPage (DOC-04) — connected to the backend", () => {
  it("loads the appointment from GET /api/appointments and the patient by id", async () => {
    mswState.appointmentsResponses = [[appointment()]];
    renderAt("/doctor/consultation/101");

    // Real data from the verified endpoints — no invented clinical content.
    expect(
      await screen.findByRole("region", { name: "Consultation details" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Follow-up visit")).toBeInTheDocument();
    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();

    // Appointments resolve through the list; the patient via /patients/:id.
    expect(mswState.appointmentsHits).toHaveLength(1);
    expect(new URL(mswState.appointmentsHits[0].url).pathname).toMatch(
      /\/api\/appointments$/,
    );
    expect(mswState.protectedHits[0].id).toBe("7");

    expect(
      screen.getByRole("heading", {
        name: "Consultation for appointment 101",
      }),
    ).toBeInTheDocument();
  });

  it("renders booking data even when the patient name cannot be loaded", async () => {
    mswState.appointmentsResponses = [[appointment()]];
    mswState.patientErrorMode = "server-error"; // /patients/7 fails
    renderAt("/doctor/consultation/101");

    expect(
      await screen.findByRole("region", { name: "Consultation details" }),
    ).toBeInTheDocument();
    // Falls back to the id-based label, never an invented name.
    expect(screen.getByText("Patient 7")).toBeInTheDocument();
    expect(screen.getByText("Follow-up visit")).toBeInTheDocument();
  });

  it("shows not-found when the appointment is outside the doctor's list", async () => {
    mswState.appointmentsResponses = [[]];
    renderAt("/doctor/consultation/404");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Appointment not available",
    );
    expect(mswState.protectedHits).toHaveLength(0); // no patient fetch
  });

  it("surfaces load failures with a working retry", async () => {
    const user = userEvent.setup();
    mswState.appointmentsErrorMode = "server-error";
    renderAt("/doctor/consultation/101");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load the consultation",
    );

    mswState.appointmentsErrorMode = null;
    mswState.appointmentsResponses = [[appointment()]];
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("region", { name: "Consultation details" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("links back to the doctor's schedule", async () => {
    const user = userEvent.setup();
    mswState.appointmentsResponses = [[appointment()]];
    renderAt("/doctor/consultation/101");

    await screen.findByRole("region", { name: "Consultation details" });
    await user.click(
      screen.getByRole("button", { name: /back to today’s schedule/i }),
    );
    expect(
      screen.getByRole("heading", { name: "Today’s schedule" }),
    ).toBeInTheDocument();
  });

  it("shows no invented clinical data beyond the booking", async () => {
    mswState.appointmentsResponses = [[appointment({ reason: null })]];
    renderAt("/doctor/consultation/101");

    await screen.findByRole("region", { name: "Consultation details" });
    expect(screen.queryByText(/reason/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/vitals|diagnos|prescription|blood pressure|note/i),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(mswState.appointmentsHits).toHaveLength(1));
  });
});
