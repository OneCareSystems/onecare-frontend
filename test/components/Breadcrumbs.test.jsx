import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Breadcrumbs from "../../src/components/Breadcrumbs";

const renderBreadcrumbs = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Breadcrumbs />
    </MemoryRouter>,
  );

describe("Breadcrumbs — CFG-04", () => {
  it("renders one translated crumb per path segment", () => {
    renderBreadcrumbs("/admin/dashboard");

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("marks the last crumb as the current page, not a link", () => {
    renderBreadcrumbs("/admin/dashboard");

    const current = screen.getByText("Dashboard");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
  });

  it("capitalizes unknown segments instead of failing", () => {
    renderBreadcrumbs("/admin/patient-report");

    expect(screen.getByText("Patient Report")).toBeInTheDocument();
  });

  it("renders nothing at the site root", () => {
    const { container } = renderBreadcrumbs("/");

    expect(container.firstChild).toBeNull();
  });
});
