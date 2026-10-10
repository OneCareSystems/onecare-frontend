
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import ErrorMessage from "../../src/components/ErrorMessage.jsx";

describe("ErrorMessage", () => {
  it("renders the error message", () => {
    render(<ErrorMessage message="Unable to load patients" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to load patients"
    );
  });

  it("renders a title and message", () => {
    render(
      <ErrorMessage
        title="Request failed"
        message="Please try again"
      />
    );

    expect(
      screen.getByRole("heading", { name: "Request failed" })
    ).toBeInTheDocument();

    expect(screen.getByText("Please try again")).toBeInTheDocument();
  });

  it("supports children as message content", () => {
    render(<ErrorMessage>Something went wrong</ErrorMessage>);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong"
    );
  });

  it("supports a custom role", () => {
    render(
      <ErrorMessage
        role="status"
        message="Operation completed with a warning"
      />
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders nothing when no content is provided", () => {
    const { container } = render(<ErrorMessage />);

    expect(container.firstChild).toBeNull();
  });
});
