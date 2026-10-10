import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import Modal from "../../src/components/Modal.jsx";

describe("Modal", () => {
  it("does not render when closed", () => {
    render(
      <Modal isOpen={false} title="Confirm">
        Are you sure?
      </Modal>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders its title and content when open", () => {
    render(
      <Modal isOpen title="Confirm">
        Are you sure?
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Confirm" }))
      .toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("exposes modal dialog semantics", () => {
    render(
      <Modal isOpen title="Confirm">
        Content
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen title="Confirm" onClose={onClose}>
        Content
      </Modal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen title="Confirm" onClose={onClose}>
        Content
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();

    const { container } = render(
      <Modal isOpen title="Confirm" onClose={onClose}>
        Content
      </Modal>,
    );

    fireEvent.mouseDown(container.firstChild);

    expect(onClose).toHaveBeenCalledOnce();
  });
});
