import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import en from "../../src/locales/en.json";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function contact({ phone = "", email = "", address = "" } = {}) {
  vi.stubEnv("VITE_CLINIC_PHONE", phone);
  vi.stubEnv("VITE_CLINIC_EMAIL", email);
  vi.stubEnv("VITE_CLINIC_ADDRESS", address);
  vi.resetModules();
  const { default: ClinicContact } = await import("../../src/components/ClinicContact");
  render(<ClinicContact />);
}

describe("public clinic contact configuration", () => {
  it("shows example details and a notice when configuration is missing", async () => {
    await contact();
    expect(screen.getByRole("link", { name: "+94 11 000 0000" })).toHaveAttribute("href", "tel:+94110000000");
    expect(screen.getByRole("link", { name: "clinic@example.com" })).toHaveAttribute("href", "mailto:clinic@example.com");
    expect(screen.getByText(en.publicCommon.addressValue)).toBeVisible();
    expect(screen.getByText(en.publicCommon.contactExample)).toBeVisible();
  });

  it("uses configured details and removes the example notice", async () => {
    await contact({ phone: "+94 11 234 5678", email: "hello@onecare.test", address: "Colombo Clinic" });
    expect(screen.getByRole("link", { name: "+94 11 234 5678" })).toHaveAttribute("href", "tel:+94112345678");
    expect(screen.getByRole("link", { name: "hello@onecare.test" })).toHaveAttribute("href", "mailto:hello@onecare.test");
    expect(screen.getByText("Colombo Clinic")).toBeVisible();
    expect(screen.queryByText(en.publicCommon.contactExample)).not.toBeInTheDocument();
  });

  it.each(["phone", "email", "address"])("keeps the notice when only %s is missing", async (missing) => {
    const values = { phone: "+94 11 234 5678", email: "hello@onecare.test", address: "Colombo Clinic" };
    values[missing] = "";
    await contact(values);
    expect(screen.getByText(en.publicCommon.contactExample)).toBeVisible();
  });
});
