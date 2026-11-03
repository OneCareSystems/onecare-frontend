import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import DoctorDashboardPage from "../../../src/pages/doctor/DoctorDashboardPage";
import { setupStore } from "../../../src/app/store";
import { mswState, resetMswState } from "../../msw/handlers";

const queueRecord = (overrides = {}) => ({
  appointmentId: 101,
  patientId: 1,
  doctorId: 3,
  appointmentDate: "2026-10-14",
  timeSlot: "09:00:00",
  status: "SCHEDULED",
  queuePosition: 1,
  patientFullName: "Jane Doe",
  ...overrides,
});

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
          <Route
            path="/doctor/today-schedule"
            element={<h1>Today’s Schedule page</h1>}
          />
          <Route
            path="/doctor/patient-records"
            element={<h1>Patient Records page</h1>}
          />
          <Route
            path="/doctor/knowledge-base"
            element={<h1>Knowledge Base page</h1>}
          />
          <Route
            path="/doctor/consultation/:appointmentId"
            element={<h1>Consultation stub</h1>}
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

/** StatCard renders its label and value inside a single card container. */
const statCard = (label) =>
  screen.getByText(label).closest("div").parentElement;

/** The queue panel is a titled <section>; scope row queries inside it. */
const queuePanel = () => screen.getByRole("region", { name: "Today's Queue" });

afterEach(resetMswState);

describe("DoctorDashboardPage", () => {
  it("derives every overview stat from the same queue response", async () => {
    mswState.queueResponses = [
      [
        queueRecord({ appointmentId: 101, patientId: 1 }),
        queueRecord({ appointmentId: 102, patientId: 2, timeSlot: "09:30:00" }),
        queueRecord({
          appointmentId: 103,
          patientId: 3,
          status: "COMPLETED",
          timeSlot: "08:00:00",
        }),
      ],
    ];
    renderPage();

    await waitFor(() =>
      expect(within(statCard("Today's Appointments")).getByText("3")),
    );
    // Total, unique patients, completed and still-pending all come from the
    // single GET /queue/today payload — no extra requests.
    expect(
      within(statCard("Today's Appointments")).getByText("2 active"),
    ).toBeInTheDocument();
    expect(
      within(statCard("Today's Patients")).getByRole("heading", {
        level: 3,
      }),
    ).toHaveTextContent("3");
    expect(
      within(statCard("Completed")).getByRole("heading", { level: 3 }),
    ).toHaveTextContent("1");
    expect(
      within(statCard("Still Pending")).getByRole("heading", { level: 3 }),
    ).toHaveTextContent("2");
    expect(mswState.queueHits).toHaveLength(1);
  });

  it("counts a patient once even when they hold several appointments", async () => {
    mswState.queueResponses = [
      [
        queueRecord({ appointmentId: 101, patientId: 7 }),
        queueRecord({ appointmentId: 102, patientId: 7, timeSlot: "09:30:00" }),
      ],
    ];
    renderPage();

    await waitFor(() =>
      expect(
        within(statCard("Today's Patients")).getByRole("heading", {
          level: 3,
        }),
      ).toHaveTextContent("1"),
    );
    expect(
      within(statCard("Today's Appointments")).getByRole("heading", {
        level: 3,
      }),
    ).toHaveTextContent("2");
  });

  it("renders queue rows with names, times, statuses and consultation links", async () => {
    mswState.queueResponses = [
      [
        queueRecord({ appointmentId: 101, patientFullName: "Jane Doe" }),
        queueRecord({
          appointmentId: 102,
          patientFullName: "Sam Lee",
          timeSlot: "09:30:00",
          status: "COMPLETED",
        }),
      ],
    ];
    renderPage();

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("Sam Lee")).toBeInTheDocument();
    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.getAllByText("SCHEDULED")).toHaveLength(1);
    expect(screen.getAllByText("COMPLETED")).toHaveLength(1);

    const openLinks = within(queuePanel()).getAllByRole("link", {
      name: /open/i,
    });
    expect(openLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/doctor/consultation/101",
      "/doctor/consultation/102",
    ]);
    expect(
      screen.getByRole("link", { name: /view full schedule/i }),
    ).toHaveAttribute("href", "/doctor/today-schedule");
  });

  it("shows at most six queue rows and links each one to its consultation", async () => {
    mswState.queueResponses = [
      Array.from({ length: 8 }, (_, index) =>
        queueRecord({
          appointmentId: 200 + index,
          patientId: index,
          patientFullName: `Patient ${index}`,
        }),
      ),
    ];
    renderPage();

    expect(await screen.findByText("Patient 0")).toBeInTheDocument();
    const openLinks = within(queuePanel()).getAllByRole("link", {
      name: /open/i,
    });
    expect(openLinks).toHaveLength(6);
    expect(screen.queryByText("Patient 6")).not.toBeInTheDocument();
    expect(screen.queryByText("Patient 7")).not.toBeInTheDocument();
  });

  it("offers the workspace tiles that navigate to the other doctor screens", async () => {
    const user = userEvent.setup();
    mswState.queueResponses = [[]];
    renderPage();

    expect(
      screen.getByRole("link", { name: /timeline view/i }),
    ).toHaveAttribute("href", "/doctor/today-schedule");
    expect(
      screen.getByRole("link", { name: /browse patients/i }),
    ).toHaveAttribute("href", "/doctor/patient-records");
    expect(
      screen.getByRole("link", { name: /clinical guidelines/i }),
    ).toHaveAttribute("href", "/doctor/knowledge-base");

    await user.click(screen.getByRole("link", { name: /browse patients/i }));
    expect(
      await screen.findByRole("heading", { name: "Patient Records page" }),
    ).toBeInTheDocument();
  });

  it("shows a distinct empty state with zero totals and no schedule link", async () => {
    mswState.queueResponses = [[]];
    renderPage();

    expect(await screen.findByText("Your queue is clear")).toBeInTheDocument();
    expect(
      within(statCard("Today's Appointments")).getByRole("heading", {
        level: 3,
      }),
    ).toHaveTextContent("0");
    expect(
      screen.queryByRole("link", { name: /view full schedule/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows loading feedback without zero totals while the first load is pending", async () => {
    mswState.queueErrorMode = "delay";
    mswState.queueResponses = [[queueRecord({ appointmentId: 1 })]];
    renderPage();

    expect(
      screen.getByRole("status", { name: "Loading today's queue…" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Syncing…")).toBeInTheDocument();
    expect(screen.queryByText("Your queue is clear")).not.toBeInTheDocument();
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("surfaces queue failures and recovers through the header Refresh", async () => {
    const user = userEvent.setup();
    mswState.queueErrorMode = "server-error";
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Queue data unavailable",
    );

    mswState.queueErrorMode = null;
    mswState.queueResponses = [[queueRecord({ appointmentId: 9 })]];
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mswState.queueHits).toHaveLength(2);
  });

  it("loads the signed-in doctor's weekly schedule through /auth/me", async () => {
    mswState.queueResponses = [[]];
    renderPage();

    await waitFor(() =>
      expect(
        screen.getAllByText("09:00\u201312:00", { selector: "p" }),
      ).toHaveLength(5),
    );
    // The schedule is fetched with the backend id resolved from the profile.
    expect(mswState.authMeHits).toHaveLength(1);
    expect(mswState.doctorScheduleHits).toHaveLength(1);
    expect(mswState.doctorScheduleHits[0].id).toBe("4");

    // Read-only strip: every weekday shows its slots, the weekend shows Off.
    expect(
      screen.getAllByText("13:00\u201317:00", { selector: "p" }),
    ).toHaveLength(5);
    expect(screen.getAllByText("Off")).toHaveLength(2);
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(screen.getAllByText(day)).toHaveLength(1);
    }
    expect(
      screen.getByRole("region", { name: "My Weekly Schedule" }),
    ).toBeInTheDocument();
  });

  it("keeps a schedule failure contained and retries just the schedule", async () => {
    const user = userEvent.setup();
    mswState.queueResponses = [[queueRecord()]];
    mswState.doctorScheduleErrorMode = "server-error";
    renderPage();

    expect(
      await screen.findByText(/could not load your schedule/i),
    ).toBeInTheDocument();
    // The queue itself is unaffected by the schedule failure.
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();

    mswState.doctorScheduleErrorMode = null;
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findAllByText("09:00\u201312:00", { selector: "p" }),
    ).toHaveLength(5);
    expect(screen.queryByText(/could not load your schedule/i)).toBeNull();
    expect(mswState.doctorScheduleHits).toHaveLength(2);
    // Retrying the schedule never re-requests the queue.
    expect(mswState.queueHits).toHaveLength(1);
  });
});
