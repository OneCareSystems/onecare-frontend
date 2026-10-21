import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, useLocation } from "react-router-dom";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import AppRoutes from "../../src/routes/AppRoutes";
import TopBar from "../../src/components/TopBar";

afterEach(() => {
  cleanup();
  store.dispatch(clearSession());
});
const Location = () => (
  <output data-testid="location">{useLocation().pathname}</output>
);
function open(role, path, content = <AppRoutes />) {
  store.dispatch(setSession({ accessToken: "fixture-token", role }));
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        {content}
        <Location />
      </MemoryRouter>
    </Provider>,
  );
}

describe("Admin-only patient workflows and separate dashboards", () => {
  it.each([
    ["/admin/register-patient", "Register New Patient"],
    ["/admin/patient-search", "Search Patients"],
  ])("ADMIN can open %s", (path, heading) => {
    open("ADMIN", path);
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText("FAMILY CLINIC")).toBeInTheDocument();
  });

  it.each([
    "/admin/register-patient",
    "/admin/patient-search",
    "/admin/dashboard",
  ])("SUPER_ADMIN opening %s returns to its own dashboard", async (path) => {
    open("SUPER_ADMIN", path);
    expect(
      await screen.findByRole("heading", { name: "SuperAdminDashboardPage" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/super-admin/dashboard",
    );
    expect(screen.queryByText("FAMILY CLINIC")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    const sidebar = screen.getByRole("navigation", { name: "Main navigation" });
    expect(
      within(sidebar).queryByRole("link", { name: "Register Patient" }),
    ).not.toBeInTheDocument();
    expect(
      within(sidebar).queryByRole("link", { name: "Patient Search" }),
    ).not.toBeInTheDocument();
  });

  it.each(["ADMIN", "SUPER_ADMIN"])(
    "%s cannot open removed Super Admin patient routes",
    (role) => {
      for (const path of [
        "/super-admin/register-patient",
        "/super-admin/patient-search",
      ]) {
        open(role, path);
        expect(
          screen.getByRole("heading", { name: /page not found/i }),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole("heading", { name: "Register New Patient" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("heading", { name: "Search Patients" }),
        ).not.toBeInTheDocument();
        cleanup();
      }
    },
  );

  it("ADMIN cannot open the Super Admin dashboard", async () => {
    open("ADMIN", "/super-admin/dashboard");
    expect(
      await screen.findByRole("heading", { name: "AdminDashboardPage" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/admin/dashboard",
    );
  });

  it.each([
    ["DOCTOR", /today.s appointments/i],
    ["PHARMACIST", /PharmacistDashboardPage/],
  ])("%s cannot open either Admin patient workflow", async (role, heading) => {
    for (const path of ["/admin/register-patient", "/admin/patient-search"]) {
      open(role, path);
      expect(
        await screen.findByRole("heading", { name: heading }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Save Patient" }),
      ).not.toBeInTheDocument();
      cleanup();
    }
  });

  it.each(["ADMIN", "SUPER_ADMIN"])(
    "%s sidebar and Home return to the role dashboard",
    async (role) => {
      const dashboard =
        role === "ADMIN" ? "/admin/dashboard" : "/super-admin/dashboard";
      open(role, "/queue");
      fireEvent.click(
        screen.getByRole("link", { name: "Dashboard", exact: true }),
      );
      expect(screen.getByTestId("location")).toHaveTextContent(dashboard);
      cleanup();
      open(role, "/queue", <TopBar />);
      fireEvent.click(screen.getByRole("button", { name: "Home" }));
      expect(screen.getByTestId("location")).toHaveTextContent(dashboard);
    },
  );

  it("Super Admin keeps its own header through Queue and Home navigation", () => {
    open("SUPER_ADMIN", "/super-admin/dashboard");
    fireEvent.click(screen.getByRole("link", { name: "Queue", exact: true }));
    expect(
      screen.getByRole("heading", { name: "QueuePage" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("FAMILY CLINIC")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(
      screen.getByRole("heading", { name: "SuperAdminDashboardPage" }),
    ).toBeInTheDocument();
  });
});
