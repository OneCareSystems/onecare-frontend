import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import { mswState } from "../../msw/handlers";
import { PERMISSION_MATRIX } from "../../../src/constants/permissions";
import { ROLES } from "../../../src/constants/roles";
import { closePage, openPage } from "./superAdminHarness";

const PATH = "/super-admin/access-control";

afterEach(closePage);

/** The factory grants every non-privileged role starts from. */
const defaultsFor = (role) =>
  PERMISSION_MATRIX.filter((entry) => entry.granted.includes(role)).map(
    (entry) => entry.code,
  );

const matrixReady = () =>
  screen.findByRole("region", { name: "Role entitlement matrix" });

describe("super-admin access control — REST cases", () => {
  it("loads every role's permission set in parallel with bearer auth", async () => {
    openPage(PATH);

    const table = await matrixReady();

    expect(mswState.rolePermissionReadHits).toHaveLength(4);
    expect(
      mswState.rolePermissionReadHits.map((hit) => hit.role).sort(),
    ).toEqual(["ADMIN", "DOCTOR", "PHARMACIST", "SUPER_ADMIN"]);
    for (const hit of mswState.rolePermissionReadHits) {
      expect(hit.authorization).toBe("Bearer super-admin-rest-token");
    }

    expect(
      screen.getByText(`${Object.keys(ROLES).length} Roles`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `${PERMISSION_MATRIX.length} scopes across ${Object.keys(ROLES).length} roles`,
      ),
    ).toBeInTheDocument();

    // a default DOCTOR grant renders as authorized, an admin-only one as denied
    expect(
      within(table).getByRole("button", {
        name: "Revoke Issue e-prescriptions for DOCTOR",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(table).getByRole("button", {
        name: "Grant View all staff accounts for DOCTOR",
      }),
    ).toHaveAttribute("aria-pressed", "false");
  }, 15000);

  it("reports a matrix load failure and retries the same four reads", async () => {
    mswState.rolePermissionsErrorMode = "server-error";
    openPage(PATH);

    expect(
      await screen.findByText("Unable to load permission entitlements"),
    ).toBeInTheDocument();
    expect(screen.getByText("Internal server error")).toBeInTheDocument();
    expect(mswState.rolePermissionReadHits).toHaveLength(4);

    mswState.rolePermissionsErrorMode = null;
    fireEvent.click(screen.getByRole("button", { name: "Retry Connection" }));

    await matrixReady();
    expect(mswState.rolePermissionReadHits).toHaveLength(8);
  }, 15000);

  it("grants a scope by PUTting the role's full permission set", async () => {
    openPage(PATH);

    const toggle = await screen.findByRole("button", {
      name: "Grant View all staff accounts for DOCTOR",
    });
    fireEvent.click(toggle);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(
      'Are you sure you want to grant "View all staff accounts" (USER_READ_ALL) for [DOCTOR]?',
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Authorize Scope" }),
    );

    await waitFor(() =>
      expect(mswState.rolePermissionWriteHits).toHaveLength(1),
    );
    expect(mswState.rolePermissionWriteHits[0]).toMatchObject({
      role: "DOCTOR",
      authorization: "Bearer super-admin-rest-token",
      permissions: [...defaultsFor(ROLES.DOCTOR), "USER_READ_ALL"],
    });

    expect(
      await screen.findByText(
        "DOCTOR updated: View all staff accounts granted.",
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: "Revoke View all staff accounts for DOCTOR",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  }, 15000);

  it("revokes a scope with the confirm step and the replacement set", async () => {
    openPage(PATH);

    const toggle = await screen.findByRole("button", {
      name: "Revoke Issue e-prescriptions for DOCTOR",
    });
    fireEvent.click(toggle);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Revoke Security Scope?" }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Confirm Revocation" }),
    );

    await waitFor(() =>
      expect(mswState.rolePermissionWriteHits).toHaveLength(1),
    );
    expect(mswState.rolePermissionWriteHits[0].permissions).toEqual(
      defaultsFor(ROLES.DOCTOR).filter(
        (code) => code !== "PRESCRIPTION_CREATE",
      ),
    );
    expect(
      await screen.findByText("DOCTOR updated: Issue e-prescriptions revoked."),
    ).toBeInTheDocument();
  }, 15000);

  it("rolls the grant back and quotes the backend rule when BR004 fires", async () => {
    mswState.rolePermissionsErrorMode = "br004";
    openPage(PATH);

    const toggle = await screen.findByRole("button", {
      name: "Grant View all staff accounts for DOCTOR",
    });
    fireEvent.click(toggle);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Authorize Scope" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "BR004: SYSTEM_BACKUP is a privileged permission that only the SUPER_ADMIN role may hold",
    );

    await waitFor(() =>
      expect(mswState.rolePermissionWriteHits).toHaveLength(1),
    );
    // the matrix reverts to what the backend stored
    expect(
      await screen.findByRole("button", {
        name: "Grant View all staff accounts for DOCTOR",
      }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(mswState.rolePermissions.DOCTOR).toEqual(defaultsFor(ROLES.DOCTOR));
  }, 15000);

  it("blocks the privileged scope, the last grant and the immutable role client-side", async () => {
    // BR006: leave PHARMACIST with a single scope so revoking it would empty the set
    mswState.rolePermissions.PHARMACIST = ["PRESCRIPTION_DISPENSE"];
    openPage(PATH);

    const privileged = await screen.findByRole("button", {
      name: "Grant Run system backups for DOCTOR",
    });
    expect(privileged).toBeDisabled();
    expect(privileged).toHaveAttribute(
      "title",
      "BR004: Only SUPER_ADMIN may hold this privileged scope",
    );

    const lastGrant = screen.getByRole("button", {
      name: "Revoke Verify & dispense medications for PHARMACIST",
    });
    expect(lastGrant).toBeDisabled();
    expect(lastGrant).toHaveAttribute(
      "title",
      "BR006: A role's permission set cannot be empty",
    );

    expect(
      screen.queryByRole("button", { name: /for SUPER ADMIN$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByLabelText(/SUPER_ADMIN (Authorized|Denied) \(Immutable\)/)
        .length,
    ).toBeGreaterThan(0);
    expect(mswState.rolePermissionWriteHits).toHaveLength(0);
  }, 15000);

  it("narrows the matrix client-side through the debounced search", async () => {
    openPage(PATH);
    await matrixReady();

    fireEvent.change(screen.getByLabelText("Search permission scopes"), {
      target: { value: "backup" },
    });

    await waitFor(() =>
      expect(screen.getByText(/^\d+ of \d+ scopes shown$/)).toBeInTheDocument(),
    );
    const filtered = await screen.findByRole("region", {
      name: "Role entitlement matrix",
    });
    expect(
      within(filtered).getByRole("button", {
        name: "Grant Run system backups for DOCTOR",
      }),
    ).toBeInTheDocument();
    expect(
      within(filtered).queryByText("Register new patients"),
    ).not.toBeInTheDocument();
    // client-side filtering never re-reads the role sets
    expect(mswState.rolePermissionReadHits).toHaveLength(4);
  }, 15000);
});
