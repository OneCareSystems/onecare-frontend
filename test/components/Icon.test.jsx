import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import Icon from "../../src/components/Icon.jsx";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Icon — CFG-07 shared medical icon component", () => {
  it("renders a decorative icon hidden from assistive technology by default", () => {
    const { container } = render(<Icon name="stethoscope" />);

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).not.toHaveAttribute("role", "img");
  });

  it("exposes an ARIA label as an image when a label is given (AC2)", () => {
    render(<Icon name="pill" label="Medication" />);

    expect(screen.getByRole("img", { name: "Medication" })).toBeInTheDocument();
  });

  it("renders every icon in the medical set (client feedback #4)", () => {
    const medicalNames = [
      "stethoscope",
      "pill",
      "calendar",
      "heart-pulse",
      "syringe",
      "thermometer",
      "hospital",
      "microscope",
      "test-tube",
      "clipboard",
      "users",
      "shield-plus",
    ];

    for (const name of medicalNames) {
      const { container, unmount } = render(<Icon name={name} />);
      expect(container.querySelector("svg"), `icon "${name}"`).toBeTruthy();
      unmount();
    }
  });

  it("falls back to a generic icon for unknown names instead of crashing", () => {
    const { container } = render(<Icon name="not-a-real-icon" />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("applies size and className to the svg", () => {
    const { container } = render(
      <Icon name="calendar" size="1.5rem" className="text-primary-600" />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("text-primary-600");
    expect(svg).toHaveAttribute("width", "1.5rem");
  });
});
