import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import { mswState } from "../../msw/handlers";
import { closePage, openPage } from "./superAdminHarness";

const PATH = "/super-admin/audits";

afterEach(() => {
  closePage();
  delete URL.createObjectURL;
  delete URL.revokeObjectURL;
});

/** Replace the seeded trail with `count` newest-first audit records. */
const seedTrail = (count) => {
  mswState.auditLogs = Array.from({ length: count }, (_, index) => {
    const logId = count - index;
    return {
      logId,
      userId: 1,
      username: logId % 2 === 0 ? "auditor" : "superadmin",
      actionType: logId % 3 === 0 ? "EXPORT" : "LOGIN",
      entityType: "AUTH",
      entityId: null,
      description: `event ${logId} outcome=SUCCESS target=AuditService`,
      ipAddress: "10.0.0.1",
      timestamp: `2026-10-20T09:${String(logId % 60).padStart(2, "0")}:00`,
    };
  });
};

const ledgerReady = () =>
  screen.findByRole("region", { name: "Audit trail event ledger" });

const lastRequest = () => {
  const hit = mswState.auditLogsHits.at(-1);
  const url = new URL(hit.url);
  return {
    page: url.searchParams.get("page"),
    size: url.searchParams.get("size"),
    hit,
  };
};

describe("super-admin audit trail — REST cases", () => {
  it("reads page 0 of the Spring Page envelope through the authenticated client", async () => {
    openPage(PATH);

    await ledgerReady();

    expect(mswState.auditLogsHits).toHaveLength(1);
    expect(new URL(mswState.auditLogsHits[0].url).pathname).toBe(
      "/api/audit-logs",
    );
    expect(lastRequest()).toMatchObject({ page: "0", size: "20" });
    expect(mswState.auditLogsHits[0].authorization).toBe(
      "Bearer super-admin-rest-token",
    );

    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("2 Logged")).toBeInTheDocument();
    expect(screen.getByText("2 of 2 events")).toBeInTheDocument();
  });

  it("requests the next page with Spring's 0-based page parameter", async () => {
    seedTrail(40);
    openPage(PATH);
    await ledgerReady();

    expect(
      screen.getByRole("navigation", { name: "Page 1 of 2" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("#20")).toBeInTheDocument();
    expect(screen.queryByText("#40")).not.toBeInTheDocument();
    await waitFor(() => expect(mswState.auditLogsHits).toHaveLength(2));
    expect(lastRequest()).toMatchObject({ page: "1", size: "20" });
    expect(mswState.auditLogsHits[1].authorization).toBe(
      "Bearer super-admin-rest-token",
    );
    expect(
      screen.getByRole("navigation", { name: "Page 2 of 2" }),
    ).toBeInTheDocument();
  });

  it("searches and filters the loaded page client-side, then clears", async () => {
    openPage(PATH);
    await ledgerReady();

    fireEvent.change(screen.getByLabelText("Search audit logs"), {
      target: { value: "TOKEN_REFRESH" },
    });

    await waitFor(() =>
      expect(
        screen.getByText(/Filters apply to page 1 only/),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.queryByText("#2")).not.toBeInTheDocument();
    expect(
      screen.getByText("1 of 2 on this page · 2 total"),
    ).toBeInTheDocument();

    fireEvent.change(document.getElementById("action-filter"), {
      target: { value: "LOGIN" },
    });
    await waitFor(() =>
      expect(
        screen.getByText(
          "No entries on this page match the current search or action filter.",
        ),
      ).toBeInTheDocument(),
    );

    // two "Clear" controls: the SearchBar reset and the filter-bar reset
    const clears = screen.getAllByRole("button", { name: "Clear" });
    expect(clears).toHaveLength(2);
    fireEvent.click(clears[0]);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() =>
      expect(screen.getByText("2 of 2 events")).toBeInTheDocument(),
    );
    expect(screen.getByText("#2")).toBeInTheDocument();
    // filtering never re-queries the trail
    expect(mswState.auditLogsHits).toHaveLength(1);
  });

  it("opens an event detail drawer from the timeline view", async () => {
    openPage(PATH);
    await ledgerReady();

    fireEvent.click(screen.getByRole("button", { name: "Timeline" }));
    expect(screen.getByRole("button", { name: "Timeline" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.queryByRole("region", { name: "Audit trail event ledger" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByText(/LOGIN outcome=SUCCESS/).closest("button"),
    );

    const drawer = await screen.findByRole("dialog", {
      name: "Audit event detail",
    });
    expect(drawer).toHaveTextContent("superadmin");
    expect(drawer).toHaveTextContent("LOGIN outcome=SUCCESS");

    fireEvent.click(
      within(drawer).getByRole("button", { name: "Close details" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Audit event detail" }),
    ).not.toBeInTheDocument();
  });

  it("surfaces a trail failure and retries the same page request", async () => {
    mswState.auditLogsErrorMode = "server-error";
    openPage(PATH);

    expect(
      await screen.findByText("Unable to load the audit trail"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The audit-log service did not answer. Check the API connection and retry.",
      ),
    ).toBeInTheDocument();
    expect(mswState.auditLogsHits).toHaveLength(1);

    mswState.auditLogsErrorMode = null;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await ledgerReady();
    expect(mswState.auditLogsHits).toHaveLength(2);
  });

  it("exports the visible rows as CSV without another API round-trip", async () => {
    const objectUrls = [];
    const revoked = [];
    URL.createObjectURL = vi.fn((blob) => {
      objectUrls.push(blob);
      return "blob:audit-logs";
    });
    URL.revokeObjectURL = vi.fn((url) => revoked.push(url));
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    openPage(PATH);
    await ledgerReady();

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(objectUrls[0].size).toBeGreaterThan(0);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revoked).toEqual(["blob:audit-logs"]);
    expect(mswState.auditLogsHits).toHaveLength(1);

    clickSpy.mockRestore();
  });
});
