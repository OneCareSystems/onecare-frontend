
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import Button from "../../src/components/Button.jsx";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Save</Button>);

    expect(
      screen.getByRole("button", { name: "Save" }),
    ).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Save</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("is disabled when disabled is true", () => {
    render(<Button disabled>Save</Button>);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled and exposes busy state while loading", () => {
    render(<Button loading>Saving</Button>);

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("supports submit type", () => {
    render(<Button type="submit">Submit</Button>);

    expect(screen.getByRole("button")).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("supports a custom class", () => {
    render(<Button className="custom-class">Save</Button>);

    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });
});
