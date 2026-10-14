import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { ROLES } from "../../src/constants/roles";
import AppRoutes from "../../src/routes/AppRoutes";

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

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

const seed = (payload) => store.dispatch(setSession(payload));

beforeEach(() => {
  store.dispatch(clearSession());
});

describe("StaffLayout — CFG-04 staff chrome (integration)", () => {
  it("shows top bar, role sidebar, breadcrumbs and the routed screen together", () => {
    seed({
      accessToken: "a",
      role: ROLES.DOCTOR,
      user: "dr.house",
    });

    renderAppAt("/doctor/dashboard");

    expect(
      screen.getByRole("heading", { name: /today.s appointments/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /log out/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("dr.house")).toBeInTheDocument();

    const sidebar = screen.getByRole("navigation", {
      name: "Main navigation",
    });
    expect(
      within(sidebar).getByRole("link", { name: "Queue" }),
    ).toHaveAttribute("href", "/queue");

    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByText("Dashboard")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("renders the shared /queue screen inside the staff chrome", () => {
    seed({ accessToken: "a", role: ROLES.ADMIN });

    renderAppAt("/queue");

    expect(
      screen.getByRole("heading", { name: "QueuePage" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /log out/i }),
    ).toBeInTheDocument();
  });

  it("gives the pharmacist only its own menu entries", () => {
    seed({ accessToken: "a", role: ROLES.PHARMACIST });

    renderAppAt("/pharmacist/dashboard");

    expect(
      screen.getByRole("heading", { name: "PharmacistDashboardPage" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Queue" }),
    ).not.toBeInTheDocument();
  });
});
