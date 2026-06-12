import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import App from "./App";

describe("Sample Test", () => {
  it("should pass", () => {
    expect(1 + 1).toBe(2);
  });

  it("should render App component", () => {
    render(<App />);
  });
});
