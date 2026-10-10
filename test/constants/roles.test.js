import { describe, it, expect } from "vitest";

import {
  ROLES,
  ROLE_DASHBOARDS,
  dashboardPathForRole,
} from "../../src/constants/roles";

describe("role constants — CFG-03", () => {
  it("defines the four staff roles once", () => {
    expect(Object.values(ROLES)).toEqual([
      "SUPER_ADMIN",
      "ADMIN",
      "DOCTOR",
      "PHARMACIST",
    ]);
  });

  it("maps every role to its own dashboard", () => {
    expect(ROLE_DASHBOARDS[ROLES.SUPER_ADMIN]).toBe("/superadmin/dashboard");
    expect(ROLE_DASHBOARDS[ROLES.ADMIN]).toBe("/admin/dashboard");
    expect(ROLE_DASHBOARDS[ROLES.DOCTOR]).toBe("/doctor/dashboard");
    expect(ROLE_DASHBOARDS[ROLES.PHARMACIST]).toBe("/pharmacist/dashboard");
  });

  it("falls back to /login for unknown roles", () => {
    expect(dashboardPathForRole("PATIENT")).toBe("/login");
    expect(dashboardPathForRole(undefined)).toBe("/login");
    expect(dashboardPathForRole(null)).toBe("/login");
  });
});
