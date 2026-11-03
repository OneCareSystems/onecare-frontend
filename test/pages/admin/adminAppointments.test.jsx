import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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
    http.get("*/appointments", () => ok([])),
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
function openBooking() {
  open(AppointmentHubPage);
  fireEvent.click(screen.getByRole("button", { name: "+ Book Appointment" }));
}
async function prepareBooking() {
  fireEvent.click(
    screen.getByRole("combobox", { name: "Patient", exact: true }),
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Patient", exact: true }),
    {
      target: { value: "Example" },
    },
  );
  fireEvent.click(
    await screen.findByRole("option", {
      name: /Example Patient.*Clinic ID: 101/,
    }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("combobox", { name: "Doctor", exact: true }),
    ).toHaveValue("Example Doctor"),
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
    openBooking();
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Doctor", exact: true }),
      ).toHaveValue("Example Doctor"),
    );
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
    expect(
      within(
        screen.getByRole("dialog", { name: "Book Appointment" }),
      ).getByText("Scheduled"),
    ).toBeInTheDocument();
    expect(screen.queryByText("CLINICAL_SECRET")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Book another appointment" }),
    );
    expect(screen.getByLabelText("Reason for visit (optional)")).toHaveValue(
      "Visit",
    );
    fireEvent.click(
      screen.getByRole("combobox", { name: "Patient", exact: true }),
    );
    expect(
      screen.getByRole("combobox", { name: "Patient", exact: true }),
    ).toBeInTheDocument();
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
    openBooking();
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
    openBooking();
    await prepareBooking();
    const submit = screen.getByRole("button", { name: "Book Appointment" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(posts).toBe(1));
    expect(submit).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Close booking" }),
    ).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.getByRole("dialog", { name: "Book Appointment" }),
    ).toBeInTheDocument();
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
    openBooking();
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Doctor", exact: true }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("combobox", { name: "Doctor", exact: true }),
    );
    await screen.findByRole("option", { name: "Second Doctor" });
    expect(
      screen.getByRole("combobox", { name: "Doctor", exact: true }),
    ).toHaveValue("");
    fireEvent.click(screen.getByRole("option", { name: "Second Doctor" }));
    fireEvent.change(screen.getByLabelText(/^Appointment Date/), {
      target: { value: "2090-01-15" },
    });
    expect(await screen.findByText(/No available slots/)).toBeInTheDocument();
    cleanup();
    server.use(
      http.get("*/users", () => new HttpResponse(null, { status: 403 })),
    );
    openBooking();
    expect(await screen.findByRole("alert")).toHaveTextContent(/permission/);
    expect(
      screen.getByRole("button", { name: "Book Appointment" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reason for visit (optional)"), {
      target: { value: "Keep this input" },
    });
    server.use(http.get("*/users", () => ok(doctorPage())));
    fireEvent.click(screen.getByRole("button", { name: "Retry doctors" }));
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Doctor", exact: true }),
      ).toHaveValue("Example Doctor"),
    );
    expect(screen.getByLabelText("Reason for visit (optional)")).toHaveValue(
      "Keep this input",
    );
  });
  it("shows no eligible doctors without inventing a choice", async () => {
    server.use(http.get("*/users", () => ok({ content: [], totalPages: 0 })));
    openBooking();
    expect(
      await screen.findByText("No active doctors are available."),
    ).toBeInTheDocument();
  });
});
describe("ADM-05 appointment hub", () => {
  const scheduled = appointment(),
    arrived = appointment({ appointmentId: 202, status: "ARRIVED" });
  it("offers three direct Scheduled actions and checks in through the existing queue API", async () => {
    let rows = [
      scheduled,
      arrived,
      appointment({ appointmentId: 203, status: "CANCELLED" }),
      appointment({ appointmentId: 204, status: "COMPLETED" }),
      appointment({ appointmentId: 205, status: "NO_SHOW" }),
    ];
    const updates = [];
    let gets = 0;
    server.use(
      http.get("*/appointments", () => {
        gets++;
        return ok(rows);
      }),
      http.patch("*/queue/201/status", async ({ request }) => {
        updates.push(await request.json());
        rows = rows.map((row) =>
          row.appointmentId === 201 ? { ...row, status: "ARRIVED" } : row,
        );
        return ok(rows[0]);
      }),
    );
    open(AppointmentHubPage);
    const arrive = await screen.findByRole("button", {
      name: "Mark appointment 201 arrived",
    });
    const row = within(arrive.closest("tr"));
    expect(row.getAllByRole("button")).toHaveLength(3);
    expect(
      row.getByRole("button", { name: "Reschedule appointment 201" }),
    ).toHaveTextContent("Reschedule");
    expect(
      row.getByRole("button", { name: "Cancel appointment 201" }),
    ).toHaveTextContent("Cancel");
    expect(
      screen.getAllByRole("button", { name: /Mark appointment .* arrived/ }),
    ).toHaveLength(1);
    fireEvent.click(arrive);
    await screen.findByText("Appointment 201: Arrived.");
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Mark appointment 201 arrived" }),
      ).not.toBeInTheDocument(),
    );
    expect(updates).toEqual([{ status: "ARRIVED" }]);
    expect(gets).toBe(2);
    expect(
      within(screen.getByRole("table")).getAllByText("Arrived"),
    ).toHaveLength(2);
  });
  it("refreshes after a failed arrival and retains the Scheduled actions", async () => {
    let gets = 0;
    server.use(
      http.get("*/appointments", () => {
        gets++;
        return ok([scheduled]);
      }),
      http.patch(
        "*/queue/201/status",
        () => new HttpResponse(null, { status: 409 }),
      ),
    );
    open(AppointmentHubPage);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Mark appointment 201 arrived",
      }),
    );
    await screen.findByRole("alert");
    await waitFor(() => expect(gets).toBe(2));
    expect(
      screen.getByRole("button", { name: "Mark appointment 201 arrived" }),
    ).toBeEnabled();
  });
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
    expect(
      screen.queryByLabelText("New appointment date"),
    ).not.toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole("button", { name: "Reschedule appointment 201" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Reschedule appointment 201",
    });
    expect(
      within(dialog).getByLabelText("New appointment date"),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText("New appointment date")).toHaveLength(1);
    expect(
      within(dialog).getByRole("button", { name: "Close reschedule dialog" }),
    ).toHaveFocus();
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
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      await within(screen.getByRole("table")).findByText(/17:30:00/),
    ).toBeInTheDocument();
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
    let cancels = 0,
      puts = 0;
    server.use(
      http.get("*/appointments", () => ok([scheduled])),
      http.patch("*/appointments/201/cancel", () => {
        cancels++;
        return ok(scheduled);
      }),
      http.put("*/appointments/201", () => {
        puts++;
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
    fireEvent.click(await screen.findByRole("button", { name: "17:00" }));
    fireEvent.click(screen.getByRole("button", { name: "Review reschedule" }));
    fireEvent.click(screen.getByRole("button", { name: "Close reschedule" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(puts).toBe(0);
    expect(
      within(screen.getByRole("table")).getByText(/16:00/),
    ).toBeInTheDocument();
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
      if ([409, 422].includes(status)) {
        expect(screen.queryByText(/^Selected slot:/)).not.toBeInTheDocument();
        await waitFor(() =>
          expect(screen.getByRole("button", { name: "17:00" })).toHaveAttribute(
            "aria-pressed",
            "false",
          ),
        );
      }
      expect(
        screen.getByRole("dialog", { name: "Reschedule appointment 201" }),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Close reschedule" }));
      expect(
        screen.getByRole("button", { name: "Cancel appointment 201" }),
      ).toBeInTheDocument();
    },
  );
  it("traps focus, closes with Escape, and returns focus without rescheduling", async () => {
    let puts = 0;
    server.use(
      http.get("*/appointments", () => ok([scheduled])),
      http.put("*/appointments/201", () => {
        puts++;
        return ok(scheduled);
      }),
    );
    open(AppointmentHubPage);
    const opener = await screen.findByRole("button", {
      name: "Reschedule appointment 201",
    });
    opener.focus();
    fireEvent.click(opener);
    const close = screen.getByRole("button", { name: "Close reschedule" });
    close.focus();
    fireEvent.keyDown(close, { key: "Tab" });
    expect(
      screen.getByRole("button", { name: "Close reschedule dialog" }),
    ).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(puts).toBe(0);
  });
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
  it("applies patient/date filters and refreshes while keeping status and doctor selections", async () => {
    const requests = [];
    server.use(
      http.get("*/appointments", ({ request }) => {
        requests.push(new URL(request.url));
        return ok([scheduled, { ...arrived, doctorId: 302 }]);
      }),
    );
    open(AppointmentHubPage);
    await screen.findByRole("button", { name: "Reschedule appointment 201" });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "ARRIVED" },
    });
    fireEvent.change(screen.getByLabelText("Doctor"), {
      target: { value: "301" },
    });
    expect(screen.getByText("No appointments found")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Doctor"), {
      target: { value: "302" },
    });
    expect(
      within(screen.getByRole("table")).getByText("202"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2090-01-01" },
    });
    fireEvent.change(screen.getByLabelText("To date"), {
      target: { value: "2090-01-31" },
    });
    fireEvent.change(screen.getByLabelText("Patient name or stored phone"), {
      target: { value: "Example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(requests).toHaveLength(2));
    const refresh = screen.getByRole("button", {
      name: "Refresh appointments",
    });
    await waitFor(() => expect(refresh).toBeEnabled());
    fireEvent.click(refresh);
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(Object.fromEntries(requests[2].searchParams)).toEqual({
      from: "2090-01-01",
      to: "2090-01-31",
      search: "Example",
    });
    expect(screen.getByLabelText("Status")).toHaveValue("ARRIVED");
    expect(screen.getByLabelText("Doctor")).toHaveValue("302");
    await waitFor(() =>
      expect(
        within(screen.getByRole("table")).getByText("202"),
      ).toBeInTheDocument(),
    );
  });
});

describe("unified booking navigation and selections", () => {
  function CurrentLocation() {
    const location = useLocation();
    return (
      <output aria-label="Current location">
        {location.pathname}
        {location.search}
        {location.hash}
      </output>
    );
  }
  it("opens the old URL in the same Hub modal, preserves query/hash and refreshes the list only after a confirmed booking", async () => {
    let gets = 0,
      posts = 0;
    server.use(
      http.get("*/appointments", () => {
        gets++;
        return ok([]);
      }),
      http.post("*/appointments", () => {
        posts++;
        return ok(appointment(), 201);
      }),
    );
    render(
      <MemoryRouter
        initialEntries={["/admin/book-appointment?source=shortcut#booking"]}
      >
        <Routes>
          <Route
            path="/admin/book-appointment"
            element={<BookAppointmentPage />}
          />
          <Route path="/admin/appointments" element={<AppointmentHubPage />} />
        </Routes>
        <CurrentLocation />
      </MemoryRouter>,
    );
    await screen.findByRole("dialog", { name: "Book Appointment" });
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "/admin/appointments?source=shortcut&booking=new#booking",
    );
    expect(posts).toBe(0);
    await prepareBooking();
    fireEvent.click(
      screen.getByRole("button", { name: "Book Appointment", exact: true }),
    );
    await screen.findByText(/Appointment 201 booked/);
    await waitFor(() => expect(gets).toBe(2));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "+ Book Appointment" }),
    ).toHaveFocus();
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "/admin/appointments?source=shortcut#booking",
    );
  });
  it("keeps selected patient while searching other names and clearing is intentional; supports shared phones and first-page pagination", async () => {
    const requests = [];
    server.use(
      http.get("*/patients", ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const page = Number(url.searchParams.get("page"));
        return ok(
          Array.from({ length: page ? 2 : 10 }, (_, index) => ({
            patientId: 101 + index + page * 10,
            fullName: `Example ${index + page * 10}`,
            contactNo: "+94 771 234 567",
          })),
        );
      }),
    );
    openBooking();
    fireEvent.click(
      screen.getByRole("combobox", { name: "Patient", exact: true }),
    );
    await screen.findByRole("option", { name: /Clinic ID: 101/ });
    expect(requests[0].searchParams.has("search")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Next patients" }));
    await screen.findByRole("option", { name: /Clinic ID: 111/ });
    expect(
      screen.getByRole("button", { name: "Next patients" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous patients" }));
    fireEvent.click(
      await screen.findByRole("option", { name: /Clinic ID: 102/ }),
    );
    const trigger = screen.getByRole("combobox", {
      name: "Patient",
      exact: true,
    });
    expect(trigger.value).toContain("Clinic ID: 102");
    fireEvent.click(trigger);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Patient", exact: true }),
      { target: { value: "0771234567" } },
    );
    await screen.findByRole("option", { name: /Clinic ID: 101/ });
    expect(requests.at(-1).searchParams.get("search")).toBe("+94 771 234 567");
    fireEvent.change(
      screen.getByRole("combobox", { name: "Patient", exact: true }),
      { target: { value: "Another" } },
    );
    fireEvent.keyDown(
      screen.getByRole("combobox", { name: "Patient", exact: true }),
      { key: "Escape" },
    );
    expect(trigger.value).toContain("Clinic ID: 102");
    expect(
      screen.getByRole("dialog", { name: "Book Appointment" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear patient" }));
    expect(trigger).toHaveValue("");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("filters real doctors without replacing the selected doctor and clears a slot only after intentionally choosing another doctor", async () => {
    server.use(
      http.get("*/users", () =>
        ok({
          content: [
            {
              userId: 301,
              username: "Example Doctor",
              role: "DOCTOR",
              isActive: true,
            },
            {
              userId: 302,
              username: "Second Doctor",
              role: "DOCTOR",
              isActive: true,
            },
          ],
          totalPages: 1,
        }),
      ),
    );
    openBooking();
    const doctor = screen.getByRole("combobox", {
      name: "Doctor",
      exact: true,
    });
    await waitFor(() => expect(doctor).toBeEnabled());
    fireEvent.click(doctor);
    fireEvent.click(screen.getByRole("option", { name: "Example Doctor" }));
    fireEvent.change(screen.getByLabelText(/^Appointment Date/), {
      target: { value: "2090-01-15" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "16:00" }));
    expect(screen.getByRole("button", { name: "16:00" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(doctor);
    fireEvent.change(screen.getByRole("combobox", { name: "Doctor" }), {
      target: { value: "Second" },
    });
    expect(
      screen.queryByRole("option", { name: "Example Doctor" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "Second Doctor" }));
    expect(doctor).toHaveValue("Second Doctor");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "16:00" })).toHaveAttribute(
        "aria-pressed",
        "false",
      ),
    );
  });
});
