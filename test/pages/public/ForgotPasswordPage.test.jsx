import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";

import ForgotPasswordPage from "../../../src/pages/public/ForgotPasswordPage";
import { mswState, resetMswState } from "../../msw/handlers";

const renderAt = (location = "/forgot-password") =>
  render(
    <MemoryRouter initialEntries={[location]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );

afterEach(() => {
  resetMswState();
  vi.clearAllMocks();
});

describe("ForgotPasswordPage", () => {
  it("renders the forgot password form correctly", () => {
    renderAt();
    expect(
      screen.getByRole("heading", { name: /forgot password\?/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/registered email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset instructions/i })
    ).toBeInTheDocument();
  });

  it("validates empty email input", async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole("button", { name: /send reset instructions/i }));

    expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
    expect(mswState.forgotPasswordHits.length).toBe(0);
  });

  it("validates invalid email format", async () => {
    const user = userEvent.setup();
    renderAt();

    await user.type(screen.getByLabelText(/registered email/i), "notanemail");
    await user.click(screen.getByRole("button", { name: /send reset instructions/i }));

    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    expect(mswState.forgotPasswordHits.length).toBe(0);
  });

  it("successfully submits request and shows confirmation state", async () => {
    const user = userEvent.setup();
    renderAt();

    await user.type(
      screen.getByLabelText(/registered email/i),
      "doctor@onecare.com"
    );
    await user.click(screen.getByRole("button", { name: /send reset instructions/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });

    expect(mswState.forgotPasswordHits).toEqual([{ email: "doctor@onecare.com" }]);
    expect(screen.getByText(/doctor@onecare.com/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to login/i })).toBeInTheDocument();
  });

  it("displays rate limiting error message on 429 status", async () => {
    const user = userEvent.setup();
    mswState.forgotPasswordErrorMode = "rate-limit";
    renderAt();

    await user.type(screen.getByLabelText(/registered email/i), "doctor@onecare.com");
    await user.click(screen.getByRole("button", { name: /send reset instructions/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/too many attempts/i);
    });
  });

  it("displays server error message on 500 status", async () => {
    const user = userEvent.setup();
    mswState.forgotPasswordErrorMode = "server-error";
    renderAt();

    await user.type(screen.getByLabelText(/registered email/i), "doctor@onecare.com");
    await user.click(screen.getByRole("button", { name: /send reset instructions/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
