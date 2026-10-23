import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "../../src/i18n";
import en from "../../src/locales/en.json";
import ta from "../../src/locales/ta.json";

afterEach(async () => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
  await i18n.changeLanguage("en");
});

async function mountFooter() {
  vi.resetModules();
  const { default: Footer } = await import("../../src/components/Footer");
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
  return screen.getByRole("contentinfo");
}

it("shows one footer with real destinations and an unavailable newsletter", async () => {
  for (const key of [
    "VITE_CLINIC_PHONE",
    "VITE_CLINIC_EMAIL",
    "VITE_CLINIC_ADDRESS",
    "VITE_FACEBOOK_URL",
    "VITE_INSTAGRAM_URL",
    "VITE_LINKEDIN_URL",
    "VITE_YOUTUBE_URL",
  ])
    vi.stubEnv(key, "");
  const footer = await mountFooter();
  expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
  expect(
    within(footer).getByText(en.publicCommon.footerContent.description),
  ).toBeVisible();
  expect(
    within(footer).getByText(en.publicCommon.footerContent.contactPending),
  ).toBeVisible();
  expect(within(footer).getByRole("textbox")).toBeDisabled();
  expect(
    within(footer).getByRole("button", { name: "Subscribe" }),
  ).toBeDisabled();
  expect(footer.querySelector("form")).toBeNull();
  expect(
    within(footer).queryByRole("link", { name: /OneCare on/ }),
  ).not.toBeInTheDocument();
  expect(
    within(footer).getByText(
      `© ${new Date().getFullYear()} OneCare. All rights reserved.`,
    ),
  ).toBeVisible();
  expect(
    within(footer).getByRole("link", { name: "Book an Appointment" }),
  ).toHaveAttribute("href", "/appointments");
  expect(
    within(footer).queryByRole("link", { name: "Privacy Policy" }),
  ).not.toBeInTheDocument();
});

it("uses configured contact details with only location and phone icon links", async () => {
  vi.stubEnv("VITE_CLINIC_PHONE", "+94 11 234 5678");
  vi.stubEnv("VITE_CLINIC_EMAIL", "care@onecare.test");
  vi.stubEnv("VITE_CLINIC_ADDRESS", "Confirmed clinic address");
  vi.stubEnv("VITE_FACEBOOK_URL", "https://www.facebook.com/onecare-test");
  vi.stubEnv("VITE_INSTAGRAM_URL", "javascript:alert(1)");
  const footer = await mountFooter();
  expect(
    within(footer).getByRole("link", { name: "+94 11 234 5678" }),
  ).toHaveAttribute("href", "tel:+94112345678");
  expect(
    within(footer).getByRole("link", { name: "care@onecare.test" }),
  ).toHaveAttribute("href", "mailto:care@onecare.test");
  expect(within(footer).getByText("Confirmed clinic address")).toBeVisible();
  const iconLinks = footer.querySelectorAll(".onecare-footer-socials a");
  expect(iconLinks).toHaveLength(2);
  expect(iconLinks[0]).toHaveAttribute(
    "href",
    "https://maps.app.goo.gl/xx8a9bjBEqesxzDx7?g_st=aw",
  );
  expect(iconLinks[0]).toHaveAttribute("rel", "noopener noreferrer");
  expect(iconLinks[1]).toHaveAttribute("href", "tel:0218700530");
});

it("translates the footer into Tamil", async () => {
  await i18n.changeLanguage("ta");
  const footer = await mountFooter();
  expect(
    within(footer).getByText(ta.publicCommon.footerContent.description),
  ).toBeVisible();
  expect(
    within(footer).getByRole("heading", {
      name: ta.publicCommon.footerContent.support,
    }),
  ).toBeVisible();
});
