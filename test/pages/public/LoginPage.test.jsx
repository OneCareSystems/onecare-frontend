import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LoginPage from "../../../src/pages/public/LoginPage";

const renderAt = (location) =>
  render(
    <MemoryRouter initialEntries={[location]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>,
  );

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
});
