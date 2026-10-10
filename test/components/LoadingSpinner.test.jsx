
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import LoadingSpinner from "../../src/components/LoadingSpinner.jsx";

describe("LoadingSpinner", () => {
  it("renders an accessible loading status", () => {
    render(<LoadingSpinner />);

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading..."
    );
  });

  it("supports a custom label", () => {
    render(<LoadingSpinner label="Loading patients" />);

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading patients"
    );
  });

  it("supports small, medium, and large sizes", () => {
    const { rerender, container } = render(
      <LoadingSpinner size="sm" />
    );

    expect(container.querySelector(".h-4.w-4")).toBeInTheDocument();

    rerender(<LoadingSpinner size="md" />);
    expect(container.querySelector(".h-8.w-8")).toBeInTheDocument();

    rerender(<LoadingSpinner size="lg" />);
    expect(container.querySelector(".h-12.w-12")).toBeInTheDocument();
  });

  it("uses the medium size for an unknown size", () => {
    const { container } = render(<LoadingSpinner size="unknown" />);

    expect(container.querySelector(".h-8.w-8")).toBeInTheDocument();
  });
});
