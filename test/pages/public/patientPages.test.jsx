import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse, delay } from "msw";
import { server } from "../../msw/server";
import i18n from "../../../src/i18n";
import en from "../../../src/locales/en.json";
import ta from "../../../src/locales/ta.json";
import HomePage from "../../../src/pages/public/HomePage";
import BookingPage from "../../../src/pages/public/BookingPage";
import BookingConfirmedPage from "../../../src/pages/public/BookingConfirmedPage";
import NotFoundPage from "../../../src/pages/public/NotFoundPage";
import PublicLayout from "../../../src/layouts/PublicLayout";
import { bookingDocumentId } from "../../../src/utils/bookingNavigation";
import {
  formatPatientDate,
  formatPatientTime,
} from "../../../src/utils/publicDateTime";

const doctor = { id: 7, name: "Dr Example", workingHours: "09:00?17:00" };
const date = "2099-06-15";
const booking = { doctor: doctor.name, date, time: "09:00" };
let posts;
const mount = (entry = "/appointments", layout = false) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={layout ? <PublicLayout /> : undefined}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/appointments" element={<BookingPage />} />
          <Route
            path="/appointments/confirmed"
            element={<BookingConfirmedPage />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
const input = (name) => document.querySelector(`[name="${name}"]`);
async function fill() {
  await waitFor(() => expect(input("doctorId")).toHaveValue("7"));
  for (const [key, value] of Object.entries({
    firstName: "குமார்",
    lastName: "குமார்",
    phone: "0771234567",
    dateOfBirth: "1995-02-20",
    appointmentDate: date,
    reason: "Checkup",
  }))
    fireEvent.change(input(key), { target: { value } });
  await waitFor(() => expect(input("slot")).not.toBeDisabled());
  fireEvent.change(input("slot"), { target: { value: "09:00" } });
}
const submit = () =>
  fireEvent.click(
    screen.getByRole("button", { name: i18n.t("booking.submit") }),
  );
beforeEach(async () => {
  posts = [];
  await i18n.changeLanguage("en");
  server.use(
    http.get("*/api/doctors", () => HttpResponse.json({ data: [doctor] })),
    http.get("*/api/doctors/:id/available-slots", () =>
      HttpResponse.json({ data: ["09:00", "10:00"] }),
    ),
    http.post("*/api/appointments/public", async ({ request }) => {
      posts.push(await request.json());
      return HttpResponse.json({ data: { appointmentId: 12 } });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PUB-01 landing", () => {
  it("keeps static clinic content and retries only doctor information after failure", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/doctors", () =>
        ++calls === 1
          ? new HttpResponse(null, { status: 503 })
          : HttpResponse.json([doctor]),
      ),
    );
    mount("/home");
    await screen.findByText(en.publicLanding.doctorError);
    expect(
      screen.getByRole("heading", { name: en.publicLanding.servicesTitle }),
    ).toBeVisible();
    expect(screen.getByText(en.publicLanding.hoursFallback)).toBeVisible();
    expect(
      screen.getByRole("button", { name: en.publicLanding.book }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: en.publicLanding.retry }),
    );
    expect(await screen.findByText(doctor.workingHours)).toBeVisible();
    expect(calls).toBe(2);
  });
  it("handles an empty doctor list", async () => {
    server.use(http.get("*/api/doctors", () => HttpResponse.json([])));
    mount("/home");
    expect(await screen.findByText(en.publicLanding.noDoctors)).toBeVisible();
  });
  it("uses the Tamil file for landing and shared public text", async () => {
    await i18n.changeLanguage("ta");
    mount("/home", true);
    expect(
      screen.getByRole("heading", { name: ta.publicLanding.welcome }),
    ).toBeVisible();
    expect(screen.getByText(ta.publicCommon.footer)).toBeVisible();
    expect(screen.getByText(ta.publicCommon.tagline)).toBeVisible();
    expect(screen.queryByText(en.publicLanding.welcome)).toBeNull();
    await screen.findByText(doctor.name);
    const widget = document.querySelector("onecare-chat-widget");
    expect(widget.getAttribute("lang")).toBe("ta");
    expect(
      [...widget.shadowRoot.querySelectorAll(".chip")].map(
        (x) => x.textContent,
      ),
    ).toEqual(ta.chatbot.chips.map((x) => x.label));
  });
});

describe("PUB-02 booking", () => {
  it("submits Tamil names without authentication and shows matching confirmation", async () => {
    let auth;
    server.use(
      http.post("*/api/appointments/public", async ({ request }) => {
        auth = request.headers.get("authorization");
        posts.push(await request.json());
        return HttpResponse.json({ data: { id: 12 } });
      }),
    );
    mount();
    await fill();
    submit();
    expect(
      await screen.findByRole("heading", { name: en.confirmation.title }),
    ).toBeVisible();
    expect(screen.getByText(doctor.name)).toBeVisible();
    expect(screen.getByText(formatPatientDate(date, "en"))).toBeVisible();
    expect(screen.getByText(formatPatientTime("09:00", "en"))).toBeVisible();
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      firstName: "குமார்",
      date,
      time: "09:00",
    });
    expect(auth).toBeNull();
    expect(localStorage.getItem("booking")).toBeNull();
    expect(sessionStorage.length).toBe(0);
    await userEvent.click(
      screen.getByRole("link", { name: en.confirmation.another }),
    );
    expect(input("firstName")).toHaveValue("");
    expect(input("phone")).toHaveValue("");
    expect(input("appointmentDate")).toHaveValue("");
  });
  it("blocks missing fields without sending", async () => {
    mount();
    await waitFor(() => expect(input("doctorId")).toHaveValue("7"));
    submit();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(posts).toHaveLength(0);
  });
  it.each([
    ["appointmentDate", "2000-01-01", "invalidDate"],
    ["dateOfBirth", "2099-01-01", "invalidDob"],
    ["phone", "1234", "invalidPhone"],
    ["firstName", "123", "invalidName"],
  ])("blocks invalid %s with inline errors", async (key, value, error) => {
    mount();
    await fill();
    fireEvent.change(input(key), { target: { value } });
    submit();
    expect(screen.getByText(en.booking[error])).toBeVisible();
    expect(posts).toHaveLength(0);
    expect(input(key)).toHaveAttribute("aria-invalid", "true");
  });
  it("retains the form and refreshes alternatives on conflict", async () => {
    let slotCalls = 0;
    server.use(
      http.get("*/api/doctors/:id/available-slots", () =>
        HttpResponse.json(++slotCalls === 1 ? ["09:00"] : ["11:00"]),
      ),
      http.post(
        "*/api/appointments/public",
        () => new HttpResponse(null, { status: 409 }),
      ),
    );
    mount();
    await fill();
    submit();
    await screen.findByText(en.booking.conflict);
    await waitFor(() =>
      expect(input("slot").querySelector('option[value="11:00"]')).toBeTruthy(),
    );
    expect(input("firstName")).toHaveValue("குமார்");
    expect(input("reason")).toHaveValue("Checkup");
    expect(input("slot")).toHaveValue("");
  });
  it("suggests another date when there are no slots", async () => {
    server.use(
      http.get("*/api/doctors/:id/available-slots", () =>
        HttpResponse.json([]),
      ),
    );
    mount();
    await waitFor(() => expect(input("doctorId")).toHaveValue("7"));
    fireEvent.change(input("appointmentDate"), { target: { value: date } });
    expect(await screen.findByText(en.booking.noSlots)).toBeVisible();
    expect(input("slot")).toBeDisabled();
  });
  it.each([429, 500, 401])(
    "maps HTTP %s to translated text and preserves form data",
    async (status) => {
      server.use(
        http.post("*/api/appointments/public", () =>
          HttpResponse.json({ message: "SECRET BACKEND ERROR" }, { status }),
        ),
      );
      mount();
      await fill();
      submit();
      await screen.findByText(
        status === 429 ? en.booking.rateLimit : en.booking.submitError,
      );
      expect(input("firstName")).toHaveValue("குமார்");
      expect(input("slot")).toHaveValue("09:00");
      expect(screen.queryByText("SECRET BACKEND ERROR")).toBeNull();
      expect(
        screen.getByRole("heading", { name: en.booking.title }),
      ).toBeVisible();
    },
  );
  it("disables submission and fields while pending", async () => {
    server.use(
      http.post("*/api/appointments/public", async () => {
        await delay(100);
        return HttpResponse.json({ id: 1 });
      }),
    );
    mount();
    await fill();
    submit();
    expect(
      screen.getByRole("button", { name: en.booking.submitting }),
    ).toBeDisabled();
    expect(input("firstName")).toBeDisabled();
    await screen.findByRole("heading", { name: en.confirmation.title });
  });
  it("offers a retry when slot loading fails, without showing an empty state", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/doctors/:id/available-slots", () =>
        ++calls === 1
          ? new HttpResponse(null, { status: 503 })
          : HttpResponse.json(["09:00"]),
      ),
    );
    mount();
    await waitFor(() => expect(input("doctorId")).toHaveValue("7"));
    fireEvent.change(input("appointmentDate"), { target: { value: date } });
    await screen.findByText(en.booking.slotError);
    expect(screen.queryByText(en.booking.noSlots)).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: en.booking.retry }),
    );
    await waitFor(() => expect(input("slot")).not.toBeDisabled());
  });
  it("supports multiple doctors and resets the selected slot when the doctor changes", async () => {
    server.use(
      http.get("*/api/doctors", () =>
        HttpResponse.json([doctor, { id: 8, name: "Dr Other" }]),
      ),
    );
    mount();
    await screen.findByRole("option", { name: "Dr Other" });
    expect(input("doctorId")).toHaveValue("");
    fireEvent.change(input("doctorId"), { target: { value: "7" } });
    await fill();
    fireEvent.change(input("doctorId"), { target: { value: "8" } });
    expect(input("slot")).toHaveValue("");
    await waitFor(() => expect(input("slot")).not.toBeDisabled());
  });
  it("retries doctor loading after an error", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/doctors", () =>
        ++calls === 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json([doctor]),
      ),
    );
    mount();
    await screen.findByText(en.booking.doctorError);
    await userEvent.click(
      screen.getByRole("button", { name: en.booking.retry }),
    );
    await waitFor(() => expect(input("doctorId")).toHaveValue("7"));
  });
  it("translates validation errors when the active language changes", async () => {
    mount();
    await waitFor(() => expect(input("doctorId")).toHaveValue("7"));
    submit();
    await i18n.changeLanguage("ta");
    expect(await screen.findByText(ta.booking.invalidPhone)).toBeVisible();
    expect(screen.queryByText(en.booking.invalidPhone)).toBeNull();
  });
});

describe("PUB-03 and PUB-07 confirmation and errors", () => {
  it.each([
    undefined,
    { booking },
    { documentId: "previous-document", booking },
    { documentId: bookingDocumentId, booking: { ...booking, date: "bad" } },
  ])(
    "redirects missing, refreshed or invalid confirmation state",
    async (state) => {
      mount({ pathname: "/appointments/confirmed", state });
      expect(await screen.findByText(en.booking.checkMessage)).toBeVisible();
      expect(
        screen.getByRole("heading", { name: en.booking.title }),
      ).toBeVisible();
    },
  );
  it("renders the summary and contact information in Tamil", async () => {
    await i18n.changeLanguage("ta");
    mount(
      {
        pathname: "/appointments/confirmed",
        state: { documentId: bookingDocumentId, booking },
      },
      true,
    );
    expect(
      screen.getByRole("heading", { name: ta.confirmation.title }),
    ).toBeVisible();
    expect(screen.getByText(ta.confirmation.scheduled)).toBeVisible();
    expect(screen.getByText(formatPatientDate(date, "ta"))).toBeVisible();
    expect(screen.getByText(ta.confirmation.sms)).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "clinic@example.com" }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(en.confirmation.contact)).toBeNull();
  });
  it("renders the public 404 in Tamil", async () => {
    await i18n.changeLanguage("ta");
    mount("/does-not-exist", true);
    expect(
      screen.getByRole("heading", { name: ta.publicError.notFoundTitle }),
    ).toBeVisible();
    expect(screen.queryByText(en.publicError.notFoundTitle)).toBeNull();
  });
});
