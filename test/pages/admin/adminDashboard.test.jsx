import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Provider } from "react-redux";
import { delay, http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { store } from "../../../src/app/store";
import { clearSession, setSession } from "../../../src/features/auth/authSlice";
import AdminDashboardPage from "../../../src/pages/admin/AdminDashboardPage";
import AppointmentHubPage from "../../../src/pages/admin/AppointmentHubPage";
import RequireAuth from "../../../src/routes/RequireAuth";
import { clinicToday } from "../../../src/utils/clinicTime";
import { appointment, doctorPage } from "../../fixtures/adminWorkflows";

const ok = (data) => HttpResponse.json({ success: true, data });
const rows = () =>
  [
    "SCHEDULED",
    "ARRIVED",
    "COMPLETED",
    "NO_SHOW",
    "CANCELLED",
    "SCHEDULED",
  ].map((status, i) =>
    appointment({
      appointmentId: i + 1,
      appointmentDate: clinicToday(),
      status,
    }),
  );
const Location = () => {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
};
function open(role = "ADMIN") {
  store.dispatch(
    role ? setSession({ accessToken: "fixture-token", role }) : clearSession(),
  );
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <Routes>
          <Route element={<RequireAuth allowedRoles={["ADMIN"]} />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route
              path="/admin/appointments"
              element={<AppointmentHubPage />}
            />
          </Route>
          <Route path="*" element={<div>Destination</div>} />
        </Routes>
        <Location />
      </MemoryRouter>
    </Provider>,
  );
}
const summary = () =>
  screen.getByRole("region", { name: "Today's appointment summary" });
beforeEach(() => {
  server.use(
    http.get("*/appointments", () => ok(rows())),
    http.get("*/invoices", () =>
      ok({
        content: [{ status: "UNPAID", amountPaid: 100 }],
        totalElements: 27,
      }),
    ),
  );
});
afterEach(() => {
  cleanup();
  store.dispatch(clearSession());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ADM-01 using MSW and the authenticated client", () => {
  it("AC1 loads exact counters, all-page invoice totals and no clinical data", async () => {
    open();
    await waitFor(() =>
      expect(
        within(summary()).getByRole("heading", { name: "6" }),
      ).toBeInTheDocument(),
    );
    expect(
      within(summary()).getByRole("heading", { name: "2" }),
    ).toBeInTheDocument();
    expect(
      within(summary()).getAllByRole("heading", { name: "1" }),
    ).toHaveLength(3);
    expect(
      await screen.findByRole("heading", { name: "27" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cancelled:/)).toHaveTextContent("Cancelled: 1");
    expect(document.body).not.toHaveTextContent(
      /CLINICAL_SECRET|PRIVATE_REASON|Example Patient/,
    );
  });
  it("AC3 displays empty states and real zeros with usable shortcuts", async () => {
    server.use(
      http.get("*/appointments", () => ok([])),
      http.get("*/invoices", () => ok({ content: [], totalElements: 0 })),
    );
    open();
    expect(
      await screen.findByText("No appointments today"),
    ).toBeInTheDocument();
    expect(await screen.findByText("No pending invoices.")).toBeInTheDocument();
    expect(
      within(summary()).getAllByRole("heading", { name: "0" }),
    ).toHaveLength(5);
    expect(
      within(
        screen.getByRole("region", { name: "Quick Actions" }),
      ).getAllByRole("link"),
    ).toHaveLength(4);
  });
  it("shows skeletons without fake zeros while independent requests run", async () => {
    server.use(
      http.get("*/appointments", async () => {
        await delay(100);
        return ok([]);
      }),
      http.get("*/invoices", async () => {
        await delay(100);
        return ok({ content: [], totalElements: 0 });
      }),
    );
    open();
    expect(
      screen.getByRole("status", { name: "Loading appointment summary" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Loading pending invoices" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "0" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText("No appointments today"),
    ).toBeInTheDocument();
  });
  it("AC2 retries failed appointments without refetching successful billing", async () => {
    let appointments = 0,
      invoices = 0;
    server.use(
      http.get("*/appointments", () =>
        ++appointments === 1
          ? new HttpResponse(null, { status: 500 })
          : ok(rows()),
      ),
      http.get("*/invoices", () => {
        invoices++;
        return ok({ content: [], totalElements: 42 });
      }),
    );
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent("Appointments");
    expect(
      await screen.findByRole("heading", { name: "42" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry appointments" }));
    expect(
      await screen.findByRole("heading", { name: "6" }),
    ).toBeInTheDocument();
    expect(appointments).toBe(2);
    expect(invoices).toBe(1);
  });
  it.each([403, 429, 500])(
    "preserves appointments on invoice %s and retries billing",
    async (status) => {
      let calls = 0;
      server.use(
        http.get("*/invoices", () =>
          ++calls === 1
            ? new HttpResponse(null, { status })
            : ok({ content: [], totalElements: 12 }),
        ),
      );
      open();
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        status === 403
          ? "permission"
          : status === 429
            ? "Too many requests"
            : "could not be loaded",
      );
      expect(
        await screen.findByRole("heading", { name: "6" }),
      ).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: "Retry pending invoices" }),
      );
      expect(
        await screen.findByRole("heading", { name: "12" }),
      ).toBeInTheDocument();
      expect(calls).toBe(2);
    },
  );
  it("requests the explicit Colombo date and UNPAID total without invoice date bounds", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-23T18:45:00Z"));
    let appointmentUrl, invoiceUrl, authorization;
    server.use(
      http.get("*/appointments", ({ request }) => {
        appointmentUrl = new URL(request.url);
        authorization = request.headers.get("authorization");
        return ok([]);
      }),
      http.get("*/invoices", ({ request }) => {
        invoiceUrl = new URL(request.url);
        return ok({ content: [], totalElements: 0 });
      }),
    );
    open();
    await screen.findByText("No pending invoices.");
    expect(Object.fromEntries(appointmentUrl.searchParams)).toEqual({
      date: "2026-10-24",
    });
    expect(Object.fromEntries(invoiceUrl.searchParams)).toEqual({
      status: "UNPAID",
      page: "0",
      size: "1",
    });
    expect(authorization).toBe("Bearer fixture-token");
    expect(document.querySelector("time")).toHaveAttribute(
      "datetime",
      "2026-10-24",
    );
  });
  it.each(["appointments", "invoices"])(
    "rejects malformed %s success responses instead of showing zero",
    async (resource) => {
      server.use(http.get(`*/${resource}`, () => ok({ content: [] })));
      open();
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(
        screen.queryByText("No appointments today"),
      ).not.toBeInTheDocument();
    },
  );
  it("refreshes both resources and removes old counts on failure", async () => {
    let failed = false;
    server.use(
      http.get("*/appointments", () =>
        failed ? new HttpResponse(null, { status: 500 }) : ok(rows()),
      ),
    );
    open();
    await screen.findByRole("heading", { name: "27" });
    await screen.findByRole("heading", { name: "6" });
    failed = true;
    fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));
    await screen.findByRole("alert");
    expect(
      within(summary()).queryByRole("heading", { name: "6" }),
    ).not.toBeInTheDocument();
  });
  it("routes every shortcut directly and opens the established booking modal", async () => {
    server.use(http.get("*/users", () => ok(doctorPage())));
    open();
    const actions = within(
      screen.getByRole("region", { name: "Quick Actions" }),
    );
    for (const [label, href] of [
      ["Register Patient", "/admin/register-patient"],
      ["Queue Management", "/queue"],
      ["Billing", "/admin/billing"],
    ])
      expect(
        actions.getByRole("link", { name: new RegExp(label) }),
      ).toHaveAttribute("href", href);
    fireEvent.click(actions.getByRole("link", { name: /Book Appointment/ }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/admin/appointments?booking=new",
    );
  });
  it("refreshes on return after 15 seconds, ignores hidden tabs and coalesces focus events", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-24T05:00:00Z"));
    let calls = 0;
    server.use(
      http.get("*/appointments", () => {
        calls++;
        return ok(rows());
      }),
    );
    open();
    await screen.findByRole("heading", { name: "6" });
    await screen.findByRole("heading", { name: "27" });
    fireEvent.focus(window);
    expect(calls).toBe(1);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    vi.setSystemTime(new Date("2026-10-24T05:00:16Z"));
    fireEvent(document, new Event("visibilitychange"));
    expect(calls).toBe(1);
    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    fireEvent.focus(window);
    await waitFor(() => expect(calls).toBe(2));
    await screen.findByRole("heading", { name: "6" });
    fireEvent.focus(window);
    expect(calls).toBe(2);
  });
  it("changes the date and refetches appointments at Colombo midnight without polling APIs", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-24T18:29:59Z"));
    let tick,
      calls = 0;
    vi.spyOn(globalThis, "setInterval").mockImplementation((callback) => {
      tick = callback;
      return 123;
    });
    server.use(
      http.get("*/appointments", () => {
        calls++;
        return ok([]);
      }),
    );
    open();
    await screen.findByText("No appointments today");
    act(() => tick());
    expect(calls).toBe(1);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    vi.setSystemTime(new Date("2026-10-24T18:30:00Z"));
    act(() => tick());
    expect(calls).toBe(1);
    hidden.mockReturnValue(false);
    act(() => tick());
    await waitFor(() => expect(calls).toBe(2));
    expect(document.querySelector("time")).toHaveAttribute(
      "datetime",
      "2026-10-25",
    );
    await screen.findByText("No appointments today");
  });
  it("does not start another request when focus returns during a load", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-24T05:00:00Z"));
    let calls = 0;
    server.use(
      http.get("*/appointments", async () => {
        calls++;
        await delay(100);
        return ok([]);
      }),
    );
    open();
    await waitFor(() => expect(calls).toBe(1));
    vi.setSystemTime(new Date("2026-10-24T05:00:16Z"));
    fireEvent.focus(window);
    expect(calls).toBe(1);
    await screen.findByText("No appointments today");
  });
  it.each([
    [null, "/login"],
    ["DOCTOR", "/doctor/dashboard"],
    ["PHARMACIST", "/pharmacist/dashboard"],
    ["SUPER_ADMIN", "/super-admin/dashboard"],
  ])("blocks dashboard requests for %s", async (role, path) => {
    const request = vi.fn();
    server.use(
      http.get("*/appointments", request),
      http.get("*/invoices", request),
    );
    open(role);
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(path),
    );
    expect(request).not.toHaveBeenCalled();
  });
});
