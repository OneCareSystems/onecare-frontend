import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import HomePage from "../../src/pages/public/HomePage";

afterEach(cleanup);

it("opens the real widget from the home button and tracks closing and reopening", async () => {
  const user = userEvent.setup();
  const { container } = render(<MemoryRouter><HomePage /></MemoryRouter>);
  const trigger = screen.getByRole("button", { name: "Chat with OneCare" });
  const widget = container.querySelector("onecare-chat-widget");
  const panel = widget.shadowRoot.querySelector('[role="dialog"]');

  expect(widget).toHaveAttribute("api-url", "/api/chatbot/query");
  expect(panel.hidden).toBe(true);
  await user.click(trigger);
  expect(panel.hidden).toBe(false);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(widget.shadowRoot.activeElement).toBe(
    widget.shadowRoot.querySelector("textarea"),
  );

  await user.click(widget.shadowRoot.querySelector(".close"));
  expect(panel.hidden).toBe(true);
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  await user.click(trigger);
  expect(panel.hidden).toBe(false);
});

it("uses React Router for booking only after the response button is clicked", async () => {
  const user = userEvent.setup();
  const { container } = render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/appointments" element={<h1>Booking placeholder</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  const widget = container.querySelector("onecare-chat-widget");
  widget.fetchImpl = async () => ({
    ok: true, status: 200,
    json: async () => ({ type: "CLINIC_FACT", language: "EN", message: "Booking information", action: "BOOK_APPOINTMENT" }),
  });
  await widget.ask("How can I book an appointment?");
  expect(screen.queryByText("Booking placeholder")).not.toBeInTheDocument();
  await user.click(widget.shadowRoot.querySelector(".booking-link"));
  expect(screen.getByRole("heading", { name: "Booking placeholder" })).toBeInTheDocument();
});
