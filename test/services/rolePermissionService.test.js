import { afterEach, describe, expect, it } from "vitest";

import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import {
  adaptRolePermissionsResponse,
  getRolePermissions,
  setRolePermissions,
} from "../../src/services/rolePermissionService";
import { mswState, resetMswState } from "../msw/handlers";

afterEach(() => {
  store.dispatch(clearSession());
  resetMswState();
});

/**
 * FR003/UC3 — configurable role permissions. The mock backend enforces
 * the same rules as the real one (400 unknown codes, 404 unknown role,
 * 422 BR004-006) and leaves the stored set untouched on every failure
 * (AC5), which is exactly what the Access Control screen relies on.
 */
describe("rolePermissionService — role permission governance", () => {
  it("adapts the envelope and rejects malformed payloads", () => {
    expect(
      adaptRolePermissionsResponse({
        success: true,
        message: "Permissions retrieved successfully",
        data: { role: "ADMIN", permissions: ["PATIENT_CREATE"] },
      }),
    ).toEqual({ role: "ADMIN", permissions: ["PATIENT_CREATE"] });

    expect(() =>
      adaptRolePermissionsResponse({ success: true, data: { role: "ADMIN" } }),
    ).toThrow(/response format/i);
    expect(() =>
      adaptRolePermissionsResponse({
        success: true,
        data: { role: "ADMIN", permissions: [7] },
      }),
    ).toThrow(/response format/i);
    expect(() =>
      adaptRolePermissionsResponse({
        success: false,
        data: { role: "ADMIN", permissions: [] },
      }),
    ).toThrow(/response format/i);
  });

  it("reads a role's current set through the authenticated client", async () => {
    store.dispatch(
      setSession({ accessToken: "sa-access", role: "SUPER_ADMIN" }),
    );

    const result = await getRolePermissions("ADMIN");

    expect(result.role).toBe("ADMIN");
    expect(result.permissions).toContain("PATIENT_CREATE");
    expect(mswState.rolePermissionReadHits[0]).toMatchObject({
      role: "ADMIN",
      authorization: "Bearer sa-access",
    });
  });

  it("reports an unknown role as 404", async () => {
    const error = await getRolePermissions("PATIENT").catch((caught) => caught);

    expect(error.status).toBe(404);
  });

  it("replaces a role's full set and persists it in the mock backend", async () => {
    const updated = await setRolePermissions("DOCTOR", [
      "PATIENT_READ",
      "APPOINTMENT_READ",
    ]);

    expect(updated).toEqual({
      role: "DOCTOR",
      permissions: ["PATIENT_READ", "APPOINTMENT_READ"],
    });
    expect(mswState.rolePermissions.DOCTOR).toEqual([
      "PATIENT_READ",
      "APPOINTMENT_READ",
    ]);

    const reread = await getRolePermissions("DOCTOR");
    expect(reread.permissions).toEqual([
      "PATIENT_READ",
      "APPOINTMENT_READ",
    ]);
  });

  it("rejects unknown permission codes with 400 and saves nothing", async () => {
    const before = [...mswState.rolePermissions.DOCTOR];

    const error = await setRolePermissions("DOCTOR", ["NOT_A_PERMISSION"]).catch(
      (caught) => caught,
    );

    expect(error.status).toBe(400);
    expect(error.userMessage).toMatch(/Unknown permission/);
    expect(mswState.rolePermissions.DOCTOR).toEqual(before);
  });

  it("enforces the backend policy rules BR004-006 without persisting", async () => {
    // BR006 — a role's permission set cannot be empty.
    const empty = await setRolePermissions("DOCTOR", []).catch((caught) => caught);
    expect(empty.status).toBe(422);
    expect(empty.userMessage).toMatch(/BR006/);

    // BR005 — the SUPER_ADMIN role's own set cannot be modified.
    const sa = await setRolePermissions("SUPER_ADMIN", ["PATIENT_READ"]).catch(
      (caught) => caught,
    );
    expect(sa.status).toBe(422);
    expect(sa.userMessage).toMatch(/BR005/);

    // BR004 — SYSTEM_BACKUP is privileged, SUPER_ADMIN only.
    const backup = await setRolePermissions("ADMIN", ["SYSTEM_BACKUP"]).catch(
      (caught) => caught,
    );
    expect(backup.status).toBe(422);
    expect(backup.userMessage).toMatch(/BR004/);

    // Nothing above mutated the stored sets (AC5).
    expect(mswState.rolePermissions.SUPER_ADMIN.length).toBeGreaterThan(0);
    expect(mswState.rolePermissions.ADMIN).not.toContain("SYSTEM_BACKUP");
    expect(mswState.rolePermissions.DOCTOR).not.toEqual([]);
  });

  it("surfaces a missing ROLE_PERMISSION_UPDATE as 403", async () => {
    mswState.rolePermissionsErrorMode = "forbidden";

    const error = await setRolePermissions("DOCTOR", ["PATIENT_READ"]).catch(
      (caught) => caught,
    );

    expect(error.status).toBe(403);
    expect(error.userMessage).toMatch(/Access denied/);
  });

  it("rejects malformed permission payloads before any request", async () => {
    const hits = mswState.rolePermissionWriteHits.length;

    await expect(
      setRolePermissions("DOCTOR", "PATIENT_READ"),
    ).rejects.toThrow(/permissions must be an array/i);
    expect(mswState.rolePermissionWriteHits.length).toBe(hits);
  });
});
