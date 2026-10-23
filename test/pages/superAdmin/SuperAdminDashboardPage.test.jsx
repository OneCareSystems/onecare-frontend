import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import { mswState } from "../../msw/handlers";
import { closePage, openPage } from "./superAdminHarness";

const PATH = "/super-admin/dashboard";

afterEach(closePage);

/** A staff account; `lockedUntil` in the future derives a LOCKED status. */
const account = (userId, username, overrides = {}) => ({
  userId,
  username,
  email: `${username.toLowerCase()}@onecare.test`,
  role: "NURSE",
  isActive: true,
  ...overrides,
});

const seedUsers = () => {
  mswState.usersResponses = [
    [
      account(2, "NURSE-2201"),
      account(3, "RECEPT-3302"),
      account(7, "LOCKED-7707", {
        lockedUntil: "2099-01-01T00:00:00",
      }),
    ],
  ];
};

/** The stat tile whose label reads `label` (label and value share a card). */
const statCard = (label) =>
  within(screen.getByText(label).parentElement.parentElement);

describe("super-admin dashboard — REST cases", () => {
  it("loads every overview resource in parallel and renders the tiles", async () => {
    seedUsers();
    openPage(PATH);

    await waitFor(() =>
      expect(screen.getByText("Total Staff")).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText("75.00")).toBeInTheDocument());

    // four parallel reads, each carrying the session token
    expect(mswState.usersHits).toHaveLength(1);
    expect(mswState.systemBackupHits).toHaveLength(1);
    expect(mswState.auditLogsHits).toHaveLength(1);
    expect(mswState.consultationFeeHits).toHaveLength(1);
    for (const hit of [
      mswState.usersHits[0],
      mswState.systemBackupHits[0],
      mswState.auditLogsHits[0],
      mswState.consultationFeeHits[0],
    ]) {
      expect(hit.authorization).toBe("Bearer super-admin-rest-token");
    }
    // the audit preview asks for the first five rows only
    expect(mswState.auditLogsHits[0].url).toContain("page=0");
    expect(mswState.auditLogsHits[0].url).toContain("size=5");

    expect(statCard("Total Staff").getByText("3")).toBeInTheDocument();
    // the locked account wins the chip over the active count
    expect(statCard("Total Staff").getByText("1 Locked")).toBeInTheDocument();
    expect(statCard("Consultation Fee").getByText("75.00")).toBeInTheDocument();
    expect(statCard("System Backups").getByText("2")).toBeInTheDocument();
    expect(statCard("Audit Events").getByText("2")).toBeInTheDocument();
  });

  it("lists the recent audit rows and the governance module links", async () => {
    seedUsers();
    openPage(PATH);

    const activity = await screen.findByRole("region", {
      name: "Recent Audit Activity",
    });
    // The region is present during the initial render; wait for the async
    // audit request to populate it before making synchronous row assertions.
    await within(activity).findByText(
      "LOGIN outcome=SUCCESS target=AuthServiceImpl.login",
    );
    expect(within(activity).getAllByText("superadmin")).toHaveLength(2);
    expect(
      within(activity).getByText(
        "LOGIN outcome=SUCCESS target=AuthServiceImpl.login",
      ),
    ).toBeInTheDocument();
    expect(
      within(activity).getByText(
        "TOKEN_REFRESH outcome=SUCCESS target=AuthServiceImpl.refresh",
      ),
    ).toBeInTheDocument();

    const modules = screen.getByRole("region", { name: "Governance Modules" });
    for (const [title, href] of [
      ["User Management", "/super-admin/user-management"],
      ["Access Control", "/super-admin/access-control"],
      ["Clinic Configuration", "/super-admin/clinic-configuration"],
      ["System Maintenance", "/super-admin/system-maintenance"],
      ["Audits", "/super-admin/audits"],
      ["Knowledge Base", "/super-admin/knowledge-base"],
      ["Reports", "/super-admin/reports"],
    ]) {
      const link = within(modules).getByRole("link", {
        name: new RegExp(title),
      });
      expect(link).toHaveAttribute("href", href);
    }
  });

  it("renders a dash when the fee value is not a finite number", async () => {
    seedUsers();
    mswState.consultationFee = "not-a-price";
    openPage(PATH);

    await waitFor(() =>
      expect(statCard("Consultation Fee").getByText("—")).toBeInTheDocument(),
    );
  });

  it("keeps the surviving tiles when part of the fan-out fails", async () => {
    seedUsers();
    mswState.usersErrorMode = "server-error";
    mswState.auditLogsErrorMode = "server-error";
    openPage(PATH);

    await waitFor(() => expect(screen.getByText("75.00")).toBeInTheDocument());

    // allSettled swallows the two failures — the page still renders
    expect(
      screen.queryByText("Data Synchronization Notice"),
    ).not.toBeInTheDocument();
    expect(statCard("Total Staff").getByText("0")).toBeInTheDocument();
    expect(statCard("Audit Events").getByText("0")).toBeInTheDocument();
    expect(statCard("System Backups").getByText("2")).toBeInTheDocument();

    const activity = screen.getByRole("region", {
      name: "Recent Audit Activity",
    });
    expect(
      within(activity).getByText("No recent audit activity records found."),
    ).toBeInTheDocument();
  });

  it("re-reads every resource when Refresh Data is pressed", async () => {
    seedUsers();
    openPage(PATH);
    await waitFor(() => expect(mswState.consultationFeeHits).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: /Refresh Data/ }));

    await waitFor(() => expect(mswState.consultationFeeHits).toHaveLength(2));
    expect(mswState.usersHits).toHaveLength(2);
    expect(mswState.systemBackupHits).toHaveLength(2);
    expect(mswState.auditLogsHits).toHaveLength(2);
    expect(mswState.auditLogsHits[1].authorization).toBe(
      "Bearer super-admin-rest-token",
    );
  });
});
