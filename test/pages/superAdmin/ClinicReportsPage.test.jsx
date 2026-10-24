import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http } from "msw";

import { mswState } from "../../msw/handlers";
import { server } from "../../msw/server";
import { doctorPage } from "../../fixtures/adminWorkflows";
import { closePage, ok, openPage } from "./superAdminHarness";

const PATH = "/super-admin/clinic-reports";

// The doctor directory is fetched on mount. Answer every /users request
// with the fixture page (a queued usersResponses entry could be stolen by
// a still-in-flight fetch from the previous test).
beforeEach(() => {
  server.use(http.get("*/users", () => ok(doctorPage())));
});
afterEach(closePage);

/** Fill the range, pick the fixture doctor and generate. */
const generate = () => {
  fireEvent.change(screen.getByLabelText("Report from date"), {
    target: { value: "2026-10-01" },
  });
  fireEvent.change(screen.getByLabelText("Report to date"), {
    target: { value: "2026-10-18" },
  });
  fireEvent.change(screen.getByLabelText("Report doctor"), {
    target: { value: "301" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
};

describe("super-admin clinic reports page — REST cases", () => {
  it("generates the clinic report with the applied filters", async () => {
    openPage(PATH);
    await screen.findByRole("option", { name: "Example Doctor" });

    generate();
    await screen.findByText("42");

    expect(mswState.clinicReportHits).toHaveLength(1);
    expect(mswState.clinicReportHits[0]).toMatchObject({
      authorization: "Bearer super-admin-rest-token",
      from: "2026-10-01",
      to: "2026-10-18",
      doctorId: "301",
      format: null,
    });
    expect(
      screen.getByRole("heading", { name: "Clinic Reports" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No-show")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("validates the date range before any request", async () => {
    openPage(PATH);

    fireEvent.change(screen.getByLabelText("Report from date"), {
      target: { value: "2026-02-01" },
    });
    fireEvent.change(screen.getByLabelText("Report to date"), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate report" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/after/i);
    expect(mswState.clinicReportHits).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  });

  it("surfaces a backend failure and keeps the filters", async () => {
    mswState.clinicReportErrorMode = "server-error";
    openPage(PATH);
    await screen.findByRole("option", { name: "Example Doctor" });

    generate();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/unable to/i);
    expect(screen.getByLabelText("Report from date")).toHaveValue(
      "2026-10-01",
    );
  });

  it("exports the displayed report as a CSV file", async () => {
    const objectUrls = [];
    URL.createObjectURL = vi.fn((blob) => {
      objectUrls.push(blob);
      return "blob:clinic-report";
    });
    URL.revokeObjectURL = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    openPage(PATH);
    await screen.findByRole("option", { name: "Example Doctor" });
    generate();
    await screen.findByText("42");

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() => expect(mswState.clinicReportHits).toHaveLength(2));
    expect(mswState.clinicReportHits[1]).toMatchObject({
      from: "2026-10-01",
      to: "2026-10-18",
      doctorId: "301",
      format: "csv",
    });
    expect(objectUrls).toHaveLength(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("blocks other roles from the governance screen", async () => {
    openPage(PATH, { role: "ADMIN" });

    expect(
      await screen.findByRole("heading", { name: "Admin Dashboard" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Reports" }),
    ).not.toBeInTheDocument();
    expect(mswState.clinicReportHits).toHaveLength(0);
  });
});
