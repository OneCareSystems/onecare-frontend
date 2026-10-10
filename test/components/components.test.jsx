import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Logo from "../../src/components/Logo";
import SiteHeader from "../../src/components/SiteHeader";
import StatusBadge from "../../src/components/StatusBadge";

describe("Logo", () => {
  it("renders the logo asset inside the designated rounded region", () => {
    render(<Logo />);

    const image = screen.getByRole("img", { name: "OneCare logo" });
    expect(image).toHaveAttribute("src", "/logo.svg");

    const roundedRegion = image.closest("span");
    expect(roundedRegion?.className).toContain("rounded-2xl");
    expect(roundedRegion?.className).toContain("border");
  });

  it("shows the wordmark by default and can hide it", () => {
    const { rerender } = render(<Logo />);
    expect(screen.getByText("OneCare")).toBeInTheDocument();

    rerender(<Logo showWordmark={false} />);
    expect(screen.queryByText("OneCare")).not.toBeInTheDocument();
  });

  it("supports size variants", () => {
    render(<Logo size="lg" />);

    const image = screen.getByRole("img", { name: "OneCare logo" });
    expect(image.closest("span")?.className).toContain("h-16");
  });
});

describe("StatusBadge", () => {
  it("conveys status with an icon and a label, not colour alone", () => {
    render(<StatusBadge status="danger">Payment failed</StatusBadge>);

    const badge = screen
      .getByText("Payment failed")
      .closest("span")?.parentElement;
    expect(badge).toHaveAttribute("data-status", "danger");
    expect(badge?.className).toContain("bg-danger-100");
     const icon = badge?.querySelector('svg[aria-hidden="true"]');

  expect(icon).toBeInTheDocument();
  expect(icon).toHaveAttribute("focusable", "false");
  });

  it("falls back to the neutral style for unknown statuses", () => {
    render(<StatusBadge status="unknown">Draft</StatusBadge>);

    const badge = screen.getByText("Draft").closest("span")?.parentElement;
    expect(badge).toHaveAttribute("data-status", "neutral");
    expect(badge?.className).toContain("bg-neutral-100");
  });
});

describe("SiteHeader", () => {
  it("places the logo in the header and links to the style guide", () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("img", { name: "OneCare logo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Main" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Style guide" })).toHaveAttribute(
      "href",
      "/styleguide",
    );
  });
});
