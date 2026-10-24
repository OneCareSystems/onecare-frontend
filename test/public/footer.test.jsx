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

it("shows the clinic contact details and real footer destinations", async () => {
  vi.stubEnv("VITE_CLINIC_PHONE", "");
  vi.stubEnv("VITE_CLINIC_EMAIL", "");
  vi.stubEnv("VITE_CLINIC_ADDRESS", "");
  const footer = await mountFooter();
  expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
  expect(
    within(footer).getByText(en.publicCommon.footerContent.description),
  ).toBeVisible();
  expect(
    within(footer).getByRole("link", { name: "0218700530" }),
  ).toHaveAttribute("href", "tel:0218700530");
  expect(
    within(footer).getByRole("link", { name: "onecaresystems@gmail.com" }),
  ).toHaveAttribute("href", "mailto:onecaresystems@gmail.com");
  expect(within(footer).getByText("QW2M+39, Moolai, Jaffna")).toBeVisible();
  expect(
    within(footer).queryByText(en.publicCommon.footerContent.contactPending),
  ).not.toBeInTheDocument();
  expect(
    within(footer).getByRole("link", { name: "Book an Appointment" }),
  ).toHaveAttribute("href", "/appointments");
  expect(
    within(footer).getByRole("link", { name: "Our Doctors" }),
  ).toHaveAttribute("href", "/home#doctors-heading");
  expect(footer.querySelector("form")).toBeNull();
});

it("uses configured contact details and retains the clinic map and call links", async () => {
  vi.stubEnv("VITE_CLINIC_PHONE", "+94 11 234 5678");
  vi.stubEnv("VITE_CLINIC_EMAIL", "care@onecare.test");
  vi.stubEnv("VITE_CLINIC_ADDRESS", "Confirmed clinic address");
  const footer = await mountFooter();
  expect(
    within(footer).getByRole("link", { name: "+94 11 234 5678" }),
  ).toHaveAttribute("href", "tel:+94112345678");
  expect(
    within(footer).getByRole("link", { name: "care@onecare.test" }),
  ).toHaveAttribute("href", "mailto:care@onecare.test");
  expect(within(footer).getByText("Confirmed clinic address")).toBeVisible();
  expect(
    within(footer).getByRole("link", { name: "Address: OneCare" }),
  ).toHaveAttribute(
    "href",
    "https://maps.app.goo.gl/xx8a9bjBEqesxzDx7?g_st=aw",
  );
  expect(
    within(footer).getByRole("link", { name: "Phone: 0218700530" }),
  ).toHaveAttribute("href", "tel:0218700530");
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
