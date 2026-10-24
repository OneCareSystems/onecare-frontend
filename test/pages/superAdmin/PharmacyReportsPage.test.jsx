import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

import { mswState } from "../../msw/handlers";
import { closePage, openPage } from "./superAdminHarness";

const PATH = "/super-admin/reports?section=pharmacy";

afterEach(closePage);

/** Fill the range and generate; waits for the section heading. */
const generate = async (heading) => {
  fireEvent.change(screen.getByLabelText("Report from date"), {
    target: { value: "2026-10-01" },
  });
  fireEvent.change(screen.getByLabelText("Report to date"), {
    target: { value: "2026-10-18" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  return screen.findByRole("heading", { name: heading });
};

describe("pharmacy reports page — REST cases", () => {
  it("generates the stock usage report with the applied filters", async () => {
    openPage(PATH);

    await generate("Stock usage");

    expect(mswState.pharmacyReportHits).toHaveLength(1);
    expect(mswState.pharmacyReportHits[0]).toMatchObject({
      authorization: "Bearer super-admin-rest-token",
      type: "stock-usage",
      from: "2026-10-01",
      to: "2026-10-18",
      format: null,
    });
    expect(screen.getByText("Amoxicillin 500mg")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("keeps dispensing contacts masked exactly as the API returns them", async () => {
    openPage(PATH);

    fireEvent.change(screen.getByRole("combobox", { name: "Report type" }), {
      target: { value: "dispensing-history" },
    });
    await generate("Dispensing history");

    expect(screen.getByText("077***4567")).toBeInTheDocument();
    expect(screen.getByText(/partially masked/i)).toBeInTheDocument();
    expect(screen.queryByText("0771234567")).not.toBeInTheDocument();
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
    expect(mswState.pharmacyReportHits).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  });

  it("surfaces a backend failure with the envelope message", async () => {
    mswState.pharmacyReportErrorMode = "server-error";
    openPage(PATH);

    await generate("Stock usage").catch(() => {});
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/unable to/i);
  });

  it("exports the same filtered query as a CSV file", async () => {
    const objectUrls = [];
    URL.createObjectURL = vi.fn((blob) => {
      objectUrls.push(blob);
      return "blob:pharmacy-report";
    });
    URL.revokeObjectURL = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    openPage(PATH);
    await generate("Stock usage");

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() => expect(mswState.pharmacyReportHits).toHaveLength(2));
    expect(mswState.pharmacyReportHits[1]).toMatchObject({
      type: "stock-usage",
      from: "2026-10-01",
      to: "2026-10-18",
      format: "csv",
    });
    expect(objectUrls).toHaveLength(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("blocks other roles and the pharmacy permission remains backend-owned", async () => {
    openPage(PATH, { role: "ADMIN" });

    expect(
      await screen.findByRole("heading", { name: "AdminDashboardPage" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Pharmacy Reports")).not.toBeInTheDocument();
    expect(mswState.pharmacyReportHits).toHaveLength(0);
  });
});
