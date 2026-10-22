import { afterEach, expect, it, vi } from "vitest";
import "../../src/components/chatbot/onecare-chat-widget.js";
import { DEFAULT_CHIPS } from "../../src/components/chatbot/chips.js";

afterEach(() => document.body.replaceChildren());

function mount(payload) {
  const widget = document.createElement("onecare-chat-widget");
  widget.fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => payload }));
  document.body.append(widget);
  return widget;
}

it("sends every suggested question to the existing API instead of bypassing safety", async () => {
  const widget = mount({ type: "CLINIC_FACT", language: "EN", message: "Configured clinic information" });
  for (const chip of [...DEFAULT_CHIPS.en, ...DEFAULT_CHIPS.ta]) await widget.ask(chip.query);
  expect(widget.fetchImpl).toHaveBeenCalledTimes(8);
  expect(JSON.parse(widget.fetchImpl.mock.calls[0][1].body).query).toBe(DEFAULT_CHIPS.en[0].query);
});

it("offers navigation only for an explicit booking action and only on click", async () => {
  const widget = mount({ type: "CLINIC_FACT", language: "EN", message: "Booking information", action: "BOOK_APPOINTMENT" });
  const navigate = vi.fn();
  widget.addEventListener("onecare-chat:book-appointment", navigate);
  await widget.ask("How can I book an appointment?");
  const button = widget.shadowRoot.querySelector(".booking-link");
  expect(button.textContent).toBe("Book Appointment");
  expect(navigate).not.toHaveBeenCalled();
  button.click();
  expect(navigate).toHaveBeenCalledTimes(1);
});

it("does not render navigation from unrelated healthcare answers or arbitrary URLs", async () => {
  const widget = mount({ type: "ANSWER", language: "EN", message: "Educational answer", action: "BOOK_APPOINTMENT", url: "javascript:alert(1)" });
  await widget.ask("Healthy eating tips?");
  expect(widget.shadowRoot.querySelector(".booking-link")).toBeNull();
  expect(widget.shadowRoot.querySelector(".log").textContent).toContain("Educational answer");
});
