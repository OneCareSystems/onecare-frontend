import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";

import ResetPasswordPage from "../../../src/pages/public/ResetPasswordPage";
import { mswState, resetMswState } from "../../msw/handlers";

const LocationDisplay = () => {
  const location = useLocation();
  return (
    <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>
  );
};

const renderAt = (location = "/reset-password", state = null) =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: location.split(/[?#]/)[0],
          search: location.includes("?")
            ? `?${location.split("?")[1].split("#")[0]}`
            : "",
          hash: location.includes("#") ? `#${location.split("#").at(-1)}` : "",
          state,
        },
      ]}
    >
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/login"
          element={<div data-testid="login-page">Login Page</div>}
        />
        <Route
          path="/forgot-password"
          element={<div data-testid="forgot-page">Forgot Page</div>}
        />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

afterEach(() => {
  resetMswState();
  vi.clearAllMocks();
});

describe("ResetPasswordPage", () => {
  it("renders the reset password form with manual token field when no token in URL", () => {
    renderAt("/reset-password");
    expect(
      screen.getByRole("heading", { name: /reset your password/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/reset token/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
  });

  it("hides manual token input when token is present in URL query", () => {
    renderAt("/reset-password?token=secret-token-123");
    expect(screen.queryByLabelText(/reset token/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
  });

  it("removes only the token from the URL and still submits the captured token", async () => {
    const user = userEvent.setup();
    renderAt("/reset-password?keep=yes&token=still-secret#form");
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/reset-password?keep=yes#form",
      ),
    );
    await user.type(
      screen.getByLabelText(/^new password/i),
      "BrandNewPass888!",
    );
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "BrandNewPass888!",
    );
    await user.click(screen.getByRole("button", { name: /reset password/i }));
    await waitFor(() =>
      expect(mswState.resetPasswordHits).toEqual([
        { token: "still-secret", newPassword: "BrandNewPass888!" },
      ]),
    );
  });

  it("validates empty fields", async () => {
    const user = userEvent.setup();
    renderAt("/reset-password");

    await user.click(screen.getByRole("button", { name: /reset password/i }));

    const requiredErrors = screen.getAllByText(/this field is required/i);
    expect(requiredErrors.length).toBeGreaterThanOrEqual(1);
  });

  it("validates password length requirements (< 8 characters)", async () => {
    const user = userEvent.setup();
    renderAt("/reset-password?token=valid-token");

    await user.type(screen.getByLabelText(/^new password/i), "short");
    await user.type(screen.getByLabelText(/confirm new password/i), "short");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(
      screen.getByText(/password must be at least 8 characters/i),
    ).toBeInTheDocument();
    expect(mswState.resetPasswordHits.length).toBe(0);
  });

  it("validates password mismatch", async () => {
    const user = userEvent.setup();
    renderAt("/reset-password?token=valid-token");

    await user.type(
      screen.getByLabelText(/^new password/i),
      "SecurePassword123!",
    );
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "Different123!",
    );
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mswState.resetPasswordHits.length).toBe(0);
  });

  it("successfully resets password with valid token and password matching", async () => {
    const user = userEvent.setup();
    renderAt("/reset-password?token=token-abc-123");

    await user.type(
      screen.getByLabelText(/^new password/i),
      "BrandNewPass888!",
    );
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "BrandNewPass888!",
    );
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() =>
      expect(screen.getByTestId("login-page")).toBeInTheDocument(),
    );

    expect(mswState.resetPasswordHits).toEqual([
      {
        token: "token-abc-123",
        newPassword: "BrandNewPass888!",
      },
    ]);
  });

  it("shows error when token is invalid or expired", async () => {
    const user = userEvent.setup();
    mswState.resetPasswordErrorMode = "invalid-token";
    renderAt("/reset-password?token=expired-token");

    await user.type(
      screen.getByLabelText(/^new password/i),
      "BrandNewPass888!",
    );
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "BrandNewPass888!",
    );
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /this reset link is invalid/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /reset password/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("links from the invalid-link screen to forgot password and login", async () => {
    const user = userEvent.setup();
    mswState.resetPasswordErrorMode = "invalid-token";
    renderAt("/reset-password?token=expired");
    await user.type(
      screen.getByLabelText(/^new password/i),
      "BrandNewPass888!",
    );
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "BrandNewPass888!",
    );
    await user.click(screen.getByRole("button", { name: /reset password/i }));
    await user.click(
      await screen.findByRole("link", { name: /request a new link/i }),
    );
    expect(screen.getByTestId("forgot-page")).toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderAt("/reset-password?token=token-123");

    const passwordInput = screen.getByLabelText(/^new password/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleBtn = screen.getByRole("button", { name: /show password/i });
    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
