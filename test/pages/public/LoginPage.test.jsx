import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import LoginPage from "../../../src/pages/public/LoginPage";
import { mswState, resetMswState } from "../../msw/handlers";

const renderAt = (location) =>
  render(
    <MemoryRouter initialEntries={[location]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>,
  );

const fillAndSubmit = () => {
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: "doctor@onecare.test" },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: "secret" },
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
};

afterEach(() => {
  resetMswState();
});

describe("LoginPage", () => {
  it("shows the session expired message after a forced logout", () => {
    renderAt("/login?reason=session-expired");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your session has expired. Please sign in again.",
    );
  });

  it("shows no message on a normal visit", () => {
    renderAt("/login");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
  });

  it("blocks an empty submit and flags both required fields", () => {
    renderAt("/login");

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getAllByText("This field is required.")).toHaveLength(2);
  });

  it("shows the API error when credentials are rejected", async () => {
    mswState.loginValid = false;

    renderAt("/login");
    fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
  });
});
