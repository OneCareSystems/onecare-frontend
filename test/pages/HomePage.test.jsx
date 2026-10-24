import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import HomePage from "../../src/pages/public/HomePage";
import { clearPublicDoctorsCache } from "../../src/services/publicBookingService";
import i18n from "../../src/i18n";
import en from "../../src/locales/en.json";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  cleanup();
  clearPublicDoctorsCache();
});

it("shows the current landing page information and assistant guidance", () => {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("heading", { name: en.publicLanding.welcome }),
  ).toBeVisible();
  expect(screen.getByRole("heading", { name: "How a visit works" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Book online" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "See the doctor" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Collect your medicines" })).toBeVisible();
  expect(
    screen.getByText(/It shares general clinic information only/),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Chat with OneCare" })).toBeVisible();
});

it("navigates to public booking from the home appointment button", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/appointments" element={<h1>Book an appointment page</h1>} />
      </Routes>
    </MemoryRouter>,
  );

  await user.click(screen.getByRole("button", { name: "Book an appointment" }));
  expect(
    screen.getByRole("heading", { name: "Book an appointment page" }),
  ).toBeVisible();
});

it("opens, closes, and reopens the chat widget from the home assistant button", async () => {
  const user = userEvent.setup();
  const { container } = render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
  const trigger = screen.getByRole("button", { name: "Chat with OneCare" });
  const widget = container.querySelector("onecare-chat-widget");
  const panel = widget.shadowRoot.querySelector('[role="dialog"]');
  const widgetLauncher = widget.shadowRoot.querySelector(".launcher");

  expect(widget).toHaveAttribute("api-url", "/api/chatbot/query");
  expect(panel.hidden).toBe(true);
  await user.click(trigger);
  expect(panel.hidden).toBe(false);
  expect(widgetLauncher).toHaveAttribute("aria-expanded", "true");
  expect(widget.shadowRoot.activeElement).toBe(
    widget.shadowRoot.querySelector("textarea"),
  );

  await user.click(widget.shadowRoot.querySelector(".close"));
  expect(panel.hidden).toBe(true);
  expect(widgetLauncher).toHaveAttribute("aria-expanded", "false");
  await user.click(trigger);
  expect(panel.hidden).toBe(false);
});

it("navigates to booking from the assistant response action", async () => {
  const user = userEvent.setup();
  const { container } = render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/appointments" element={<h1>Booking page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  const widget = container.querySelector("onecare-chat-widget");
  widget.fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      type: "CLINIC_FACT",
      language: "EN",
      message: "Booking information",
      action: "BOOK_APPOINTMENT",
    }),
  });

  await widget.ask("How can I book an appointment?");
  expect(screen.queryByRole("heading", { name: "Booking page" })).not.toBeInTheDocument();
  await user.click(widget.shadowRoot.querySelector(".booking-link"));
  expect(screen.getByRole("heading", { name: "Booking page" })).toBeVisible();
});
