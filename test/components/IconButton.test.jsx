import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import axe from "axe-core";

import IconButton from "../../src/components/IconButton.jsx";
import Icon from "../../src/components/Icon.jsx";

afterEach(() => {
  vi.restoreAllMocks();
});

const runAxe = async (container) => {
  const results = await axe.run(container, {
    rules: {
      // jsdom cannot compute real colour contrast; covered by check:contrast.
      "color-contrast": { enabled: false },
    },
  });
  return results.violations;
};

describe("IconButton — CFG-07 AC2 icon-only buttons have ARIA labels", () => {
  it("exposes the label as the accessible name of the button", () => {
    render(<IconButton icon="refresh" label="Refresh queue" />);

    expect(
      screen.getByRole("button", { name: "Refresh queue" }),
    ).toBeInTheDocument();
  });

  it("renders a decorative icon that is not announced separately", () => {
    const { container } = render(<IconButton icon="print" label="Print" />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("fires onClick like a normal button", () => {
    const onClick = vi.fn();

    render(<IconButton icon="pencil" label="Edit" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("forwards the disabled state", () => {
    render(<IconButton icon="trash" label="Delete" disabled />);

    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("logs a development error when rendered without a label", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<IconButton icon="refresh" />);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("IconButton requires a `label` prop"),
    );
  });

  it("passes the axe-core button-name check (AC2 happy path)", async () => {
    const { container } = render(<IconButton icon="refresh" label="Refresh" />);

    const violations = await runAxe(container);
    expect(violations.map((violation) => violation.id)).not.toContain(
      "button-name",
    );
  });
});

describe("Icon-only buttons without a label — CFG-07 AC2 negative a11y check", () => {
  it("fails the axe-core button-name check when an icon-only button has no ARIA label", async () => {
    const { container } = render(
      <button type="button">
        <Icon name="refresh" />
      </button>,
    );

    const violations = await runAxe(container);
    const buttonNameViolation = violations.find(
      (violation) => violation.id === "button-name",
    );

    expect(buttonNameViolation).toBeDefined();
    expect(buttonNameViolation.impact).toBe("critical");
    expect(
      buttonNameViolation.nodes.some((node) => node.html.includes("<button")),
    ).toBe(true);
  });
});
