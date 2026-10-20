import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import AppRoutes from "../../src/routes/AppRoutes";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
afterEach(() => {
  cleanup();
  store.dispatch(clearSession());
});
describe("shared Admin shell", () => {
  it.each(["ADMIN", "SUPER_ADMIN"])(
    "preserves the same header and sidebar when %s navigates",
    async (role) => {
      store.dispatch(
        setSession({
          accessToken: "synthetic-token",
          role,
          user: "Example Admin",
        }),
      );
      render(
        <Provider store={store}>
          <MemoryRouter
            initialEntries={[
              role === "ADMIN" ? "/admin/dashboard" : "/super-admin/dashboard",
            ]}
          >
            <AppRoutes />
          </MemoryRouter>
        </Provider>,
      );
      const header = screen.getByRole("banner");
      const sidebar = screen.getByRole("navigation", {
        name: "Main navigation",
      });
      for (const label of [
        "Register Patient",
        "Patient Search",
        "Queue",
        "Dashboard",
      ]) {
        fireEvent.click(
          within(sidebar).getByRole("link", { name: label, exact: true }),
        );
        expect(screen.getByRole("banner")).toBe(header);
        expect(
          screen.getByRole("navigation", { name: "Main navigation" }),
        ).toBe(sidebar);
        expect(
          within(sidebar).getByRole("link", { name: label, exact: true }),
        ).toHaveAttribute("aria-current", "page");
        expect(screen.getAllByText("One Care")).toHaveLength(1);
        expect(screen.getAllByRole("button", { name: "Log out" })).toHaveLength(
          1,
        );
        expect(screen.getByText("Example Admin")).toBeInTheDocument();
        expect(within(header).getByTestId("admin-avatar")).toBeInTheDocument();
      }
      const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
      fireEvent.click(
        within(breadcrumb).getByRole("link", {
          name: role === "ADMIN" ? "Admin" : "Super Admin",
          exact: true,
        }),
      );
      expect(
        await screen.findByRole("heading", {
          name:
            role === "ADMIN" ? "AdminDashboardPage" : "SuperAdminDashboardPage",
        }),
      ).toBeInTheDocument();
      expect(screen.getByRole("banner")).toBe(header);
    },
  );
});
