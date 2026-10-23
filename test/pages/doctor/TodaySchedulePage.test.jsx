import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import TodaySchedulePage from "../../../src/pages/doctor/TodaySchedulePage";
import ConsultationPage from "../../../src/pages/doctor/ConsultationPage";
import { setupStore } from "../../../src/app/store";
import { QUEUE_POLL_INTERVAL_MS } from "../../../src/hooks/useQueuePolling";
import {
  formatDisplayDate,
  toLocalDateString,
} from "../../../src/utils/dateUtils";
import { mswState, resetMswState } from "../../msw/handlers";

const scheduled = (overrides = {}) => ({
  appointmentId: 101,
  patientId: 1,
  doctorId: 3,
  appointmentDate: toLocalDateString(),
  timeSlot: "09:00:00",
  status: "SCHEDULED",
  queuePosition: 1,
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
      <MemoryRouter initialEntries={["/doctor/today-schedule"]}>
        <Routes>
          <Route
            path="/doctor/today-schedule"
            element={<TodaySchedulePage />}
          />
          <Route
            path="/doctor/consultation/:appointmentId"
            element={<ConsultationPage />}
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

afterEach(() => {
  vi.useRealTimers();
  resetMswState();
});

describe("TodaySchedulePage — doctor's consultation queue", () => {
  it("AC1: renders the queue in server order with names, times and statuses", async () => {
    // Names arrive on the appointments response itself — the page no longer
    // issues a separate `GET /patients` lookup per row.
    mswState.appointmentsResponses = [
      [
        scheduled({ patientFullName: "Jane Doe" }),
        scheduled({
          appointmentId: 102,
          patientId: 2,
          patientFullName: "Sam Lee",
          timeSlot: "09:30:00",
          queuePosition: 2,
        }),
        scheduled({
          appointmentId: 103,
          patientId: 9,
          status: "COMPLETED",
          queuePosition: 3,
        }),
      ],
    ];
    renderPage();

    expect(await screen.findByRole("table")).toBeInTheDocument();

    const rows = screen.getAllByRole("row").slice(1); // drop header row
    expect(rows).toHaveLength(3);
    // Server-authoritative order preserved, no client re-sorting.
    expect(rows[0]).toHaveTextContent("Jane Doe");
    expect(rows[0]).toHaveTextContent("09:00");
    expect(rows[0]).toHaveTextContent("Scheduled");
    expect(rows[1]).toHaveTextContent("Sam Lee");
    expect(rows[1]).toHaveTextContent("09:30");
    expect(rows[2]).toHaveTextContent("Completed");
    // Missing names degrade to a placeholder rather than invented labels.
    expect(rows[2]).toHaveTextContent("\u2014");

    // The page is scoped to the local calendar date.
    expect(
      screen.getByText(formatDisplayDate(toLocalDateString())),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /today’s schedule/i }),
    ).toBeInTheDocument();
  });

  it("AC1: Start Consultation navigates to the DOC-04 consultation route", async () => {
    const user = userEvent.setup();
    mswState.appointmentsResponses = [[scheduled()]];
    renderPage();

    await screen.findByRole("table");
    await user.click(
      screen.getByRole("button", { name: "Start Consultation" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Consultation Room",
      }),
    ).toBeInTheDocument();
  });

  it("AC3: shows the exact empty-state text when the date has no appointments", async () => {
    mswState.appointmentsResponses = [[]];
    renderPage();

    expect(
      await screen.findByText("No appointments scheduled"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("re-fetches when the doctor picks another date (server-scoped read)", async () => {
    mswState.appointmentsResponses = [
      [{ ...scheduled(), patientFullName: "Jane Doe" }], // today
      // GET /appointments is scoped to the requested ?date, so this response
      // only carries records for the date that was just picked.
      [
        {
          ...scheduled({ appointmentDate: "2020-05-05" }),
          patientFullName: "Sam Lee",
        },
      ],
    ];
    renderPage();
    await screen.findByRole("table");

    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2020-05-05" },
    });

    expect(await screen.findByText("Sam Lee")).toBeInTheDocument();
    // One request per date, each carrying the selected date.
    expect(mswState.appointmentsHits).toHaveLength(2);
    expect(
      mswState.appointmentsHits.map((hit) =>
        new URL(hit.url).searchParams.get("date"),
      ),
    ).toEqual([toLocalDateString(), "2020-05-05"]);
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2); // header + one row
  });

  it("AC2: surfaces load failures with a working retry", async () => {
    const user = userEvent.setup();
    mswState.appointmentsErrorMode = "server-error";
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load the schedule",
    );

    mswState.appointmentsErrorMode = null;
    mswState.appointmentsResponses = [[scheduled()]];
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("never offers queue mutations or admin-only actions on the schedule page", async () => {
    mswState.appointmentsResponses = [[scheduled()]];
    renderPage();

    await screen.findByRole("table");
    expect(
      screen.queryByRole("button", { name: /check\s*in/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /no\s*show/i }),
    ).not.toBeInTheDocument();
    // Completion happens on the consultation page only.
    expect(
      screen.queryByRole("button", { name: /complete/i }),
    ).not.toBeInTheDocument();
    // A scheduled row offers only Start Consultation; plus the header Refresh.
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("polls the queue about every 2 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mswState.appointmentsResponses = [[scheduled()], [scheduled()]];
    renderPage();

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(mswState.appointmentsHits).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(QUEUE_POLL_INTERVAL_MS);
    });
    await waitFor(() => expect(mswState.appointmentsHits).toHaveLength(2));

    act(() => {
      vi.advanceTimersByTime(QUEUE_POLL_INTERVAL_MS);
    });
    // Third poll has no queued response left and falls back to `[]`;
    // the request itself proves the cadence continues.
    await waitFor(() => expect(mswState.appointmentsHits).toHaveLength(3));
  });

  it("shows a loading spinner on the first load only", async () => {
    mswState.appointmentsErrorMode = "delay";
    mswState.appointmentsResponses = [[scheduled()]];
    renderPage();

    expect(
      screen.getByRole("status", { name: "Loading appointment queue" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});
