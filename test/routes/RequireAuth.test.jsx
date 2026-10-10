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
import { ROUTE_ACCESS } from "../../src/constants/routeAccess";
import RequireAuth from "../../src/routes/RequireAuth";

const LocationDisplay = () => {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.state?.from ? `|from:${location.state.from}` : ""}
    </div>
  );
};

const seed = (payload) => store.dispatch(setSession(payload));

const renderGuardedRoute = (
  initialPath,
  allowedRoles,
  pageTestId = "protected-page",
) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page" />} />
          <Route
            path="/change-password"
            element={<div data-testid="change-password-page" />}
          />
          <Route
            path="/admin/dashboard"
            element={<div data-testid="admin-page" />}
          />
          <Route
            path="/pharmacist/dashboard"
            element={<div data-testid="pharmacist-page" />}
          />
          <Route
            element={<RequireAuth allowedRoles={allowedRoles} />}
          >
            <Route
              path="/protected"
              element={<div data-testid={pageTestId} />}
            />
          </Route>
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

describe("RequireAuth — CFG-03 route guard", () => {
  it("AC1: renders the guarded route for an allowed role", () => {
    seed({ accessToken: "a", role: ROLES.DOCTOR });

    renderGuardedRoute("/protected", [ROLES.DOCTOR]);

    expect(screen.getByTestId("protected-page")).toBeInTheDocument();
    expectLocation("/protected");
  });

  it("AC3: redirects an unauthenticated user to /login", () => {
    renderGuardedRoute("/protected", [ROLES.DOCTOR]);

    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-page")).not.toBeInTheDocument();
    expectLocation("/login");
  });

  it("AC3: keeps the attempted path in location state for post-login redirect", () => {
    renderGuardedRoute("/protected?tab=1", [ROLES.DOCTOR]);

    expect(screen.getByTestId("location")).toHaveTextContent(
      "from:/protected?tab=1",
    );
  });

  it("AC2: redirects a wrong-role user to their own dashboard", () => {
    seed({ accessToken: "a", role: ROLES.PHARMACIST });

    renderGuardedRoute("/protected", [ROLES.ADMIN]);

    expect(screen.getByTestId("pharmacist-page")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-page")).not.toBeInTheDocument();
    expectLocation("/pharmacist/dashboard");
  });

  it("AC4: renders a shared screen for each allowed role", () => {
    const sharedRoles = ROUTE_ACCESS.queue;
    expect(sharedRoles).toContain(ROLES.ADMIN);
    expect(sharedRoles).toContain(ROLES.DOCTOR);
    expect(sharedRoles).toContain(ROLES.SUPER_ADMIN);

    for (const role of sharedRoles) {
      store.dispatch(clearSession());
      seed({ accessToken: "a", role });

      const { unmount } = renderGuardedRoute("/protected", sharedRoles);

      expect(screen.getByTestId("protected-page")).toBeInTheDocument();
      expectLocation("/protected");
      unmount();
    }
  });

  it("AC4: redirects a non-allowed role away from a shared screen", () => {
    seed({ accessToken: "a", role: ROLES.PHARMACIST });

    renderGuardedRoute("/protected", ROUTE_ACCESS.queue);

    expect(screen.getByTestId("pharmacist-page")).toBeInTheDocument();
    expectLocation("/pharmacist/dashboard");
  });

  it("AC5: redirects a mustChangePassword user to /change-password", () => {
    seed({
      accessToken: "a",
      role: ROLES.DOCTOR,
      mustChangePassword: true,
    });

    renderGuardedRoute("/protected", [ROLES.DOCTOR]);

    expect(screen.getByTestId("change-password-page")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-page")).not.toBeInTheDocument();
    expectLocation("/change-password");
  });

  it("AC5: lets a mustChangePassword user stay on /change-password", () => {
    seed({
      accessToken: "a",
      role: ROLES.DOCTOR,
      mustChangePassword: true,
    });

    renderGuardedRoute("/change-password", [ROLES.DOCTOR]);

    expect(screen.getByTestId("change-password-page")).toBeInTheDocument();
    expectLocation("/change-password");
  });

  it("treats a missing allowedRoles list as open to any authenticated role", () => {
    seed({ accessToken: "a", role: ROLES.PHARMACIST });

    renderGuardedRoute("/protected", undefined);

    expect(screen.getByTestId("protected-page")).toBeInTheDocument();
  });

  it("redirects an authenticated user with no known role to /login", () => {
    seed({ accessToken: "a" });

    renderGuardedRoute("/protected", [ROLES.ADMIN]);

    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expectLocation("/login");
  });
});
