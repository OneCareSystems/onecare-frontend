import { describe, expect, it } from "vitest";

import { ROLES } from "../../src/constants/roles";
import {
  PERMISSION_CATEGORIES,
  PERMISSION_CODES,
  PERMISSION_MATRIX,
  hasPermission,
} from "../../src/constants/permissions";

/**
 * The matrix is a static mirror of the backend policy classes
 * `com.onecare.backend.security.Permission` / `RolePermission`. These
 * tests pin the mirror: counts, naming and the exact per-role grants, so
 * a drift against the Java source fails here first.
 */
describe("permission matrix — CFG-03 backend mirror", () => {
  it("mirrors every Permission constant exactly once", () => {
    expect(PERMISSION_MATRIX).toHaveLength(39);
    expect(new Set(PERMISSION_CODES).size).toBe(PERMISSION_CODES.length);
    expect(PERMISSION_CODES).toHaveLength(39);

    for (const entry of PERMISSION_MATRIX) {
      // Java constant naming: UPPER_SNAKE_CASE.
      expect(entry.code).toMatch(/^[A-Z]+(_[A-Z]+)+$/);
      expect(PERMISSION_CATEGORIES).toContain(entry.category);
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it("groups scopes into the four display domains in order", () => {
    expect(PERMISSION_CATEGORIES).toEqual([
      "Clinical EMR",
      "Pharmacy & Dispensary",
      "Financial & Billing",
      "Security & Infrastructure",
    ]);

    const used = PERMISSION_MATRIX.map((entry) => entry.category);
    expect(used).toEqual(expect.arrayContaining(PERMISSION_CATEGORIES));
  });

  it("grants only known roles, without duplicates", () => {
    const knownRoles = Object.values(ROLES);

    for (const entry of PERMISSION_MATRIX) {
      expect(new Set(entry.granted).size).toBe(entry.granted.length);
      for (const role of entry.granted) {
        expect(knownRoles).toContain(role);
      }
    }
  });

  it("reproduces the RolePermission grants for every role", () => {
    const grantsFor = (role) =>
      PERMISSION_MATRIX.filter((entry) => entry.granted.includes(role))
        .map((entry) => entry.code)
        .sort();

    expect(grantsFor(ROLES.SUPER_ADMIN)).toHaveLength(30);
    expect(grantsFor(ROLES.ADMIN)).toHaveLength(23);
    expect(grantsFor(ROLES.DOCTOR)).toHaveLength(14);
    expect(grantsFor(ROLES.PHARMACIST)).toHaveLength(14);

    // 39 scopes × 4 roles = 156 cells, 81 of them granted by default.
    const grantedCells = PERMISSION_MATRIX.reduce(
      (sum, entry) => sum + entry.granted.length,
      0,
    );
    expect(PERMISSION_MATRIX.length * Object.keys(ROLES).length).toBe(156);
    expect(grantedCells).toBe(81);
  });

  it("keeps the sharp edges of the Java policy intact", () => {
    const rolesWith = (code) => {
      const entry = PERMISSION_MATRIX.find((item) => item.code === code);
      expect(entry).toBeDefined();
      return [...entry.granted].sort();
    };

    // Destructive / identity-clearance scopes stay SUPER_ADMIN-only.
    expect(rolesWith("USER_DELETE")).toEqual([ROLES.SUPER_ADMIN]);
    expect(rolesWith("USER_ROLE_ASSIGN")).toEqual([ROLES.SUPER_ADMIN]);
    expect(rolesWith("PATIENT_DELETE")).toEqual([ROLES.SUPER_ADMIN]);

    // Clinical notes are invisible to pure admin roles (Java: only
    // DOCTOR holds WRITE, DOCTOR + PHARMACIST hold READ).
    expect(rolesWith("APPOINTMENT_WRITE_CLINICAL_NOTES")).toEqual([
      ROLES.DOCTOR,
    ]);
    expect(rolesWith("APPOINTMENT_READ_CLINICAL_NOTES")).toEqual([
      ROLES.DOCTOR,
      ROLES.PHARMACIST,
    ]);

    // Prescription authority is split by workflow stage.
    expect(rolesWith("PRESCRIPTION_CREATE")).toEqual([ROLES.DOCTOR]);
    expect(rolesWith("PRESCRIPTION_DISPENSE")).toEqual([ROLES.PHARMACIST]);
    expect(rolesWith("PRESCRIPTION_READ_ALL")).toEqual(
      [...Object.values(ROLES)].sort(),
    );

    // ADMIN creates but cannot delete staff accounts.
    expect(rolesWith("USER_CREATE")).toEqual(
      [ROLES.SUPER_ADMIN, ROLES.ADMIN].sort(),
    );

    // Governance scopes shipped with the role permissions API (FR003):
    // only SUPER_ADMIN may read or rewrite role permission sets, and
    // SYSTEM_BACKUP is privileged (backend rule BR004).
    expect(rolesWith("SYSTEM_BACKUP")).toEqual([ROLES.SUPER_ADMIN]);
    expect(rolesWith("ROLE_PERMISSION_READ")).toEqual([ROLES.SUPER_ADMIN]);
    expect(rolesWith("ROLE_PERMISSION_UPDATE")).toEqual([ROLES.SUPER_ADMIN]);
    // Clinic configuration: only SUPER_ADMIN writes doctor schedules
    // (FR009/UC4 requires SCHEDULE_MANAGE).
    expect(rolesWith("SCHEDULE_MANAGE")).toEqual([ROLES.SUPER_ADMIN]);
    expect(
      PERMISSION_MATRIX.find((entry) => entry.code === "SYSTEM_BACKUP")
        .privileged,
    ).toBe(true);
  });

  it("surfaces scopes defined but granted to no role yet", () => {
    const withNoGrants = PERMISSION_MATRIX.filter(
      (entry) => entry.granted.length === 0,
    ).map((entry) => entry.code);

    expect(withNoGrants.sort()).toEqual([
      "AUDIT_READ",
      "REPORT_GENERATE",
      "USER_READ_OWN",
    ]);
  });

  it("hasPermission reads a granted list", () => {
    expect(hasPermission([ROLES.DOCTOR], ROLES.DOCTOR)).toBe(true);
    expect(hasPermission([ROLES.ADMIN], ROLES.DOCTOR)).toBe(false);
    expect(hasPermission(null, ROLES.DOCTOR)).toBe(false);
    expect(hasPermission("not-a-list", ROLES.DOCTOR)).toBe(false);
  });
});
