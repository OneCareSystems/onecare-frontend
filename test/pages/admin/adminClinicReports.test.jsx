import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { Provider } from "react-redux";
import { delay, http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { store } from "../../../src/app/store";
import { clearSession, setSession } from "../../../src/features/auth/authSlice";
import ClinicReports from "../../../src/components/admin/ClinicReports";
import AppRoutes from "../../../src/routes/AppRoutes";
import { doctorPage } from "../../fixtures/adminWorkflows";
import apiClient from "../../../src/services/apiClient";
import { CLINIC_REPORT_TIMEOUT_MS } from "../../../src/services/reportService";

const ok = (data) => HttpResponse.json({ success: true, data });
const fixture = (request, overrides = {}) => {
  const url = new URL(request.url);
  return {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    doctorId: url.searchParams.has("doctorId")
      ? Number(url.searchParams.get("doctorId"))
      : null,
    totalAppointments: 9,
    consultationCount: 4,
    scheduled: 2,
    arrived: 1,
    completed: 4,
    cancelled: 1,
    noShow: 1,
    uniquePatients: 2,
    generatedAt: "2026-10-24T10:30:00",
    ...overrides,
  };
};
const generate = (from = "2026-10-01", to = "2026-10-24") => {
  fireEvent.change(screen.getByLabelText("Report from date"), {
    target: { value: from },
  });
  fireEvent.change(screen.getByLabelText("Report to date"), {
    target: { value: to },
  });
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
};
beforeEach(() => {
  store.dispatch(
    setSession({ accessToken: "fixture-report-token", role: "ADMIN" }),
  );
  server.use(
    http.get("*/users", () => ok(doctorPage())),
    http.get("*/reports/clinic", ({ request }) => ok(fixture(request))),
  );
});
afterEach(() => {
  cleanup();
  store.dispatch(clearSession());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ADM-08 real client with mocked API (MSW)", () => {
  it("AC1 maps real aggregate fields, charts and doctor/date queries", async () => {
    const requests = [];
    server.use(
      http.get("*/reports/clinic", ({ request }) => {
        requests.push(request);
        return ok(fixture(request, { reason: "SECRET" }));
      }),
    );
    render(<ClinicReports />);
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
    await screen.findByRole("option", { name: "Example Doctor" });
    fireEvent.change(screen.getByLabelText("Report doctor"), {
      target: { value: "301" },
    });
    generate();
    const chart = await screen.findByRole("img", {
      name: /Appointments by status/,
    });
    expect(chart).toHaveAccessibleName(
      "Appointments by status: Scheduled: 2, Arrived: 1, Completed: 4, Cancelled: 1, No-show: 1",
    );
    expect(screen.getByLabelText("Clinic report summary")).toHaveTextContent(
      "Total appointments9Unique patients2Consultations4Arrived1",
    );
    expect(Object.fromEntries(new URL(requests[0].url).searchParams)).toEqual({
      from: "2026-10-01",
      to: "2026-10-24",
      doctorId: "301",
    });
    expect(requests[0].headers.get("authorization")).toBe(
      "Bearer fixture-report-token",
    );
    expect(document.body).not.toHaveTextContent(
      /SECRET|Demo|Total revenue|New patients|Average queue/,
    );
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();
    const table = screen.getByRole("table");
    expect(within(table).getByText("No-show").closest("tr")).toHaveTextContent(
      "No-show1",
    );
  });
  it("downloads CSV from the displayed snapshot without another API request", async () => {
    const blobs = [];
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = vi.fn((blob) => {
          blobs.push(blob);
          return "blob:report";
        });
        static revokeObjectURL = vi.fn();
      },
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function () {
        expect(this.download).toBe(
          "onecare-clinic-report-2026-10-01-to-2026-10-24-doctor-301.csv",
        );
      });
    let calls = 0;
    server.use(
      http.get("*/reports/clinic", ({ request }) => {
        calls++;
        return ok(fixture(request));
      }),
    );
    render(<ClinicReports />);
    await screen.findByRole("option", { name: "Example Doctor" });
    fireEvent.change(screen.getByLabelText("Report doctor"), {
      target: { value: "301" },
    });
    generate();
    await screen.findByRole("img");
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(click).toHaveBeenCalledOnce();
    expect(calls).toBe(1);
    expect(blobs[0].type).toBe("text/csv;charset=utf-8;");
    const csv = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(blobs[0]);
    });
    expect(csv).toContain('"301","Example Doctor","9","2","4"');
    fireEvent.change(screen.getByLabelText("Report to date"), {
      target: { value: "2026-10-25" },
    });
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
  it("AC3 renders verified zero figures and disables CSV for an empty report", async () => {
    server.use(
      http.get("*/reports/clinic", ({ request }) =>
        ok(
          fixture(request, {
            totalAppointments: 0,
            consultationCount: 0,
            scheduled: 0,
            arrived: 0,
            completed: 0,
            cancelled: 0,
            noShow: 0,
            uniquePatients: 0,
          }),
        ),
      ),
    );
    render(<ClinicReports />);
    generate();
    expect(await screen.findByText("No clinic activity")).toBeInTheDocument();
    expect(screen.getByLabelText("Clinic report summary")).toHaveTextContent(
      "Total appointments0Unique patients0Consultations0Arrived0",
    );
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  });
  it.each([400, 403, 422, 429, 500])(
    "shows %s errors separately from empty and retries the same filters",
    async (status) => {
      let calls = 0;
      server.use(
        http.get("*/reports/clinic", ({ request }) =>
          ++calls === 1
            ? new HttpResponse(null, { status })
            : ok(fixture(request)),
        ),
      );
      render(<ClinicReports />);
      generate();
      await screen.findByRole("alert");
      expect(screen.queryByText("No clinic activity")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Report from date")).toHaveValue(
        "2026-10-01",
      );
      expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Retry report" }));
      expect(await screen.findByRole("img")).toBeInTheDocument();
      expect(calls).toBe(2);
    },
  );
  it("AC2 times out just above ten seconds, asks for a narrower range and can retry", async () => {
    let calls = 0;
    const get = vi.spyOn(apiClient, "get");
    server.use(
      http.get("*/reports/clinic", async ({ request }) => {
        if (++calls === 1) await delay(12000);
        return ok(fixture(request));
      }),
    );
    render(<ClinicReports />);
    generate();
    expect(screen.getByText("Loading clinic statistics…")).toBeInTheDocument();
    expect(
      await screen.findByRole("alert", {}, { timeout: 14000 }),
    ).toHaveTextContent(/narrow the date range/);
    expect(get).toHaveBeenCalledWith(
      "/reports/clinic",
      expect.objectContaining({ timeout: CLINIC_REPORT_TIMEOUT_MS }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry report" }));
    await screen.findByRole("img");
    expect(calls).toBe(2);
  }, 16000);
  it("coordinates rapid filter changes so a stale request cannot overwrite a newer report", async () => {
    let calls = 0;
    server.use(
      http.get("*/reports/clinic", async ({ request }) => {
        const first = ++calls === 1;
        await delay(first ? 200 : 5);
        return ok(fixture(request, { totalAppointments: first ? 99 : 12 }));
      }),
    );
    render(<ClinicReports />);
    generate();
    await waitFor(() => expect(calls).toBe(1));
    fireEvent.change(screen.getByLabelText("Report to date"), {
      target: { value: "2026-10-25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
    await screen.findByRole("img");
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(screen.getByLabelText("Clinic report summary")).toHaveTextContent(
      "Total appointments12",
    );
    expect(screen.getByText(/2026-10-01 to 2026-10-25/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("99");
  });
  it("rejects missing, reversed and over-limit ranges without requests", () => {
    const get = vi.spyOn(apiClient, "get");
    render(<ClinicReports />);
    generate("", "");
    expect(screen.getByRole("alert")).toHaveTextContent(/Both/);
    generate("2026-10-25", "2026-10-01");
    expect(screen.getByRole("alert")).toHaveTextContent(/after/);
    generate("2024-01-01", "2025-01-01");
    expect(screen.getByRole("alert")).toHaveTextContent(/too large/);
    expect(get.mock.calls.some(([path]) => path === "/reports/clinic")).toBe(
      false,
    );
  });
  it("rejects mismatched or malformed successes without a fake empty state", async () => {
    server.use(
      http.get("*/reports/clinic", ({ request }) =>
        ok(fixture(request, { to: "2026-10-25" })),
      ),
    );
    render(<ClinicReports />);
    generate();
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  });
  it("retries the doctor directory independently", async () => {
    let calls = 0;
    server.use(
      http.get("*/users", () =>
        ++calls === 1
          ? new HttpResponse(null, { status: 403 })
          : ok(doctorPage()),
      ),
    );
    render(<ClinicReports />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Retry doctors" }));
    expect(
      await screen.findByRole("option", { name: "Example Doctor" }),
    ).toBeInTheDocument();
    expect(calls).toBe(2);
  });
  it("aborts pending reporting on unmount", async () => {
    const get = vi.spyOn(apiClient, "get");
    server.use(
      http.get("*/reports/clinic", async ({ request }) => {
        await delay(100);
        return ok(fixture(request));
      }),
    );
    const view = render(<ClinicReports />);
    generate();
    await waitFor(() =>
      expect(get.mock.calls.some(([path]) => path === "/reports/clinic")).toBe(
        true,
      ),
    );
    const signal = get.mock.calls.find(
      ([path]) => path === "/reports/clinic",
    )[1].signal;
    view.unmount();
    expect(signal.aborted).toBe(true);
  });
  it.each(["DOCTOR", "PHARMACIST"])(
    "blocks %s from the Admin report route",
    async (role) => {
      store.dispatch(setSession({ accessToken: "fixture-token", role }));
      const Location = () => (
        <output data-testid="path">{useLocation().pathname}</output>
      );
      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={["/admin/clinic-reports"]}>
            <AppRoutes />
            <Location />
          </MemoryRouter>
        </Provider>,
      );
      await waitFor(() =>
        expect(screen.getByTestId("path")).toHaveTextContent(
          `/${role.toLowerCase()}/dashboard`,
        ),
      );
      expect(
        screen.queryByRole("heading", { name: "Clinic Reports" }),
      ).not.toBeInTheDocument();
    },
  );
});
