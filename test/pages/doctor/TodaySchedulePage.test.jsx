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

import TodaySchedulePage, {
  CONCURRENT_CHANGE_MESSAGE,
} from "../../../src/pages/doctor/TodaySchedulePage";
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
    mswState.patientsResponses = [
      [
        { patientId: 1, fullName: "Jane Doe" },
        { patientId: 2, fullName: "Sam Lee" },
      ],
    ];
    mswState.queueResponses = [
      [
        scheduled(),
        scheduled({
          appointmentId: 102,
          patientId: 2,
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
    // Unknown patients degrade to a label instead of invented names.
    expect(rows[2]).toHaveTextContent("Patient 9");

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
    mswState.queueResponses = [[scheduled()]];
    renderPage();

    await screen.findByRole("table");
    await user.click(
      screen.getByRole("button", { name: "Start Consultation" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Consultation for appointment 101",
      }),
    ).toBeInTheDocument();
  });

  it("AC1: Complete marks the appointment and refreshes from the server (no optimistic change)", async () => {
    const user = userEvent.setup();
    mswState.queueResponses = [
      [scheduled()],
      // The refetched queue reflects the server's view after completion.
      [scheduled({ status: "COMPLETED" })],
    ];
    renderPage();

    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Complete" }));

    expect(mswState.queueCompleteHits).toHaveLength(1);
    expect(mswState.queueCompleteHits[0]).toMatchObject({
      id: "101",
      body: { status: "COMPLETED" },
    });
    expect(
      await screen.findByText("Consultation marked as completed."),
    ).toBeInTheDocument();
    await waitFor(() => expect(mswState.queueHits).toHaveLength(2));
    expect(await screen.findByText("Completed")).toBeInTheDocument();
  });

  it("AC3: shows the exact empty-state text when the date has no appointments", async () => {
    mswState.queueResponses = [[]];
    renderPage();

    expect(
      await screen.findByText(
        "No appointments scheduled for the selected date.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("re-fetches when the doctor picks another date and filters locally", async () => {
    mswState.queueResponses = [
      [scheduled()], // today
      // The backend only serves today's queue, so records for other dates
      // carry their own appointmentDate and are filtered client-side.
      [
        scheduled({ appointmentDate: "2020-05-05" }),
        scheduled({
          appointmentId: 102,
          patientId: 2,
          appointmentDate: "2020-06-06",
        }),
      ],
    ];
    renderPage();
    await screen.findByRole("table");

    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2020-05-05" },
    });

    // Only the record whose local calendar date matches survives the filter.
    expect(await screen.findByText("Patient 1")).toBeInTheDocument();
    expect(mswState.queueHits).toHaveLength(2);
    expect(screen.queryByText("Patient 2")).not.toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2); // header + one row
  });

  it("AC2: surfaces load failures with a working retry", async () => {
    const user = userEvent.setup();
    mswState.queueErrorMode = "server-error";
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load the schedule",
    );

    mswState.queueErrorMode = null;
    mswState.queueResponses = [[scheduled()]];
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("AC2: a failed Complete shows an error toast and keeps the queue server-driven", async () => {
    const user = userEvent.setup();
    mswState.queueCompleteErrorMode = "server-error";
    mswState.queueResponses = [[scheduled()], [scheduled()]];
    renderPage();

    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Complete" }));

    expect(
      await screen.findByText(
        "Unable to complete the consultation. Please try again.",
      ),
    ).toBeInTheDocument();
    // The queue was still re-fetched, never mutated optimistically.
    await waitFor(() => expect(mswState.queueHits).toHaveLength(2));
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });

  it("AC4: shows the concurrent-change message on 409 and refreshes the queue", async () => {
    const user = userEvent.setup();
    mswState.queueCompleteErrorMode = "conflict";
    mswState.queueResponses = [[scheduled()], []];
    renderPage();

    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Complete" }));

    expect(
      await screen.findByText(CONCURRENT_CHANGE_MESSAGE),
    ).toBeInTheDocument();
    // "The queue has been refreshed" — a refetch follows the conflict.
    await waitFor(() => expect(mswState.queueHits).toHaveLength(2));
    expect(
      await screen.findByText(
        "No appointments scheduled for the selected date.",
      ),
    ).toBeInTheDocument();
  });

  it("AC4: treats this backend's 400 conflict reports the same way", async () => {
    const user = userEvent.setup();
    mswState.queueCompleteErrorMode = "bad-request";
    mswState.queueResponses = [[scheduled()], [scheduled()]];
    renderPage();

    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Complete" }));

    expect(
      await screen.findByText(CONCURRENT_CHANGE_MESSAGE),
    ).toBeInTheDocument();
    await waitFor(() => expect(mswState.queueHits).toHaveLength(2));
  });

  it("ignores duplicate Complete clicks while the request is in flight", async () => {
    mswState.queueResponses = [[scheduled()], [scheduled()]];
    const { container } = renderPage();

    await screen.findByRole("table");
    const completeButton = screen.getByRole("button", { name: "Complete" });
    // Back-to-back clicks: the request-level guard must deduplicate.
    fireEvent.click(completeButton);
    fireEvent.click(completeButton);

    await waitFor(() => expect(mswState.queueCompleteHits).toHaveLength(1));
    await waitFor(() => expect(mswState.queueHits).toHaveLength(2));
    expect(container).toBeTruthy();
  });

  it("never offers admin-only queue actions (Check In / No Show)", async () => {
    mswState.queueResponses = [[scheduled()]];
    renderPage();

    await screen.findByRole("table");
    expect(
      screen.queryByRole("button", { name: /check\s*in/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /no\s*show/i }),
    ).not.toBeInTheDocument();
    // Only the two doctor actions exist for a scheduled row.
    expect(screen.getAllByRole("button")).toHaveLength(3); // + Refresh
  });

  it("polls the queue about every 2 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mswState.queueResponses = [[scheduled()], [scheduled()]];
    renderPage();

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(mswState.queueHits).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(QUEUE_POLL_INTERVAL_MS);
    });
    await waitFor(() => expect(mswState.queueHits).toHaveLength(2));

    act(() => {
      vi.advanceTimersByTime(QUEUE_POLL_INTERVAL_MS);
    });
    // Third poll has no queued response left and falls back to `[]`;
    // the request itself proves the cadence continues.
    await waitFor(() => expect(mswState.queueHits).toHaveLength(3));
  });

  it("shows a loading spinner on the first load only", async () => {
    mswState.queueErrorMode = "delay";
    mswState.queueResponses = [[scheduled()]];
    renderPage();

    expect(
      screen.getByRole("status", { name: "Loading appointment queue" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});
