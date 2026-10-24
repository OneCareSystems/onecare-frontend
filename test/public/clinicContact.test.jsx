import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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
  render(
    <MemoryRouter>
      <ClinicContact />
    </MemoryRouter>,
  );
}

describe("public clinic contact details", () => {
  it("shows the clinic's configured default contact details", async () => {
    await contact();
    expect(screen.getByRole("link", { name: "0218700530" })).toHaveAttribute(
      "href",
      "tel:0218700530",
    );
    expect(
      screen.getByRole("link", { name: "onecaresystems@gmail.com" }),
    ).toHaveAttribute("href", "mailto:onecaresystems@gmail.com");
    expect(screen.getByText("QW2M+39, Moolai, Jaffna")).toBeVisible();
  });

  it("uses contact details supplied through environment configuration", async () => {
    await contact({
      phone: "+94 11 234 5678",
      email: "hello@onecare.test",
      address: "Colombo Clinic",
    });
    expect(
      screen.getByRole("link", { name: "+94 11 234 5678" }),
    ).toHaveAttribute("href", "tel:+94112345678");
    expect(
      screen.getByRole("link", { name: "hello@onecare.test" }),
    ).toHaveAttribute("href", "mailto:hello@onecare.test");
    expect(screen.getByText("Colombo Clinic")).toBeVisible();
  });

  it.each([
    ["phone", "0218700530"],
    ["email", "onecaresystems@gmail.com"],
    ["address", "QW2M+39, Moolai, Jaffna"],
  ])("uses the default %s when configuration is blank", async (missing, fallback) => {
    const values = {
      phone: "+94 11 234 5678",
      email: "hello@onecare.test",
      address: "Colombo Clinic",
    };
    values[missing] = "";
    await contact(values);
    expect(screen.getByText(fallback)).toBeVisible();
  });
});
