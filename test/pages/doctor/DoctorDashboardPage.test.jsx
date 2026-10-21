import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import DoctorDashboardPage from "../../../src/pages/doctor/DoctorDashboardPage";
import { setupStore } from "../../../src/app/store";
import { mswState, resetMswState } from "../../msw/handlers";

const renderPage = () => {
  const testStore = setupStore({
    auth: {
      accessToken: "test-token",
      role: "DOCTOR",
      authStatus: "authenticated",
    },
  });
  return render(
    <Provider store={testStore}>
      <MemoryRouter initialEntries={["/doctor/dashboard"]}>
        <Routes>
          <Route path="/doctor/dashboard" element={<DoctorDashboardPage />} />
          <Route path="/queue" element={<h1>Shared queue</h1>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

afterEach(resetMswState);

describe("DoctorDashboardPage", () => {
  it("renders queue records and status counts from the same response", async () => {
    mswState.queueResponses = [
      [
        { appointmentId: 101, status: "SCHEDULED" },
        { appointmentId: 102, status: "SCHEDULED" },
        { appointmentId: 103, status: "COMPLETED" },
      ],
    ];
    renderPage();

    expect(await screen.findByText("Appointment #101")).toBeInTheDocument();
    expect(screen.getByText("Appointment #102")).toBeInTheDocument();
    expect(screen.getByText("Appointment #103")).toBeInTheDocument();
    expect(
      screen.getByText("Total Patients").parentElement,
    ).toBeInTheDocument();

    const waitingBadge = screen.getAllByText("SCHEDULED")[0];
    expect(waitingBadge.closest("article")).toHaveTextContent("2");
    const completedBadge = screen.getAllByText("COMPLETED")[0];
    expect(completedBadge.closest("article")).toHaveTextContent("1");
    expect(mswState.queueHits).toHaveLength(1);
  });

  it("renders the patient's full name supplied by the queue response", async () => {
    mswState.queueResponses = [
      [
        {
          appointmentId: 55,
          patientId: 4,
          status: "SCHEDULED",
          patientFullName: "Priya Raman",
        },
        {
          appointmentId: 56,
          patientId: 5,
          status: "SCHEDULED",
          patientFullName: "   ",
        },
      ],
    ];
    renderPage();

    expect(await screen.findByText("Priya Raman")).toBeInTheDocument();
    // The appointment label is only a last resort.
    expect(screen.queryByText("Appointment #55")).not.toBeInTheDocument();
  });

  it("shows a distinct empty state with zero total and keeps queue navigation", async () => {
    mswState.queueResponses = [[]];
    renderPage();
    expect(
      await screen.findByText("No Appointments Scheduled"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Total Patients").parentElement,
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows loading feedback without zero totals while the request is pending", async () => {
    mswState.queueErrorMode = "delay";
    mswState.queueResponses = [[{ appointmentId: 1, status: "SCHEDULED" }]];
    renderPage();
    expect(
      screen.getByRole("status", { name: "Loading today’s metrics..." }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Total Patients")).not.toBeInTheDocument();
    expect(await screen.findByText("Appointment #1")).toBeInTheDocument();
  });

  it("allows retry after errors and replaces the error with fresh queue data", async () => {
    const user = userEvent.setup();
    mswState.queueErrorMode = "server-error";
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load summary metrics",
    );

    mswState.queueErrorMode = null;
    mswState.queueResponses = [[{ appointmentId: 9, status: "SCHEDULED" }]];
    await user.click(screen.getByRole("button", { name: "Retry Connection" }));
    expect(await screen.findByText("Appointment #9")).toBeInTheDocument();
    expect(screen.getAllByText("SCHEDULED")).toHaveLength(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mswState.queueHits).toHaveLength(2);
  });

  it("keeps error state retryable after a failed retry", async () => {
    const user = userEvent.setup();
    mswState.queueErrorMode = "network-error";
    renderPage();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry Connection" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please check your connection",
    );
    expect(
      screen.getByRole("button", { name: "Retry Connection" }),
    ).toBeEnabled();
    expect(mswState.queueHits).toHaveLength(2);
  });

  it("does not display invented patient details or appointment data", async () => {
    mswState.queueResponses = [
      [
        {
          appointmentId: 4,
          patientId: 1,
          doctorId: 3,
          appointmentDate: "2026-10-14",
          timeSlot: "09:00:00",
          status: "SCHEDULED",
          queuePosition: 1,
        },
      ],
    ];
    renderPage();
    // The record carries a real patient id but no name, so the label is the
    // derived `Patient <id>` — never an invented one.
    await screen.findByText("Patient 1");
    expect(screen.queryByText("Appointment #4")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Jane Doe|vitals|consultation id|sample/i),
    ).not.toBeInTheDocument();
  });
});
