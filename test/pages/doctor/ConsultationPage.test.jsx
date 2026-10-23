import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ConsultationPage, {
  CLINICAL_NOTES_MAX_LENGTH,
  CONCURRENT_CHANGE_MESSAGE,
} from "../../../src/pages/doctor/ConsultationPage";
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

const historyEntry = (overrides = {}) => ({
  appointmentId: 55,
  patientId: 7,
  doctorId: 3,
  appointmentDate: "2026-09-01",
  timeSlot: "10:00:00",
  status: "COMPLETED",
  reason: "Follow-up visit",
  clinicalNotes: "Follow-up in two weeks.",
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

const seedBasic = () => {
  mswState.appointmentByIdResponses = { 101: appointment() };
};

/**
 * The page does not expose ARIA landmarks/labels directly, so we anchor on
 * visible headings and text that the component actually renders.
 */
const waitForLoaded = async () => {
  await screen.findByText("Consultation Room");
  await screen.findByText("Patient Details");
};

const notesTextarea = () => screen.getByPlaceholderText(/diagnosis, advice/i);

const addMedicationItem = async (user, overrides = {}) => {
  const fields = {
    medicineName: "Amoxicillin",
    dosage: "1 capsule",
    frequency: "Three times daily",
    durationDays: "7",
    quantity: "21",
    ...overrides,
  };
  fireEvent.change(screen.getByLabelText(/medicine name/i), {
    target: { value: fields.medicineName },
  });
  fireEvent.change(screen.getByLabelText(/dosage/i), {
    target: { value: fields.dosage },
  });
  fireEvent.change(screen.getByLabelText(/frequency/i), {
    target: { value: fields.frequency },
  });
  fireEvent.change(screen.getByLabelText(/duration \(days\)/i), {
    target: { value: fields.durationDays },
  });
  fireEvent.change(screen.getByLabelText(/quantity/i), {
    target: { value: fields.quantity },
  });
  await user.click(screen.getByRole("button", { name: /add medication/i }));
};

afterEach(resetMswState);

describe("ConsultationPage (DOC-04) — full consultation workflow", () => {
  it("loads booking, current notes and previous clinical notes", async () => {
    // Current encounter notes ride on the appointment read itself — the page
    // no longer issues a separate GET .../clinical-notes while loading.
    mswState.appointmentByIdResponses = {
      101: { ...appointment(), clinicalNotes: "BP 120/80" },
    };
    mswState.historyResponses = [
      {
        patientId: 7,
        appointments: [historyEntry()],
        prescriptions: [],
      },
    ];
    renderAt("/doctor/consultation/101");

    await waitForLoaded();

    // Booking from GET /api/appointments; name from GET /api/patients/7.
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(mswState.protectedHits[0].id).toBe("7");

    expect(notesTextarea()).toHaveValue("BP 120/80");
    expect(mswState.clinicalNotesHits).toHaveLength(0); // no separate fetch

    // Previous encounters from GET ../patients/7/history.
    expect(screen.getByText("Previous Clinical Notes")).toBeInTheDocument();
    expect(screen.getByText("Follow-up in two weeks.")).toBeInTheDocument();
    expect(mswState.historyHits[0].patientId).toBe("7");
  });

  it("saves clinical notes via PUT /api/appointments/{id}", async () => {
    const user = userEvent.setup();
    seedBasic();
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    fireEvent.change(notesTextarea(), {
      target: { value: "Started antibiotics." },
    });
    await user.click(screen.getByRole("button", { name: /save notes/i }));

    expect(
      await screen.findByText("Clinical notes saved."),
    ).toBeInTheDocument();
    expect(mswState.appointmentUpdateHits).toHaveLength(1);
    expect(mswState.appointmentUpdateHits[0]).toMatchObject({
      id: "101",
      body: { clinicalNotes: "Started antibiotics." },
    });
    // Only notes are sent — date, reason and doctor are untouched.
    expect(Object.keys(mswState.appointmentUpdateHits[0].body)).toEqual([
      "clinicalNotes",
    ]);
  });

  it("caps clinical notes at the backend limit of 2000 characters", async () => {
    seedBasic();
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    expect(notesTextarea()).toHaveAttribute(
      "maxlength",
      String(CLINICAL_NOTES_MAX_LENGTH),
    );
    expect(
      screen.getByText(new RegExp(`0\\s*/\\s*${CLINICAL_NOTES_MAX_LENGTH}`)),
    ).toBeInTheDocument();
  });

  it("surfaces the backend rejection when notes cannot be saved", async () => {
    const user = userEvent.setup();
    seedBasic();
    mswState.appointmentUpdateErrorMode = "cancelled";
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    await user.type(notesTextarea(), "Follow-up required.");
    await user.click(screen.getByRole("button", { name: /save notes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /^Clinical notes cannot be added to a cancelled appointment$/,
    );
    expect(mswState.appointmentUpdateHits).toHaveLength(1);
    expect(mswState.appointmentUpdateHits[0]).toMatchObject({
      id: "101",
      body: { clinicalNotes: "Follow-up required." },
    });
  });

  it("issues a prescription with free-text items via POST /api/prescriptions", async () => {
    const user = userEvent.setup();
    seedBasic();
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    await addMedicationItem(user);

    expect(screen.getByText(/Amoxicillin/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /transmit prescription/i }),
    );

    expect(await screen.findByText("Prescription issued.")).toBeInTheDocument();
    expect(mswState.prescriptionCreateHits).toHaveLength(1);
    expect(mswState.prescriptionCreateHits[0].body).toMatchObject({
      patientId: 7,
      appointmentId: 101,
      items: [
        {
          medicineName: "Amoxicillin",
          dosage: "1 capsule",
          frequency: "Three times daily",
          durationDays: 7,
          quantity: 21,
        },
      ],
    });
    // The issued prescription is listed for this consultation.
    expect(screen.getByText(/Prescription #9001/)).toBeInTheDocument();
  });

  it("blocks an empty prescription item with a validation message", async () => {
    const user = userEvent.setup();
    seedBasic();
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    await user.click(screen.getByRole("button", { name: /add medication/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /fill in medicine name/i,
    );
    expect(mswState.prescriptionCreateHits).toHaveLength(0);
  });

  it("shows an empty state when no medicines were added", async () => {
    seedBasic();
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    expect(
      await screen.findByText("No medicines added yet."),
    ).toBeInTheDocument();
  });

  it("completes the appointment from this page only (AC4)", async () => {
    const user = userEvent.setup();
    seedBasic();
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    await user.click(
      screen.getByRole("button", { name: /complete consultation/i }),
    );

    expect(mswState.queueCompleteHits).toHaveLength(1);
    expect(mswState.queueCompleteHits[0]).toMatchObject({
      id: "101",
      body: { status: "COMPLETED" },
    });
    expect(
      await screen.findByText("Consultation marked as completed."),
    ).toBeInTheDocument();
    // Status reflects the server response and the action is retired.
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /complete consultation/i }),
    ).not.toBeInTheDocument();
    // Notes become read-only for completed appointments.
    expect(
      screen.getByText(
        /this consultation is completed; its clinical notes are read-only/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the concurrent-change message on conflict and reloads (409)", async () => {
    const user = userEvent.setup();
    // The screen reloads after the conflict, so the same booking is served
    // again (the per-id fixture is not consumed).
    mswState.appointmentByIdResponses = { 101: appointment() };
    mswState.queueCompleteErrorMode = "conflict";
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    await user.click(
      screen.getByRole("button", { name: /complete consultation/i }),
    );

    expect(
      await screen.findByText(CONCURRENT_CHANGE_MESSAGE),
    ).toBeInTheDocument();
    // The screen reloads so the doctor sees the refreshed state.
    await waitFor(() => expect(mswState.appointmentByIdHits).toHaveLength(2));
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });

  it("treats this backend's 400 conflict reports the same way", async () => {
    const user = userEvent.setup();
    seedBasic();
    mswState.queueCompleteErrorMode = "bad-request";
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    await user.click(
      screen.getByRole("button", { name: /complete consultation/i }),
    );

    expect(
      await screen.findByText(CONCURRENT_CHANGE_MESSAGE),
    ).toBeInTheDocument();
    await waitFor(() => expect(mswState.appointmentByIdHits).toHaveLength(2));
  });

  it("surfaces other completion failures as an error toast", async () => {
    const user = userEvent.setup();
    seedBasic();
    mswState.queueCompleteErrorMode = "server-error";
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    await user.click(
      screen.getByRole("button", { name: /complete consultation/i }),
    );

    expect(
      await screen.findByText(
        "Unable to complete the consultation. Please try again.",
      ),
    ).toBeInTheDocument();
    // Still scheduled — no optimistic change.
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });

  it("ignores duplicate completion clicks while the request is in flight", async () => {
    seedBasic();
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    const button = screen.getByRole("button", {
      name: /complete consultation/i,
    });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(mswState.queueCompleteHits).toHaveLength(1));
    expect(
      await screen.findByText("Consultation marked as completed."),
    ).toBeInTheDocument();
  });

  it("locks the form on cancelled appointments", async () => {
    mswState.appointmentByIdResponses = {
      101: { ...appointment(), status: "CANCELLED" },
    };
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    expect(
      screen.getByText(
        "Clinical notes cannot be added to a cancelled appointment.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save notes/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /complete consultation/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the empty history state when the patient has no previous notes", async () => {
    seedBasic();
    mswState.historyResponses = [
      { patientId: 7, appointments: [], prescriptions: [] },
    ];
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    expect(
      await screen.findByText("No previous clinical notes for this patient."),
    ).toBeInTheDocument();
  });

  it("degrades to no-notes when the fix/44 endpoints are unavailable", async () => {
    seedBasic();
    mswState.clinicalNotesErrorMode = "not-found";
    mswState.historyErrorMode = "not-found";
    renderAt("/doctor/consultation/101");

    // The booking still renders even without the clinical-notes backend.
    await waitForLoaded();
    expect(notesTextarea()).toHaveValue("");
    expect(
      screen.getByText("No previous clinical notes for this patient."),
    ).toBeInTheDocument();
  });

  it("reports an unreadable appointment as a load failure (404)", async () => {
    mswState.appointmentByIdErrorMode = "not-found";
    renderAt("/doctor/consultation/404");

    // A 404 from GET /appointments/{id} is a failed read, so the page shows
    // the retryable load error rather than the schedule panel.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to load the consultation/i,
    );
    expect(screen.queryByText(/appointment not available/i)).toBeNull();
    expect(mswState.protectedHits).toHaveLength(0); // no patient fetch
  });

  it("surfaces load failures with a working retry", async () => {
    const user = userEvent.setup();
    mswState.appointmentByIdErrorMode = "server-error";
    renderAt("/doctor/consultation/101");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to load the consultation/i,
    );

    mswState.appointmentByIdErrorMode = null;
    mswState.appointmentByIdResponses = { 101: appointment() };
    await user.click(screen.getByRole("button", { name: /retry/i }));

    await waitForLoaded();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("links back to the doctor's schedule", async () => {
    const user = userEvent.setup();
    seedBasic();
    mswState.appointmentByIdResponses = {
      101: { ...appointment(), status: "COMPLETED" },
    };
    renderAt("/doctor/consultation/101");

    await waitForLoaded();
    await user.click(screen.getByRole("button", { name: /back to schedule/i }));
    expect(
      screen.getByRole("heading", { name: /today.s Schedule/i }),
    ).toBeInTheDocument();
  });
});
