import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import { mswState } from "../../msw/handlers";
import { WORKING_DAYS } from "../../../src/constants/schedule";
import { closePage, openPage } from "./superAdminHarness";

const PATH = "/super-admin/clinic-configuration";

afterEach(closePage);

const account = (userId, username, role, overrides = {}) => ({
  userId,
  username,
  email: `${username.toLowerCase()}@onecare.test`,
  role,
  isActive: true,
  ...overrides,
});

/** The roster the page filters down to DOCTOR. */
const seedRoster = () => {
  mswState.usersResponses = [
    [
      account(4, "KAPIOR-4410", "DOCTOR"),
      account(5, "ODENI-5520", "DOCTOR"),
      account(9, "RIVA-9001", "ADMIN"),
    ],
  ];
};

/** The headline tile holding `hint` (label / value / hint live in one card). */
const stat = (hint) => within(screen.getByText(hint).parentElement);

const openSchedule = async (name = "KAPIOR-4410") => {
  fireEvent.click(screen.getAllByRole("button", { name: "Edit schedule" })[0]);
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByRole("heading", {
      name: `Weekly Schedule — ${name}`,
    }),
  ).toBeInTheDocument();
  return dialog;
};

describe("super-admin clinic configuration — REST cases", () => {
  it("loads the doctor roster, every schedule and the active fee", async () => {
    seedRoster();
    openPage(PATH);

    await screen.findByText(/KAPIOR-4410/);

    expect(mswState.usersHits).toHaveLength(1);
    expect(mswState.usersHits[0].authorization).toBe(
      "Bearer super-admin-rest-token",
    );
    expect(mswState.doctorScheduleHits.map((hit) => hit.id).sort()).toEqual([
      "4",
      "5",
    ]);
    expect(mswState.doctorScheduleHits[0].authorization).toBe(
      "Bearer super-admin-rest-token",
    );
    expect(mswState.consultationFeeHits).toHaveLength(1);
    expect(mswState.consultationFeeHits[0].authorization).toBe(
      "Bearer super-admin-rest-token",
    );

    // only DOCTOR accounts are scheduled
    expect(screen.queryByText(/RIVA-9001/)).not.toBeInTheDocument();
    expect(screen.getByText("2 doctors")).toBeInTheDocument();

    expect(stat("1 scheduled").getByText("2")).toBeInTheDocument();
    expect(stat("All doctors").getByText("10")).toBeInTheDocument();
    expect(stat("Aggregate hours").getByText("35h")).toBeInTheDocument();
    expect(stat("Active clinic-wide").getByText("75.00")).toBeInTheDocument();

    expect(screen.getByText("35h / week")).toBeInTheDocument();
    expect(screen.getByText("No schedule")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toHaveValue(75);
  });

  it("persists a new consultation fee through PUT /system/settings/consultation-fee", async () => {
    seedRoster();
    openPage(PATH);
    await screen.findByText(/KAPIOR-4410/);

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "120" },
    });
    expect(screen.getByText("Unsaved change")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save fee" }));

    expect(
      await screen.findByText("Consultation fee updated."),
    ).toBeInTheDocument();
    expect(mswState.consultationFeeUpdateHits).toHaveLength(1);
    expect(mswState.consultationFeeUpdateHits[0]).toMatchObject({
      body: { consultationFee: 120 },
      authorization: "Bearer super-admin-rest-token",
    });
    expect(stat("Active clinic-wide").getByText("120.00")).toBeInTheDocument();
    expect(screen.getByText("Currently active")).toBeInTheDocument();
  });

  it("shows the backend refusal and keeps the draft when the fee save fails", async () => {
    seedRoster();
    openPage(PATH);
    await screen.findByText(/KAPIOR-4410/);

    mswState.consultationFeeErrorMode = "forbidden";
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save fee" }));

    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(mswState.consultationFeeUpdateHits).toHaveLength(1);
    expect(screen.getByLabelText("Amount")).toHaveValue(150);
    expect(screen.getByText("Unsaved change")).toBeInTheDocument();
    expect(stat("Active clinic-wide").getByText("75.00")).toBeInTheDocument();
  });

  it("surfaces a fee load failure and retries it", async () => {
    seedRoster();
    mswState.consultationFeeErrorMode = "server-error";
    openPage(PATH);

    expect(await screen.findByText("Unable to load fee")).toBeInTheDocument();
    expect(screen.getByText("Internal server error")).toBeInTheDocument();
    expect(mswState.consultationFeeHits).toHaveLength(1);

    mswState.consultationFeeErrorMode = null;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Amount")).toHaveValue(75),
    );
    expect(mswState.consultationFeeHits).toHaveLength(2);
  });

  it("surfaces a roster load failure and retries it", async () => {
    seedRoster();
    mswState.usersErrorMode = "server-error";
    openPage(PATH);

    expect(
      await screen.findByText("Unable to load doctors"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The staff directory could not be fetched."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Edit schedule")).not.toBeInTheDocument();

    mswState.usersErrorMode = null;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText(/KAPIOR-4410/)).toBeInTheDocument();
    expect(mswState.usersHits).toHaveLength(2);
  });

  it("saves a weekly schedule through PUT /doctors/{id}/schedule", async () => {
    seedRoster();
    openPage(PATH);
    await screen.findByText(/KAPIOR-4410/);

    const dialog = await openSchedule();
    fireEvent.click(
      within(dialog).getByRole("button", { name: /9 AM.5 PM every day/ }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save schedule" }),
    );

    expect(
      await screen.findByText("Schedule saved for doctor."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(mswState.doctorScheduleWriteHits).toHaveLength(1);
    const hit = mswState.doctorScheduleWriteHits[0];
    expect(hit).toMatchObject({
      id: "4",
      authorization: "Bearer super-admin-rest-token",
    });
    expect(hit.body.days.map((day) => day.dayOfWeek)).toEqual(WORKING_DAYS);
    expect(hit.body.days).toHaveLength(7);
    for (const day of hit.body.days) {
      expect(day.timeSlots).toEqual([{ start: "09:00", end: "17:00" }]);
    }

    expect(screen.getByText("56h / week")).toBeInTheDocument();
  });

  it("blocks overlapping slots before any request leaves the browser", async () => {
    seedRoster();
    openPage(PATH);
    await screen.findByText(/KAPIOR-4410/);

    const dialog = await openSchedule();
    fireEvent.click(
      within(dialog).getAllByRole("button", { name: "Add time slot" })[0],
    );
    fireEvent.change(document.getElementById("start-MONDAY-2"), {
      target: { value: "10:00" },
    });
    fireEvent.change(document.getElementById("end-MONDAY-2"), {
      target: { value: "11:00" },
    });

    expect(
      screen.getAllByText("This time overlaps another slot.").length,
    ).toBeGreaterThan(0);

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save schedule" }),
    );

    expect(
      screen.getByText("Mon: time slots cannot overlap."),
    ).toBeInTheDocument();
    expect(mswState.doctorScheduleWriteHits).toHaveLength(0);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("refuses to save an all-days-off week", async () => {
    seedRoster();
    openPage(PATH);
    await screen.findByText(/KAPIOR-4410/);

    const dialog = await openSchedule();
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear all" }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save schedule" }),
    );

    expect(
      screen.getByText(
        "Add at least one time slot — a schedule cannot be empty.",
      ),
    ).toBeInTheDocument();
    expect(mswState.doctorScheduleWriteHits).toHaveLength(0);
  });

  it("keeps the modal open when the backend rejects the schedule", async () => {
    seedRoster();
    openPage(PATH);
    await screen.findByText(/KAPIOR-4410/);

    const dialog = await openSchedule();
    fireEvent.click(
      within(dialog).getByRole("button", { name: /9 AM.5 PM every day/ }),
    );

    mswState.doctorScheduleErrorMode = "server-error";
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save schedule" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Unable to save the schedule");
    expect(alert).toHaveTextContent("Internal server error");
    expect(mswState.doctorScheduleWriteHits).toHaveLength(1);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
