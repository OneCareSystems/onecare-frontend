
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import Tabs from "../../src/components/Tabs.jsx";

const tabs = [
  { id: "details", label: "Details", content: <p>Patient details</p> },
  { id: "history", label: "History", content: <p>Patient history</p> },
];

describe("Tabs", () => {
  it("renders all tab labels", () => {
    render(<Tabs tabs={tabs} />);

    expect(screen.getByRole("tab", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "History" })).toBeInTheDocument();
  });

  it("shows the first tab content by default", () => {
    render(<Tabs tabs={tabs} />);

    expect(screen.getByText("Patient details")).toBeInTheDocument();
    expect(screen.queryByText("Patient history")).not.toBeInTheDocument();
  });

  it("switches content when another tab is clicked", () => {
    render(<Tabs tabs={tabs} />);

    fireEvent.click(screen.getByRole("tab", { name: "History" }));

    expect(screen.getByText("Patient history")).toBeInTheDocument();
    expect(screen.queryByText("Patient details")).not.toBeInTheDocument();
  });

  it("calls onChange when a tab is selected", () => {
    const onChange = vi.fn();

    render(<Tabs tabs={tabs} onChange={onChange} />);

    fireEvent.click(screen.getByRole("tab", { name: "History" }));

    expect(onChange).toHaveBeenCalledWith("history");
  });

  it("supports a default active tab", () => {
    render(<Tabs tabs={tabs} defaultActiveTab="history" />);

    expect(screen.getByText("Patient history")).toBeInTheDocument();
  });

  it("renders nothing when there are no tabs", () => {
    const { container } = render(<Tabs tabs={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
