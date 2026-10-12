import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { ROLES } from "../../src/constants/roles";
import AppRoutes from "../../src/routes/AppRoutes";
import { mswState, resetMswState } from "../msw/handlers";

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

afterEach(() => {
  resetMswState();
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
      [ROLES.PHARMACIST, "/pharmacist/dashboard", "PharmacistDashboardPage"],
      [ROLES.SUPER_ADMIN, "/super-admin/dashboard", "SuperAdminDashboardPage"],
    ];

    for (const [role, path, heading] of cases) {
      store.dispatch(clearSession());
      seed({ accessToken: "a", role });

      const { unmount } = renderAppAt(path);

      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
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

    expect(
      screen.getByRole("heading", { name: "Sign in to OneCare" }),
    ).toBeInTheDocument();
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

  it("the site root redirects to the public home page", () => {
    renderAppAt("/");

    expectLocation("/home");
  });

  it("an unknown URL renders the public 404 page instead of a blank screen", () => {
    renderAppAt("/no-such-page");

    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expectLocation("/no-such-page");
  });

  const signIn = (username) => {
    fireEvent.change(screen.getByLabelText(/professional id/i), {
      target: { value: username },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in securely/i }));
  };

  it("AC1 (end-to-end): a Doctor signs in on /login and lands on /doctor/dashboard", async () => {
    mswState.loginRole = ROLES.DOCTOR;

    renderAppAt("/login");
    signIn("doctor@onecare.test");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "DoctorDashboardPage" }),
      ).toBeInTheDocument();
    });
    expectLocation("/doctor/dashboard");
  });

  it("AC1 (end-to-end): after login the user returns to the deep link the guard preserved", async () => {
    mswState.loginRole = ROLES.ADMIN;

    renderAppAt("/queue");
    expectLocation("/login");

    signIn("admin@onecare.test");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "QueuePage" }),
      ).toBeInTheDocument();
    });
    expectLocation("/queue");
  });

  it("AC1 (negative): rejected credentials keep the visitor on /login with an error", async () => {
    mswState.loginValid = false;

    renderAppAt("/login");
    signIn("doctor@onecare.test");

    await waitFor(() => {
      expect(
        screen.getByText("Invalid username or password."),
      ).toBeInTheDocument();
    });
    expectLocation("/login");
    expect(
      screen.queryByRole("heading", { name: "DoctorDashboardPage" }),
    ).not.toBeInTheDocument();
  });
});
