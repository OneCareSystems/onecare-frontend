import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { store } from "../../src/app/store";
import {
  clearSession,
  setSession,
} from "../../src/features/auth/authSlice";
import { ROLES } from "../../src/constants/roles";
import AppRoutes from "../../src/routes/AppRoutes";

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const seed = (payload) => store.dispatch(setSession(payload));

/**
 * Renders the real route table (AppRoutes) inside MemoryRouter. MSW is
 * already active via test/setup.js, so any API the pages call is mocked.
 */
const renderAppAt = (initialPath) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="*" element={<AppRoutes />} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </Provider>,
  );

const expectLocation = (path) =>
  expect(screen.getByTestId("location")).toHaveTextContent(path);

beforeEach(() => {
  store.dispatch(clearSession());
});

describe("AppRoutes — CFG-03 role-based routing (integration)", () => {
  it("AC1: a Doctor opening /doctor/dashboard sees the doctor dashboard", () => {
    seed({ accessToken: "a", role: ROLES.DOCTOR });

    renderAppAt("/doctor/dashboard");

    expect(
      screen.getByRole("heading", { name: "DoctorDashboardPage" }),
    ).toBeInTheDocument();
    expectLocation("/doctor/dashboard");
  });

  it("AC1: each role lands on its own dashboard", () => {
    const cases = [
      [ROLES.ADMIN, "/admin/dashboard", "AdminDashboardPage"],
      [ROLES.DOCTOR, "/doctor/dashboard", "DoctorDashboardPage"],
      [
        ROLES.PHARMACIST,
        "/pharmacist/dashboard",
        "PharmacistDashboardPage",
      ],
      [
        ROLES.SUPER_ADMIN,
        "/superadmin/dashboard",
        "SuperAdminDashboardPage",
      ],
    ];

    for (const [role, path, heading] of cases) {
      store.dispatch(clearSession());
      seed({ accessToken: "a", role });

      const { unmount } = renderAppAt(path);

      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
      expectLocation(path);
      unmount();
    }
  });

  it("AC2 (negative): a Pharmacist opening an /admin route is sent to /pharmacist/dashboard", () => {
    seed({ accessToken: "a", role: ROLES.PHARMACIST });

    renderAppAt("/admin/dashboard");

    expect(
      screen.getByRole("heading", { name: "PharmacistDashboardPage" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("AdminDashboardPage")).not.toBeInTheDocument();
    expectLocation("/pharmacist/dashboard");
  });

  it("AC3: an unauthenticated user opening a protected route is sent to /login", () => {
    renderAppAt("/admin/dashboard");

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expectLocation("/login");
  });

  it("AC4: the shared Queue screen renders for every allowed role", () => {
    const allowed = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.SUPER_ADMIN];

    for (const role of allowed) {
      store.dispatch(clearSession());
      seed({ accessToken: "a", role });

      const { unmount } = renderAppAt("/queue");

      expect(
        screen.getByRole("heading", { name: "QueuePage" }),
      ).toBeInTheDocument();
      expectLocation("/queue");
      unmount();
    }
  });

  it("AC4: a Pharmacist is redirected away from the shared Queue screen", () => {
    seed({ accessToken: "a", role: ROLES.PHARMACIST });

    renderAppAt("/queue");

    expect(
      screen.getByRole("heading", { name: "PharmacistDashboardPage" }),
    ).toBeInTheDocument();
    expectLocation("/pharmacist/dashboard");
  });

  it("AC5: a mustChangePassword user opening a protected route is sent to /change-password", () => {
    seed({
      accessToken: "a",
      role: ROLES.DOCTOR,
      mustChangePassword: true,
    });

    renderAppAt("/doctor/dashboard");

    expect(
      screen.getByRole("heading", { name: "Change password" }),
    ).toBeInTheDocument();
    expectLocation("/change-password");
  });

  it("public routes stay reachable without a session", () => {
    renderAppAt("/home");

    expectLocation("/home");
  });
});
