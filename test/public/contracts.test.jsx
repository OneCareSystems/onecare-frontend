import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { checkPublicTranslations } from "../../scripts/check-public-i18n.mjs";
import en from "../../src/locales/en.json";
import ta from "../../src/locales/ta.json";
import i18n from "../../src/i18n";
import PublicErrorBoundary from "../../src/components/PublicErrorBoundary";
import {
  clearPublicDoctorsCache,
  getPublicDoctors,
  getAvailableSlots,
  submitPublicBooking,
} from "../../src/services/publicBookingService";
import {
  isSriLankanPhone,
  normalizeSriLankanPhone,
} from "../../src/utils/sriLankanPhone";
import {
  isValidDate,
  formatPatientDate,
  formatPatientTime,
} from "../../src/utils/publicDateTime";

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await i18n.changeLanguage("en");
});
beforeEach(() => clearPublicDoctorsCache());
describe("public translation parity", () => {
  it("covers every public namespace including chatbot arrays and error pages", () =>
    expect(checkPublicTranslations(en, ta)).toEqual({
      missing: [],
      extra: [],
    }));
  it.each([
    "publicLanding.title",
    "booking.invalidPhone",
    "confirmation.sms",
    "chatbot.chips.0.label",
    "publicError.title",
    "publicCommon.footer",
  ])("lists a missing Tamil key: %s", (key) => {
    const copy = structuredClone(ta);
    const path = key.split(".");
    let object = copy;
    for (const part of path.slice(0, -1)) object = object[part];
    delete object[path.at(-1)];
    expect(checkPublicTranslations(en, copy).missing).toContain(key);
  });
  it("reports extra Tamil keys", () =>
    expect(
      checkPublicTranslations(en, {
        ...ta,
        publicError: { ...ta.publicError, extra: "x" },
      }).extra,
    ).toContain("publicError.extra"));
});
describe("public service contract", () => {
  it.each([
    [
      {
        data: {
          content: [
            { doctorId: 3, displayName: "Dr Name", hours: "10?12" },
          ],
        },
      },
      [
        {
          id: "3",
          name: "Dr Name",
          hours: "10?12",
          specialty: "",
          photoUrl: "",
        },
      ],
    ],
    [
      [{ id: 4, firstName: "Dr", lastName: "Other" }, { name: "Missing ID" }],
      [
        {
          id: "4",
          name: "Dr Other",
          hours: "",
          specialty: "",
          photoUrl: "",
        },
      ],
    ],
  ])("normalizes doctor response shapes", async (payload, expected) => {
    server.use(
      http.get("*/api/public/doctors", () => HttpResponse.json(payload)),
    );
    expect(await getPublicDoctors()).toEqual(expected);
  });
  it("rejects malformed doctors", async () => {
    server.use(
      http.get("*/api/public/doctors", () =>
        HttpResponse.json({ unexpected: true }),
      ),
    );
    await expect(getPublicDoctors()).rejects.toThrow(
      "Unexpected doctors response",
    );
  });
  it("normalizes slots and filters invalid times", async () => {
    server.use(
      http.get("*/api/public/doctors/:id/available-slots", () =>
        HttpResponse.json({
          data: [
            "09:00",
            { time: "10:00" },
            { startTime: "11:00" },
            { slotTime: "12:00" },
            "20:00",
            "20:30",
            "invalid",
            "25:00",
            {},
          ],
        }),
      ),
    );
    expect(await getAvailableSlots("7", "2099-01-01")).toEqual([
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "20:00",
    ]);
  });
  it("submits the public appointment request to the backend contract", async () => {
    const requestBody = {
      fullName: "Test Patient",
      contactNo: "+94771234567",
      dateOfBirth: "1990-05-12",
      gender: "OTHER",
      doctorId: 7,
      appointmentDateTime: "2099-01-01T20:00:00",
    };
    let receivedBody;
    server.use(
      http.post("*/api/public/appointments", async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: { appointmentId: 42 },
        });
      }),
    );

    await expect(submitPublicBooking(requestBody)).resolves.toEqual({
      appointmentId: 42,
    });
    expect(receivedBody).toEqual(requestBody);
  });
  it("rejects malformed slots and booking responses", async () => {
    server.use(
      http.get("*/api/public/doctors/:id/available-slots", () =>
        HttpResponse.json({}),
      ),
      http.post("*/api/public/appointments", () =>
        HttpResponse.json("unexpected"),
      ),
    );
    await expect(getAvailableSlots("7", "2099-01-01")).rejects.toThrow();
    await expect(submitPublicBooking({})).rejects.toThrow();
  });
});
describe("clinic dates and shared phone validator", () => {
  it.each(["0771234567", "+94771234567", "0112345678", "+94 (77) 123-4567"])(
    "accepts Sri Lankan phone %s",
    (value) => expect(isSriLankanPhone(value)).toBe(true),
  );
  it.each([
    "1234",
    "+447712345678",
    "0000000000",
    "07712345678",
    "abc",
    undefined,
  ])("rejects invalid phone %s", (value) =>
    expect(isSriLankanPhone(value)).toBe(false),
  );
  it("normalizes separators", () =>
    expect(normalizeSriLankanPhone("+94 (77) 123-4567")).toBe("+94771234567"));
  it.each(["2025-02-29", "2026-13-01", "bad", "2026-1-01"])(
    "rejects invalid calendar date %s",
    (value) => expect(isValidDate(value)).toBe(false),
  );
  it("formats clinic wall-clock dates and times", () => {
    expect(isValidDate("2024-02-29")).toBe(true);
    expect(formatPatientDate("2024-02-29", "ta")).toContain("2024");
    expect(formatPatientTime("09:00:00", "en")).toBe(
      formatPatientTime("09:00", "en"),
    );
    expect(formatPatientDate("2024-02-29")).toContain("2024");
  });
});
it("translates the public error boundary and retries without exposing the error", async () => {
  await i18n.changeLanguage("ta");
  vi.spyOn(console, "error").mockImplementation(() => {});
  let failed = true;
  function Content() {
    if (failed) throw new Error("secret backend text");
    return <p>Recovered</p>;
  }
  render(
    <MemoryRouter>
      <PublicErrorBoundary>
        <Content />
      </PublicErrorBoundary>
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("heading", { name: ta.publicError.title }),
  ).toBeVisible();
  expect(screen.queryByText("secret backend text")).toBeNull();
  failed = false;
  await userEvent.click(
    screen.getByRole("button", { name: ta.publicError.retry }),
  );
  expect(screen.getByText("Recovered")).toBeVisible();
});
