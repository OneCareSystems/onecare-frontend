import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import StatusBadge from "../../src/components/StatusBadge.jsx";

describe("StatusBadge", () => {
  const statuses = [
    ["scheduled", "Scheduled"],
    ["completed", "Completed"],
    ["cancelled", "Cancelled"],
    ["no-show", "No-show"],
    ["arrived", "Arrived"],
    ["pending", "Pending"],
    ["paid", "Paid"],
    ["pending dispense", "Pending Dispense"],
    ["partially dispensed", "Partially Dispensed"],
    ["fully dispensed", "Fully Dispensed"],
    ["dispensed (external)", "Dispensed (External)"],
    ["low stock", "Low stock"],
    ["near expiry", "Near expiry"],
    ["expired", "Expired (unavailable)"],
  ];

  it.each(statuses)(
    "renders the correct label for status: %s",
    (status, expectedLabel) => {
      render(<StatusBadge status={status} />);

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    },
  );

  it.each(statuses)(
    "renders an icon for status: %s",
    (status) => {
      render(<StatusBadge status={status} />);

      const badge = screen.getByText(
        statuses.find(([value]) => value === status)[1],
      ).parentElement;

      expect(
        badge.querySelector('[aria-hidden="true"]'),
      ).toBeInTheDocument();
    },
  );

  it("uses the neutral fallback for an unknown status", () => {
const { container } = render(
<StatusBadge status="unknown-status" />,
);

expect(screen.getByText("unknown-status")).toBeInTheDocument();

expect(container.querySelector('[data-status="neutral"]'))
.toBeInTheDocument();
});

  it("preserves the existing variant and children API", () => {
const { container } = render(
<StatusBadge status="success">Saved successfully</StatusBadge>,
);

expect(screen.getByText("Saved successfully")).toBeInTheDocument();

expect(container.querySelector('[data-status="success"]'))
.toBeInTheDocument();
});
});