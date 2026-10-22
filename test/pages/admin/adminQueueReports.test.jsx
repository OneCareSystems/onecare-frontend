import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { server } from "../../msw/server";
import { store } from "../../../src/app/store";
import { clearSession, setSession } from "../../../src/features/auth/authSlice";
import AdminQueuePanel from "../../../src/components/admin/AdminQueuePanel";
import ClinicReports from "../../../src/components/admin/ClinicReports";
import AppRoutes from "../../../src/routes/AppRoutes";
import { appointment, doctorPage } from "../../fixtures/adminWorkflows";
import * as demoReports from "../../../src/utils/demoClinicReports";
const ok = (data) => HttpResponse.json({ success: true, data });
beforeEach(() => {
  store.dispatch(setSession({ accessToken: "fixture-token", role: "ADMIN" }));
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  store.dispatch(clearSession());
  delete document.hidden;
});

describe("ADM-06 Admin queue actions", () => {
  it("allows Scheduled check-in/no-show only and never renders clinical fields or Doctor completion", async () => {
    let rows = [
        appointment(),
        appointment({ appointmentId: 202, status: "ARRIVED" }),
        appointment({ appointmentId: 203, status: "COMPLETED" }),
      ],
      updates = [];
    server.use(
      http.get("*/queue/today", () => ok(rows)),
      http.get("*/appointments/today", () =>
        ok([
          appointment({
            appointmentId: 204,
            status: "NO_SHOW",
            queuePosition: undefined,
          }),
        ]),
      ),
      http.patch("*/queue/201/status", async ({ request }) => {
        const body = await request.json();
        updates.push(body);
        rows = rows.map((row) =>
          row.appointmentId === 201 ? { ...row, status: body.status } : row,
        );
        return ok(rows[0]);
      }),
    );
    render(<AdminQueuePanel />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Check in appointment 201" }),
    );
    await screen.findByText("Appointment 201: Arrived.");
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Check in appointment 201" }),
      ).not.toBeInTheDocument(),
    );
    expect(updates).toEqual([{ status: "ARRIVED" }]);
    expect(
      screen.queryByRole("button", { name: /Complete/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Check in appointment 204" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("CLINICAL_SECRET")).not.toBeInTheDocument();
    expect(screen.queryByText("PRIVATE_REASON")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Queue status"), {
      target: { value: "NO_SHOW" },
    });
    expect(screen.getByText("No-show")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Queue doctor"), {
      target: { value: "301" },
    });
  });
  it("requires confirmation for no-show and refetches after concurrent failure", async () => {
    let patches = 0;
    server.use(
      http.get("*/queue/today", () => ok([appointment()])),
      http.get("*/appointments/today", () => ok([])),
      http.patch("*/queue/201/status", () => {
        patches++;
        return new HttpResponse(null, { status: 409 });
      }),
    );
    render(<AdminQueuePanel />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Mark appointment 201 no-show",
      }),
    );
    expect(patches).toBe(0);
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Cancel",
        exact: true,
      }),
    );
    expect(patches).toBe(0);
    fireEvent.click(
      screen.getByRole("button", { name: "Mark appointment 201 no-show" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm no-show" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/changed/);
    expect(patches).toBe(1);
    expect(
      await screen.findByRole("button", { name: "Check in appointment 201" }),
    ).toBeInTheDocument();
  });
  it("shows initial queue errors safely", async () => {
    server.use(
      http.get("*/queue/today", () => new HttpResponse(null, { status: 403 })),
      http.get("*/appointments/today", () => ok([])),
    );
    render(<AdminQueuePanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/permission/);
  });
});
describe("ADM-08 backend gap and access control", () => {
  it("previews synthetic metrics, filters, exports only displayed demo rows and exits without inventing an API", async () => {
    server.use(http.get("*/users", () => ok(doctorPage())));
    const download = vi
      .spyOn(demoReports, "downloadDemoReport")
      .mockImplementation(() => {});
    render(<ClinicReports />);
    await screen.findByRole("option", { name: "Example Doctor" });
    expect(
      screen.queryByLabelText("Demo report summary"),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Preview demo report" }),
    );
    expect(screen.getByText(/DEMO — Synthetic data/)).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Example Doctor" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Demo daily appointments/ }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Report doctor"), {
      target: { value: "demo-doctor-a" },
    });
    fireEvent.change(screen.getByLabelText("Report to date"), {
      target: { value: "2026-10-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply demo filters" }));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      2,
    );
    fireEvent.click(screen.getByRole("button", { name: "Export demo CSV" }));
    expect(download).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          doctorId: "demo-doctor-a",
          date: "2026-10-12",
        }),
      ]),
      "2026-10-12",
      "2026-10-12",
    );
    fireEvent.change(screen.getByLabelText("Report from date"), {
      target: { value: "2090-01-01" },
    });
    fireEvent.change(screen.getByLabelText("Report to date"), {
      target: { value: "2090-01-02" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply demo filters" }));
    expect(screen.getByText(/No sample data matches/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Export demo CSV" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Exit demo preview" }));
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
    expect(screen.getByLabelText("Report from date")).toHaveValue("");
  });
  it("validates range, uses actual doctor directory and keeps CSV unavailable without fabricated statistics", async () => {
    let reports = 0;
    server.use(
      http.get("*/users", () => ok(doctorPage())),
      http.get("*/reports/clinic", () => {
        reports++;
        return ok({});
      }),
    );
    render(<ClinicReports />);
    await screen.findByRole("option", { name: "Example Doctor" });
    fireEvent.change(screen.getByLabelText("Report doctor"), {
      target: { value: "301" },
    });
    fireEvent.change(screen.getByLabelText("Report from date"), {
      target: { value: "2090-02-01" },
    });
    fireEvent.change(screen.getByLabelText("Report to date"), {
      target: { value: "2090-01-01" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Validate date range" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/before/);
    fireEvent.change(screen.getByLabelText("Report to date"), {
      target: { value: "2090-03-01" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Validate date range" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
    expect(reports).toBe(0);
    expect(
      screen.getByText(/does not yet provide clinic reports/),
    ).toBeInTheDocument();
  });
  it("handles doctor lookup errors without claiming report data exists", async () => {
    server.use(
      http.get("*/users", () => new HttpResponse(null, { status: 403 })),
    );
    render(<ClinicReports />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/permission/);
  });
  it.each(["ADMIN", "SUPER_ADMIN"])(
    "%s can open reports in its own layout",
    async (role) => {
      store.dispatch(setSession({ accessToken: "fixture-token", role }));
      server.use(http.get("*/users", () => ok(doctorPage())));
      render(
        <Provider store={store}>
          <MemoryRouter
            initialEntries={[
              role === "ADMIN"
                ? "/admin/clinic-reports"
                : "/super-admin/clinic-reports",
            ]}
          >
            <AppRoutes />
          </MemoryRouter>
        </Provider>,
      );
      expect(
        screen.getByRole("heading", { name: "Clinic Reports", exact: true }),
      ).toBeInTheDocument();
    },
  );
  it.each(["/admin/book-appointment", "/admin/appointments", "/admin/billing"])(
    "SUPER_ADMIN cannot open Admin-only workflow %s",
    async (path) => {
      store.dispatch(
        setSession({ accessToken: "fixture-token", role: "SUPER_ADMIN" }),
      );
      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
          </MemoryRouter>
        </Provider>,
      );
      expect(
        await screen.findByRole("heading", { name: "Super Admin Dashboard" }),
      ).toBeInTheDocument();
    },
  );
});
