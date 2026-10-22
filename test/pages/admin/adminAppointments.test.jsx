import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { store } from "../../../src/app/store";
import { clearSession, setSession } from "../../../src/features/auth/authSlice";
import BookAppointmentPage from "../../../src/pages/admin/BookAppointmentPage";
import AppointmentHubPage from "../../../src/pages/admin/AppointmentHubPage";
import { appointment, doctorPage } from "../../fixtures/adminWorkflows";
const ok = (data, status = 200) =>
  HttpResponse.json({ success: true, data }, { status });
const open = (Component) =>
  render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>,
  );
beforeEach(() => {
  store.dispatch(setSession({ accessToken: "fixture-token", role: "ADMIN" }));
  server.use(
    http.get("*/users", () => ok(doctorPage())),
    http.get("*/patients", () =>
      ok([
        {
          patientId: 101,
          fullName: "Example Patient",
          dateOfBirth: "1990-01-15",
          contactNo: "shared-phone",
        },
      ]),
    ),
    http.get("*/appointments/available-slots", () => ok(["16:00", "17:00"])),
  );
});
afterEach(() => {
  cleanup();
  store.dispatch(clearSession());
  vi.restoreAllMocks();
});
async function prepareBooking() {
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Example" },
  });
  fireEvent.click(
    await screen.findByRole("button", { name: "Select patient 101" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("combobox", { name: "Doctor" })).toHaveValue("301"),
  );
  fireEvent.change(screen.getByLabelText(/^Appointment Date/), {
    target: { value: "2090-01-15" },
  });
  fireEvent.click(await screen.findByRole("button", { name: "16:00" }));
  fireEvent.change(screen.getByLabelText("Reason for visit (optional)"), {
    target: { value: "Visit" },
  });
}
describe("ADM-04 booking with real authenticated HTTP client", () => {
  it("uses explicit shared-phone selection, preselects the only active doctor and confirms server data", async () => {
    let body;
    server.use(
      http.post("*/appointments", async ({ request }) => {
        body = await request.json();
        return ok(appointment(), 201);
      }),
    );
    open(BookAppointmentPage);
    await screen.findByRole("option", { name: "Example Doctor" });
    fireEvent.click(screen.getByRole("button", { name: "Book Appointment" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Select a patient");
    await prepareBooking();
    fireEvent.click(screen.getByRole("button", { name: "Book Appointment" }));
    expect(
      await screen.findByText(/Appointment 201 booked/),
    ).toBeInTheDocument();
    expect(body).toEqual({
      doctorId: 301,
      patientId: 101,
      appointmentDateTime: "2090-01-15T16:00:00",
      reason: "Visit",
    });
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.queryByText("CLINICAL_SECRET")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Book another appointment" }),
    );
    expect(screen.getByLabelText("Reason for visit (optional)")).toHaveValue(
      "Visit",
    );
    fireEvent.click(screen.getByRole("button", { name: "Change patient" }));
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });
  it("retains input after conflict, refreshes slots, and requires explicit alternative selection", async () => {
    let posts = 0;
    server.use(
      http.post("*/appointments", () => {
        posts++;
        return posts === 1
          ? HttpResponse.json(
              {
                success: false,
                data: { alternativeSlots: ["2090-01-15T17:00"] },
              },
              { status: 409 },
            )
          : ok(appointment({ timeSlot: "17:00:00" }), 201);
      }),
    );
    open(BookAppointmentPage);
    await prepareBooking();
    server.use(http.get("*/appointments/available-slots", () => ok(["17:00"])));
    fireEvent.click(screen.getByRole("button", { name: "Book Appointment" }));
    await screen.findByText(/Previously selected: 16:00/);
    expect(screen.getByLabelText(/^Appointment Date/)).toHaveValue(
      "2090-01-15",
    );
    expect(screen.getByLabelText("Reason for visit (optional)")).toHaveValue(
      "Visit",
    );
    fireEvent.click(screen.getByRole("button", { name: "Book Appointment" }));
    expect(posts).toBe(1);
    fireEvent.click(await screen.findByRole("button", { name: "17:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Book Appointment" }));
    expect(
      await screen.findByText(/Appointment 201 booked/),
    ).toBeInTheDocument();
    expect(posts).toBe(2);
  });
  it("blocks duplicate submission while pending and preserves input after failure", async () => {
    let posts = 0,
      release;
    server.use(
      http.post("*/appointments", async () => {
        posts++;
        await new Promise((resolve) => {
          release = resolve;
        });
        return new HttpResponse(null, { status: 500 });
      }),
    );
    open(BookAppointmentPage);
    await prepareBooking();
    const submit = screen.getByRole("button", { name: "Book Appointment" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(posts).toBe(1));
    expect(submit).toBeDisabled();
    release();
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Reason for visit (optional)")).toHaveValue(
      "Visit",
    );
    expect(submit).toBeEnabled();
  });
  it("handles multiple doctors, empty availability, invalid date and directory rejection", async () => {
    server.use(
      http.get("*/users", () =>
        ok({
          ...doctorPage(),
          content: [
            ...doctorPage().content,
            {
              userId: 302,
              username: "Second Doctor",
              role: "DOCTOR",
              isActive: true,
            },
          ],
        }),
      ),
      http.get("*/appointments/available-slots", () => ok([])),
    );
    open(BookAppointmentPage);
    await screen.findByRole("option", { name: "Second Doctor" });
    expect(screen.getByRole("combobox", { name: "Doctor" })).toHaveValue("");
    fireEvent.change(screen.getByRole("combobox", { name: "Doctor" }), {
      target: { value: "302" },
    });
    fireEvent.change(screen.getByLabelText(/^Appointment Date/), {
      target: { value: "2090-01-15" },
    });
    expect(await screen.findByText(/No available slots/)).toBeInTheDocument();
    cleanup();
    server.use(
      http.get("*/users", () => new HttpResponse(null, { status: 403 })),
    );
    open(BookAppointmentPage);
    expect(await screen.findByRole("alert")).toHaveTextContent(/permission/);
    expect(
      screen.getByRole("button", { name: "Book Appointment" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reason for visit (optional)"), {
      target: { value: "Keep this input" },
    });
    server.use(http.get("*/users", () => ok(doctorPage())));
    fireEvent.click(screen.getByRole("button", { name: "Retry doctors" }));
    await screen.findByRole("option", { name: "Example Doctor" });
    expect(screen.getByLabelText("Reason for visit (optional)")).toHaveValue(
      "Keep this input",
    );
  });
  it("shows no eligible doctors without inventing a choice", async () => {
    server.use(http.get("*/users", () => ok({ content: [], totalPages: 0 })));
    open(BookAppointmentPage);
    expect(
      await screen.findByText("No active doctors are available."),
    ).toBeInTheDocument();
  });
});
describe("ADM-05 appointment hub", () => {
  const scheduled = appointment(),
    arrived = appointment({ appointmentId: 202, status: "ARRIVED" });
  it("only offers Scheduled actions, confirms before mutations, and displays authoritative reschedule/cancel results", async () => {
    let rows = [scheduled, arrived],
      puts = 0,
      cancels = 0;
    server.use(
      http.get("*/appointments", () => ok(rows)),
      http.put("*/appointments/201", async ({ request }) => {
        expect(await request.json()).toEqual({
          appointmentDateTime: "2090-01-15T17:00:00",
        });
        puts++;
        rows = [appointment({ timeSlot: "17:30:00" }), arrived];
        return ok(rows[0]);
      }),
      http.patch("*/appointments/201/cancel", () => {
        cancels++;
        rows = [appointment({ status: "CANCELLED" }), arrived];
        return ok(rows[0]);
      }),
    );
    open(AppointmentHubPage);
    fireEvent.click(
      await screen.findByRole("button", { name: "Reschedule appointment 201" }),
    );
    expect(
      screen.queryByRole("button", { name: "Reschedule appointment 202" }),
    ).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "17:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Review reschedule" }));
    expect(puts).toBe(0);
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm reschedule", exact: true }),
    );
    await screen.findByText(/17:30:00 — Scheduled/);
    expect(puts).toBe(1);
    fireEvent.click(
      await screen.findByRole("button", { name: "Cancel appointment 201" }),
    );
    expect(cancels).toBe(0);
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm cancellation" }),
    );
    await screen.findByText(/— Cancelled/);
    expect(cancels).toBe(1);
  });
  it("supports cancelling the confirmation and validates unavailable reschedules", async () => {
    let cancels = 0;
    server.use(
      http.get("*/appointments", () => ok([scheduled])),
      http.patch("*/appointments/201/cancel", () => {
        cancels++;
        return ok(scheduled);
      }),
    );
    open(AppointmentHubPage);
    fireEvent.click(
      await screen.findByRole("button", { name: "Cancel appointment 201" }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Cancel",
        exact: true,
      }),
    );
    expect(cancels).toBe(0);
    fireEvent.click(
      screen.getByRole("button", { name: "Reschedule appointment 201" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Review reschedule" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/slot/);
    fireEvent.click(screen.getByRole("button", { name: "Close reschedule" }));
    expect(
      screen.queryByRole("button", { name: "Review reschedule" }),
    ).not.toBeInTheDocument();
  });
  it.each([409, 422, 403])(
    "handles reschedule HTTP %s without changing server state",
    async (status) => {
      server.use(
        http.get("*/appointments", () => ok([scheduled])),
        http.put(
          "*/appointments/201",
          () => new HttpResponse(null, { status }),
        ),
      );
      open(AppointmentHubPage);
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Reschedule appointment 201",
        }),
      );
      fireEvent.click(await screen.findByRole("button", { name: "17:00" }));
      fireEvent.click(
        screen.getByRole("button", { name: "Review reschedule" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Confirm reschedule", exact: true }),
      );
      await screen.findByRole("alert");
      expect(screen.getByLabelText("New appointment date")).toHaveValue(
        "2090-01-15",
      );
      expect(
        await screen.findByRole("button", { name: "Cancel appointment 201" }),
      ).toBeInTheDocument();
    },
  );
  it("filters locally by status/doctor and validates server date-range filters", async () => {
    let gets = 0;
    server.use(
      http.get("*/appointments", () => {
        gets++;
        return ok([scheduled, arrived]);
      }),
    );
    open(AppointmentHubPage);
    await screen.findByRole("button", { name: "Cancel appointment 201" });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "ARRIVED" },
    });
    expect(
      screen.queryByRole("button", { name: "Cancel appointment 201" }),
    ).not.toBeInTheDocument();
    expect(gets).toBe(1);
    fireEvent.change(screen.getByRole("combobox", { name: "Doctor" }), {
      target: { value: "301" },
    });
    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2090-02-01" },
    });
    fireEvent.change(screen.getByLabelText("To date"), {
      target: { value: "2090-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/before/);
    expect(gets).toBe(1);
  });
});
