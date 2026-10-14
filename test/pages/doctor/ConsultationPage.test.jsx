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
  mswState.appointmentsResponses = [[appointment()]];
};

afterEach(resetMswState);

describe("ConsultationPage (DOC-04) — full consultation workflow", () => {
  it("loads booking, current notes and previous clinical notes", async () => {
    seedBasic();
    mswState.clinicalNotesResponses = [
      {
        appointmentId: 101,
        patientId: 7,
        doctorId: 3,
        clinicalNotes: "BP 120/80",
      },
    ];
    mswState.historyResponses = [
      {
        patientId: 7,
        appointments: [historyEntry()],
        prescriptions: [],
      },
    ];
    renderAt("/doctor/consultation/101");

    // Booking from GET /api/appointments; name from GET /api/patients/7.
    expect(
      await screen.findByRole("region", { name: "Consultation details" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(mswState.protectedHits[0].id).toBe("7");

    // Current encounter notes come from GET .../clinical-notes (fix/44).
    expect(screen.getByLabelText(/notes for this encounter/i)).toHaveValue(
      "BP 120/80",
    );
    expect(mswState.clinicalNotesHits).toHaveLength(1);

    // Previous encounters from GET .../patient/7/history (fix/44).
    expect(
      screen.getByRole("region", { name: "Previous clinical notes" }),
    ).toHaveTextContent("Follow-up in two weeks.");
    expect(mswState.historyHits[0].patientId).toBe("7");
  });

  it("saves clinical notes via PUT /api/appointments/{id}", async () => {
    const user = userEvent.setup();
    seedBasic();
    renderAt("/doctor/consultation/101");

    const textarea = await screen.findByLabelText(/notes for this encounter/i);
    fireEvent.change(textarea, { target: { value: "Started antibiotics." } });
    await user.click(screen.getByRole("button", { name: "Save notes" }));

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

    const textarea = await screen.findByLabelText(/notes for this encounter/i);
    expect(textarea).toHaveAttribute(
      "maxlength",
      String(CLINICAL_NOTES_MAX_LENGTH),
    );
    expect(screen.getByText(/0\/2000 characters/)).toBeInTheDocument();
  });

  it("surfaces the backend rejection when notes cannot be saved", async () => {
    const user = userEvent.setup();
    seedBasic();
    mswState.appointmentUpdateErrorMode = "cancelled";
    renderAt("/doctor/consultation/101");

    await user.click(await screen.findByRole("button", { name: "Save notes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Clinical notes cannot be added to a cancelled appointment",
    );
  });

  it("issues a prescription with free-text items via POST /api/prescriptions", async () => {
    const user = userEvent.setup();
    seedBasic();
    renderAt("/doctor/consultation/101");

    await screen.findByRole("region", { name: "Consultation details" });
    fireEvent.change(screen.getByLabelText("Medicine name"), {
      target: { value: "Amoxicillin" },
    });
    fireEvent.change(screen.getByLabelText("Dosage"), {
      target: { value: "1 capsule" },
    });
    fireEvent.change(screen.getByLabelText("Frequency"), {
      target: { value: "Three times daily" },
    });
    fireEvent.change(screen.getByLabelText("Duration (days)"), {
      target: { value: "7" },
    });
    fireEvent.change(screen.getByLabelText("Quantity"), {
      target: { value: "21" },
    });
    await user.click(screen.getByRole("button", { name: "Add medicine" }));

    expect(screen.getByText(/Amoxicillin/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Create prescription" }),
    );

    expect(await screen.findByText("Prescription issued.")).toBeInTheDocument();
    expect(mswState.prescriptionCreateHits).toHaveLength(1);
    expect(mswState.prescriptionCreateHits[0].body).toMatchObject({
      patientId: 7,
      appointmentId: 101,
      items: [
        {
          itemType: "EXTERNAL_PURCHASE",
          medicineName: "Amoxicillin",
          dosage: "1 capsule",
          frequency: "Three times daily",
          durationDays: 7,
          quantity: 21,
        },
      ],
    });
    // The issued prescription is listed for this consultation.
    expect(
      screen.getByText(/Prescription #9001 — 1 item \(ISSUED\)/),
    ).toBeInTheDocument();
  });

  it("blocks an empty prescription item with a validation message", async () => {
    const user = userEvent.setup();
    seedBasic();
    renderAt("/doctor/consultation/101");

    await user.click(
      await screen.findByRole("button", { name: "Add medicine" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /fill in medicine name/i,
    );
    expect(mswState.prescriptionCreateHits).toHaveLength(0);
  });

  it("shows an empty state when no medicines were added", async () => {
    seedBasic();
    renderAt("/doctor/consultation/101");

    expect(
      await screen.findByText("No medicines added yet."),
    ).toBeInTheDocument();
  });

  it("completes the appointment from this page only (AC4)", async () => {
    const user = userEvent.setup();
    seedBasic();
    renderAt("/doctor/consultation/101");

    await user.click(
      await screen.findByRole("button", { name: "Complete consultation" }),
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
      screen.queryByRole("button", { name: "Complete consultation" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("This consultation has been completed."),
    ).toBeInTheDocument();
  });

  it("shows the concurrent-change message on conflict and reloads (409)", async () => {
    const user = userEvent.setup();
    // One response per load: initial + the post-conflict reload.
    mswState.appointmentsResponses = [[appointment()], [appointment()]];
    mswState.queueCompleteErrorMode = "conflict";
    renderAt("/doctor/consultation/101");

    await user.click(
      await screen.findByRole("button", { name: "Complete consultation" }),
    );

    expect(
      await screen.findByText(CONCURRENT_CHANGE_MESSAGE),
    ).toBeInTheDocument();
    // The screen reloads so the doctor sees the refreshed state.
    await waitFor(() => expect(mswState.appointmentsHits).toHaveLength(2));
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });

  it("treats this backend's 400 conflict reports the same way", async () => {
    const user = userEvent.setup();
    seedBasic();
    mswState.queueCompleteErrorMode = "bad-request";
    renderAt("/doctor/consultation/101");

    await user.click(
      await screen.findByRole("button", { name: "Complete consultation" }),
    );

    expect(
      await screen.findByText(CONCURRENT_CHANGE_MESSAGE),
    ).toBeInTheDocument();
    await waitFor(() => expect(mswState.appointmentsHits).toHaveLength(2));
  });

  it("surfaces other completion failures as an error toast", async () => {
    const user = userEvent.setup();
    seedBasic();
    mswState.queueCompleteErrorMode = "server-error";
    renderAt("/doctor/consultation/101");

    await user.click(
      await screen.findByRole("button", { name: "Complete consultation" }),
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

    const button = await screen.findByRole("button", {
      name: "Complete consultation",
    });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(mswState.queueCompleteHits).toHaveLength(1));
    expect(
      await screen.findByText("Consultation marked as completed."),
    ).toBeInTheDocument();
  });

  it("locks the form on cancelled appointments", async () => {
    mswState.appointmentsResponses = [
      [{ ...appointment(), status: "CANCELLED" }],
    ];
    renderAt("/doctor/consultation/101");

    expect(
      await screen.findByText(
        "Clinical notes cannot be added to a cancelled appointment.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save notes" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Complete consultation" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "This appointment is cancelled; it cannot be completed.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the empty history state when the patient has no previous notes", async () => {
    seedBasic();
    mswState.historyResponses = [
      { patientId: 7, appointments: [], prescriptions: [] },
    ];
    renderAt("/doctor/consultation/101");

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
    expect(
      await screen.findByRole("region", { name: "Consultation details" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/notes for this encounter/i)).toHaveValue("");
    expect(
      screen.getByText("No previous clinical notes for this patient."),
    ).toBeInTheDocument();
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
    seedBasic();
    renderAt("/doctor/consultation/101");

    await screen.findByRole("region", { name: "Consultation details" });
    await user.click(
      screen.getByRole("button", { name: /back to today’s schedule/i }),
    );
    expect(
      screen.getByRole("heading", { name: "Today’s schedule" }),
    ).toBeInTheDocument();
  });
});
