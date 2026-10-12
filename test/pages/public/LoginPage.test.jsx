import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";

import LoginPage from "../../../src/pages/public/LoginPage";
import { mswState, resetMswState } from "../../msw/handlers";

const renderAt = (location = "/login") =>
  render(
    <MemoryRouter initialEntries={[location]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin/dashboard"
          element={<div data-testid="admin-dashboard">Admin Dashboard</div>}
        />
        <Route
          path="/doctor/dashboard"
          element={<div data-testid="doctor-dashboard">Doctor Dashboard</div>}
        />
        <Route
          path="/pharmacist/dashboard"
          element={
            <div data-testid="pharmacist-dashboard">Pharmacist Dashboard</div>
          }
        />
        <Route
          path="/super-admin/dashboard"
          element={
            <div data-testid="super-admin-dashboard">Super Admin Dashboard</div>
          }
        />
        <Route path="/forgot-password" element={<div>Forgot Password</div>} />
        <Route
          path="/doctor/patients"
          element={<div data-testid="patients">Patients</div>}
        />
      </Routes>
    </MemoryRouter>,
  );

const fillForm = async (username, password) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/^username/i), username);
  await user.type(screen.getByLabelText(/^password/i), password);
};

const submitForm = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /sign in securely/i }));
};

afterEach(() => {
  resetMswState();
  vi.clearAllMocks();
});

describe("LoginPage", () => {
  describe("AC1: Happy Path - valid credentials redirect to role dashboard", () => {
    const roles = [
      { role: "ADMIN", testId: "admin-dashboard" },
      { role: "DOCTOR", testId: "doctor-dashboard" },
      { role: "PHARMACIST", testId: "pharmacist-dashboard" },
      { role: "SUPER_ADMIN", testId: "super-admin-dashboard" },
    ];

    roles.forEach(({ role, testId }) => {
      it(`redirects ${role} to dashboard`, async () => {
        mswState.loginValid = true;
        mswState.loginRole = role;

        renderAt("/login");
        await fillForm("test-user", "password123");
        await submitForm();

        await waitFor(() => {
          expect(screen.getByTestId(testId)).toBeInTheDocument();
        });
      });
    });

    it("redirects to preserved location when from state exists", async () => {
      mswState.loginValid = true;
      mswState.loginRole = "DOCTOR";

      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/login",
              state: { from: "/doctor/patients" },
            },
          ]}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/doctor/dashboard"
              element={
                <div data-testid="doctor-dashboard">Doctor Dashboard</div>
              }
            />
            <Route
              path="/doctor/patients"
              element={<div data-testid="patients">Patients</div>}
            />
          </Routes>
        </MemoryRouter>,
      );

      await fillForm("test-user", "password123");
      await submitForm();

      await waitFor(() => {
        expect(screen.getByTestId("patients")).toBeInTheDocument();
      });
    });
  });

  describe("AC2: Error Handling - invalid credentials", () => {
    it("shows 'Invalid username or password.' with no hint which was wrong", async () => {
      mswState.loginValid = false;
      mswState.loginErrorMode = null;

      renderAt("/login");
      await fillForm("wrong-user", "wrong-pass");
      await submitForm();

      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        const apiError = alerts.find((a) =>
          a.textContent.includes("Invalid username or password"),
        );
        expect(apiError).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/^password/i)).toHaveValue("");
    });

    it("clears password field on invalid credentials", async () => {
      mswState.loginValid = false;
      mswState.loginErrorMode = null;

      renderAt("/login");
      await fillForm("wrong-user", "wrong-pass");
      await submitForm();

      await waitFor(() => {
        expect(screen.getByLabelText(/^password/i)).toHaveValue("");
      });
    });
  });

  describe("AC3: Edge Case - locked account", () => {
    it("shows lockout message with three routes to regain access", async () => {
      mswState.loginValid = false;
      mswState.loginErrorMode = "lockout";

      renderAt("/login");
      await fillForm("locked-user", "password123");
      await submitForm();

      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        const lockoutError = alerts.find((a) =>
          a.textContent.includes("Account locked"),
        );
        expect(lockoutError).toBeInTheDocument();
        expect(lockoutError).toHaveTextContent("Super Admin");
        expect(lockoutError).toHaveTextContent("Forgot Password");
      });

      expect(screen.getByLabelText(/^password/i)).toHaveValue("");
    });
  });

  describe("AC4: Edge Case - rate limit (429)", () => {
    it("shows 'too many attempts' message and clears password", async () => {
      mswState.loginValid = false;
      mswState.loginErrorMode = "rate-limit";

      renderAt("/login");
      await fillForm("test-user", "password123");
      await submitForm();

      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        const rateLimitError = alerts.find((a) =>
          a.textContent.includes("Too many attempts"),
        );
        expect(rateLimitError).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/^password/i)).toHaveValue("");
    });
  });

  describe("UI Interactions", () => {
    it("toggles password visibility with ARIA attributes", async () => {
      renderAt("/login");

      const passwordInput = screen.getByLabelText(/^password/i);
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleButton = screen.getByRole("button", {
        name: /show password/i,
      });
      await userEvent.click(toggleButton);

      expect(passwordInput).toHaveAttribute("type", "text");
      expect(toggleButton).toHaveAttribute("aria-label", "Hide password");
      expect(toggleButton).toHaveAttribute("aria-pressed", "true");

      await userEvent.click(toggleButton);

      expect(passwordInput).toHaveAttribute("type", "password");
      expect(toggleButton).toHaveAttribute("aria-label", "Show password");
      expect(toggleButton).toHaveAttribute("aria-pressed", "false");
    });

    it("has forgot password link to /forgot-password", async () => {
      renderAt("/login");

      const link = screen.getByRole("link", { name: /forgot password/i });
      expect(link).toHaveAttribute("href", "/forgot-password");
    });

    it("shows session expired message when reason=session-expired", () => {
      renderAt("/login?reason=session-expired");

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Your session has expired. Please sign in again.",
      );
    });

    it("shows a reset success message from navigation state and consumes it", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/login",
              state: {
                passwordResetSuccess:
                  "Your password has been reset. You can now sign in.",
              },
            },
          ]}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>,
      );
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Your password has been reset.",
      );
      await user.type(screen.getByLabelText(/^username/i), "user");
      await user.type(screen.getByLabelText(/^password/i), "password");
      await submitForm();
      await waitFor(() =>
        expect(screen.queryByRole("status")).not.toBeInTheDocument(),
      );
    });

    it("validates required fields on empty submit", () => {
      renderAt("/login");

      fireEvent.click(
        screen.getByRole("button", { name: /sign in securely/i }),
      );

      expect(screen.getAllByText("This field is required.")).toHaveLength(2);
    });

    it("renders form panel with OneCare branding", () => {
      renderAt("/login");

      expect(screen.getByText("OneCare Family Clinic")).toBeInTheDocument();
      expect(screen.getByText("Welcome back")).toBeInTheDocument();
      expect(screen.getByText("Sign in to OneCare")).toBeInTheDocument();
    });
  });
});
