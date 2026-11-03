import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, useLocation } from "react-router-dom";

import { store } from "../../src/app/store";
import {
  clearSession,
  selectIsAuthenticated,
  setSession,
} from "../../src/features/auth/authSlice";
import { ROLES } from "../../src/constants/roles";

vi.mock("../../src/services/authService", () => ({
  logout: vi.fn(),
}));

import { logout } from "../../src/services/authService";
import TopBar from "../../src/components/TopBar";

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderTopBar = () =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/doctor/dashboard"]}>
        <TopBar />
        <LocationDisplay />
      </MemoryRouter>
    </Provider>,
  );

beforeEach(() => {
  store.dispatch(clearSession());
  logout.mockReset();
});

describe("TopBar — CFG-04 staff chrome", () => {
  it.each([ROLES.ADMIN, ROLES.SUPER_ADMIN])(
    "shows the shared avatar for %s",
    (role) => {
      store.dispatch(
        setSession({ accessToken: "a", role, user: "Example Admin" }),
      );
      renderTopBar();
      expect(screen.getByTestId("admin-avatar")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      expect(
        screen.getByTestId("admin-avatar").querySelector("svg"),
      ).toBeInTheDocument();
      expect(screen.getByText("Example Admin")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Log out" })).toBeVisible();
    },
  );
  it.each([ROLES.DOCTOR, ROLES.PHARMACIST])(
    "preserves the header for %s",
    (role) => {
      store.dispatch(
        setSession({ accessToken: "a", role, user: "Example Staff" }),
      );
      renderTopBar();
      expect(screen.queryByTestId("admin-avatar")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    },
  );
  it("shows the signed-in username", () => {
    store.dispatch(
      setSession({
        accessToken: "a",
        role: ROLES.DOCTOR,
        user: "dr.house",
      }),
    );

    renderTopBar();

    expect(screen.getByText("dr.house")).toBeInTheDocument();
  });

  it("falls back to a generic label when no user is stored", () => {
    store.dispatch(setSession({ accessToken: "a", role: ROLES.DOCTOR }));

    renderTopBar();

    expect(screen.getByText("Signed in as")).toBeInTheDocument();
  });

  it("returns to /login when the brand logo is clicked", () => {
    store.dispatch(setSession({ accessToken: "a", role: ROLES.DOCTOR }));

    renderTopBar();

    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/doctor/dashboard",
    );
  });

  it("clears the session and returns to /login on logout, even if the API fails", async () => {
    store.dispatch(setSession({ accessToken: "a", role: ROLES.DOCTOR }));
    logout.mockRejectedValue(new Error("offline"));

    renderTopBar();

    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(selectIsAuthenticated(store.getState())).toBe(false);
    });
    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/login");
    });
    expect(logout).toHaveBeenCalledOnce();
  });
});
