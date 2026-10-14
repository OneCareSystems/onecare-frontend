import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ConsultationPage from "../../../src/pages/doctor/ConsultationPage";

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/doctor/consultation/:appointmentId"
          element={<ConsultationPage />}
        />
        <Route
          path="/doctor/today-schedule"
          element={<h1>Today’s schedule</h1>}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("ConsultationPage (DOC-04 shell)", () => {
  it("shows the appointment id from the route and no invented clinical data", () => {
    renderAt("/doctor/consultation/101");

    expect(
      screen.getByRole("heading", {
        name: "Consultation for appointment 101",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/jane doe|vitals|diagnos|prescription|notes/i),
    ).not.toBeInTheDocument();
  });

  it("links back to the doctor's schedule", async () => {
    const user = userEvent.setup();
    renderAt("/doctor/consultation/101");

    await user.click(
      screen.getByRole("button", { name: /back to today’s schedule/i }),
    );
    expect(
      screen.getByRole("heading", { name: "Today’s schedule" }),
    ).toBeInTheDocument();
  });
});
