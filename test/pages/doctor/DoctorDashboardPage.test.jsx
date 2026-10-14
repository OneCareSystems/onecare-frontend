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

    expect(await screen.findByText("Appointment 101")).toBeInTheDocument();
    expect(screen.getByText("Appointment 102")).toBeInTheDocument();
    expect(screen.getByText("Appointment 103")).toBeInTheDocument();
    expect(
      screen.getByText("Appointments today").parentElement,
    ).toHaveTextContent("3");

    const waitingBadge = screen.getAllByText("SCHEDULED")[0];
    expect(waitingBadge.closest("article")).toHaveTextContent("2");
    const completedBadge = screen.getAllByText("COMPLETED")[0];
    expect(completedBadge.closest("article")).toHaveTextContent("1");
    expect(mswState.queueHits).toHaveLength(1);
  });

  it("shows a distinct empty state with zero total and keeps queue navigation", async () => {
    mswState.queueResponses = [[]];
    renderPage();
    expect(
      await screen.findByText("No appointments scheduled for today."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Appointments today").parentElement,
    ).toHaveTextContent("0");
    expect(screen.getByRole("link", { name: /open queue/i })).toHaveAttribute(
      "href",
      "/queue",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows loading feedback without zero totals while the request is pending", async () => {
    mswState.queueErrorMode = "delay";
    mswState.queueResponses = [[{ appointmentId: 1, status: "SCHEDULED" }]];
    renderPage();
    expect(
      screen.getByRole("status", { name: "Loading today’s appointments" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Appointments today")).not.toBeInTheDocument();
    expect(await screen.findByText("Appointment 1")).toBeInTheDocument();
  });

  it("allows retry after errors and replaces the error with fresh queue data", async () => {
    const user = userEvent.setup();
    mswState.queueErrorMode = "server-error";
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load today’s appointments",
    );
    expect(
      screen.getByRole("link", { name: /open queue/i }),
    ).toBeInTheDocument();

    mswState.queueErrorMode = null;
    mswState.queueResponses = [[{ appointmentId: 9, status: "SCHEDULED" }]];
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Appointment 9")).toBeInTheDocument();
    expect(screen.getAllByText("SCHEDULED")).toHaveLength(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mswState.queueHits).toHaveLength(2);
  });

  it("keeps error state retryable after a failed retry", async () => {
    const user = userEvent.setup();
    mswState.queueErrorMode = "network-error";
    renderPage();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please check your connection",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
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
    await screen.findByText("Appointment 4");
    expect(
      screen.queryByText(/Jane Doe|patient|vitals|consultation id|sample/i),
    ).not.toBeInTheDocument();
  });

  it("uses the real shared queue navigation destination", async () => {
    const user = userEvent.setup();
    mswState.queueResponses = [[]];
    renderPage();
    await screen.findByText("No appointments scheduled for today.");
    await user.click(screen.getByRole("link", { name: /open queue/i }));
    expect(
      screen.getByRole("heading", { name: "Shared queue" }),
    ).toBeInTheDocument();
  });
});
