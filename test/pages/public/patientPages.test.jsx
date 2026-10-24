import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
import { clearPublicDoctorsCache } from "../../../src/services/publicBookingService";
import { formatPatientDate, formatPatientTime } from "../../../src/utils/publicDateTime";

const doctor = { doctorId: 7, displayName: "Dr Example", workingHours: "4:00 PM - 8:00 PM" };
const date = "2099-06-15";
const booking = { doctor: doctor.displayName, date, time: "09:00" };
let posts;

const mount = (entry = "/appointments", layout = false) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        {layout ? (
          <Route element={<PublicLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/appointments" element={<BookingPage />} />
            <Route path="/appointments/confirmed" element={<BookingConfirmedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        ) : (
          <>
            <Route path="/home" element={<HomePage />} />
            <Route path="/appointments" element={<BookingPage />} />
            <Route path="/appointments/confirmed" element={<BookingConfirmedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </>
        )}
      </Routes>
    </MemoryRouter>,
  );

const field = (name) => document.querySelector(`[name="${name}"]`);
const setField = (name, value) =>
  fireEvent.change(field(name), { target: { value } });

async function chooseAppointmentTime(time = "09:00") {
  await waitFor(() => expect(field("doctorId")).toHaveValue("7"));
  setField("appointmentDate", date);
  const slot = await screen.findByRole("radio", {
    name: formatPatientTime(time, "en"),
  });
  await userEvent.click(slot);
  await userEvent.click(
    screen.getByRole("button", { name: "Continue to patient details" }),
  );
}

async function fillPatientDetails() {
  setField("firstName", "Kumar");
  setField("lastName", "Patient");
  setField("phone", "0771234567");
  setField("dateOfBirth", "1995-02-20");
  fireEvent.change(field("gender"), { target: { value: "OTHER" } });
}

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: en.booking.submit }));

beforeEach(async () => {
  posts = [];
  clearPublicDoctorsCache();
  localStorage.clear();
  sessionStorage.clear();
  await i18n.changeLanguage("en");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  server.use(
    http.get("*/api/public/doctors", () =>
      HttpResponse.json({ success: true, data: [doctor] }),
    ),
    http.get("*/api/public/doctors/:id/available-slots", () =>
      HttpResponse.json({ success: true, data: ["09:00", "10:00"] }),
    ),
    http.post("*/api/public/appointments", async ({ request }) => {
      posts.push(await request.json());
      return HttpResponse.json({
        success: true,
        message: "Appointment booked successfully",
        data: { appointmentId: 12 },
      });
    }),
  );
});

afterEach(async () => {
  cleanup();
  clearPublicDoctorsCache();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await i18n.changeLanguage("en");
});

describe("public landing page", () => {
  it("keeps the clinic information available when doctor loading fails and retries doctors", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/public/doctors", () =>
        ++calls === 1
          ? new HttpResponse(null, { status: 503 })
          : HttpResponse.json({ success: true, data: [doctor] }),
      ),
    );

    mount("/home");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      en.publicLanding.doctorError,
    );
    expect(screen.getByText(/4:00 PM - 8:00 PM/)).toBeVisible();
    expect(screen.getByRole("heading", { name: en.publicLanding.stepsTitle })).toBeVisible();
    expect(screen.getByRole("button", { name: "Book an appointment" })).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: en.publicLanding.retry }),
    );
    expect(await screen.findByText(doctor.workingHours)).toBeVisible();
    expect(calls).toBe(2);
  });

  it("shows the current empty doctor state", async () => {
    server.use(
      http.get("*/api/public/doctors", () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
    );
    mount("/home");
    expect(await screen.findByText(en.publicLanding.noDoctors)).toBeVisible();
  });

  it("renders the landing page and shared footer in Tamil", async () => {
    await i18n.changeLanguage("ta");
    mount("/home", true);
    expect(
      screen.getByRole("heading", { name: ta.publicLanding.welcome }),
    ).toBeVisible();
    expect(screen.getByText(ta.publicCommon.footer)).toBeVisible();
    expect(
      screen.getByText(ta.publicCommon.footerContent.tagline),
    ).toBeVisible();
    await screen.findByText(doctor.displayName);

    const widget = document.querySelector("onecare-chat-widget");
    expect(widget).toHaveAttribute("lang", "ta");
    expect(
      [...widget.shadowRoot.querySelectorAll('.chip[lang="ta"]')].map((chip) =>
        chip.textContent,
      ),
    ).toEqual(ta.chatbot.chips.map((chip) => chip.label));
    expect(
      [...widget.shadowRoot.querySelectorAll('.chip[lang="en"]')].map((chip) =>
        chip.textContent,
      ),
    ).toEqual(en.chatbot.chips.map((chip) => chip.label));
  });
});

describe("public appointment booking", () => {
  it("posts the backend public booking DTO without authentication and shows confirmation", async () => {
    let authorization;
    server.use(
      http.post("*/api/public/appointments", async ({ request }) => {
        authorization = request.headers.get("authorization");
        posts.push(await request.json());
        return HttpResponse.json({
          success: true,
          data: {
            appointmentId: 12,
            appointmentDateTime: `${date}T09:00:00`,
          },
        });
      }),
    );

    mount();
    await chooseAppointmentTime();
    await fillPatientDetails();
    submit();

    expect(
      await screen.findByRole("heading", { name: en.confirmation.title }),
    ).toBeVisible();
    expect(screen.getByText(doctor.displayName)).toBeVisible();
    expect(screen.getByText(formatPatientDate(date, "en"))).toBeVisible();
    expect(screen.getByText(formatPatientTime("09:00", "en"))).toBeVisible();
    expect(posts).toEqual([
      {
        fullName: "Kumar Patient",
        contactNo: "0771234567",
        dateOfBirth: "1995-02-20",
        gender: "OTHER",
        doctorId: 7,
        appointmentDateTime: `${date}T09:00:00`,
      },
    ]);
    expect(authorization).toBeNull();
    expect(localStorage.getItem("booking")).toBeNull();
    expect(sessionStorage.length).toBe(0);

    await userEvent.click(
      screen.getByRole("link", { name: en.confirmation.another }),
    );
    expect(field("firstName")).toBeNull();
    expect(field("appointmentDate")).toHaveValue("");
  });

  it("requires an appointment selection before continuing to patient details", async () => {
    mount();
    await waitFor(() => expect(field("doctorId")).toHaveValue("7"));
    await userEvent.click(
      screen.getByRole("button", { name: "Continue to patient details" }),
    );
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(posts).toHaveLength(0);
  });

  it("shows inline patient validation and does not post invalid details", async () => {
    mount();
    await chooseAppointmentTime();
    await fillPatientDetails();
    setField("phone", "1234");
    submit();
    expect(screen.getByText(en.booking.invalidPhone)).toBeVisible();
    expect(field("phone")).toHaveAttribute("aria-invalid", "true");
    expect(posts).toHaveLength(0);
  });

  it("filters slots after 8 PM and handles a slot conflict by refreshing availability", async () => {
    let slotCalls = 0;
    server.use(
      http.get("*/api/public/doctors/:id/available-slots", () =>
        HttpResponse.json({
          success: true,
          data: ++slotCalls === 1 ? ["09:00", "20:30"] : ["11:00"],
        }),
      ),
      http.post("*/api/public/appointments", () =>
        new HttpResponse(null, { status: 409 }),
      ),
    );

    mount();
    await waitFor(() => expect(field("doctorId")).toHaveValue("7"));
    setField("appointmentDate", date);
    expect(
      await screen.findByRole("radio", { name: formatPatientTime("09:00", "en") }),
    ).toBeVisible();
    expect(
      screen.queryByRole("radio", { name: formatPatientTime("20:30", "en") }),
    ).toBeNull();
    await userEvent.click(
      screen.getByRole("radio", { name: formatPatientTime("09:00", "en") }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Continue to patient details" }),
    );
    await fillPatientDetails();
    submit();

    expect(await screen.findByText(en.booking.conflict)).toBeVisible();
    expect(
      await screen.findByRole("radio", { name: formatPatientTime("11:00", "en") }),
    ).toBeVisible();
    expect(field("firstName")).toBeNull();
    expect(posts).toHaveLength(0);
  });

  it("preserves patient details and shows safe translated errors for server failures", async () => {
    server.use(
      http.post("*/api/public/appointments", () =>
        HttpResponse.json({ message: "PRIVATE SERVER DETAIL" }, { status: 500 }),
      ),
    );
    mount();
    await chooseAppointmentTime();
    await fillPatientDetails();
    submit();

    expect(await screen.findByText(en.booking.submitError)).toBeVisible();
    expect(field("firstName")).toHaveValue("Kumar");
    expect(screen.queryByText("PRIVATE SERVER DETAIL")).toBeNull();
    expect(screen.getByRole("heading", { name: en.booking.title })).toBeVisible();
  });

  it("disables form controls while the booking request is pending", async () => {
    server.use(
      http.post("*/api/public/appointments", async () => {
        await delay(100);
        return HttpResponse.json({ success: true, data: { appointmentId: 13 } });
      }),
    );
    mount();
    await chooseAppointmentTime();
    await fillPatientDetails();
    submit();
    expect(
      screen.getByRole("button", { name: en.booking.submitting }),
    ).toBeDisabled();
    expect(field("firstName")).toBeDisabled();
    await screen.findByRole("heading", { name: en.confirmation.title });
  });

  it("shows the clinic contact details in the Tamil confirmation page", async () => {
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
    const contact = within(
      screen.getByRole("region", { name: ta.publicCommon.contactTitle }),
    );
    expect(
      contact.getByRole("link", { name: "onecaresystems@gmail.com" }),
    ).toHaveAttribute("href", "mailto:onecaresystems@gmail.com");
    expect(contact.getByRole("link", { name: "0218700530" })).toHaveAttribute(
      "href",
      "tel:0218700530",
    );
    expect(screen.queryByText(en.confirmation.contact)).toBeNull();
  });

  it("redirects invalid confirmation state back to the booking page", async () => {
    mount({
      pathname: "/appointments/confirmed",
      state: { documentId: "invalid", booking },
    });
    expect(await screen.findByText(en.booking.checkMessage)).toBeVisible();
    expect(screen.getByRole("heading", { name: en.booking.title })).toBeVisible();
  });
});

it("renders the public 404 page in Tamil", async () => {
  await i18n.changeLanguage("ta");
  mount("/does-not-exist", true);
  expect(
    screen.getByRole("heading", { name: ta.publicError.notFoundTitle }),
  ).toBeVisible();
  expect(screen.queryByText(en.publicError.notFoundTitle)).toBeNull();
});
