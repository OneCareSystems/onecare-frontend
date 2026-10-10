import { describe, it, expect } from "vitest";

import { ROLES } from "../../src/constants/roles";
import { ROUTE_ACCESS } from "../../src/constants/routeAccess";
import { NAV_ITEMS } from "../../src/constants/navigation";

/** Number of navigation steps a path represents (segment count). */
const pathDepth = (path) => path.split("/").filter(Boolean).length;

const MAX_NAV_STEPS = 3;

describe("AC6 — common tasks within ≤ 3 navigation steps per role", () => {
  it("defines a menu for every staff role", () => {
    for (const role of Object.values(ROLES)) {
      expect(NAV_ITEMS[role]).toBeDefined();
      expect(NAV_ITEMS[role].length).toBeGreaterThan(0);
    }
  });

  it("keeps every menu entry within the step budget", () => {
    for (const [role, items] of Object.entries(NAV_ITEMS)) {
      for (const item of items) {
        expect(
          pathDepth(item.to),
          `${role} menu item "${item.id}" (${item.to}) exceeds ${MAX_NAV_STEPS} steps`,
        ).toBeLessThanOrEqual(MAX_NAV_STEPS);
      }
    }
  });

  it("only links menu entries the role is allowed to open", () => {
    for (const [role, items] of Object.entries(NAV_ITEMS)) {
      for (const item of items) {
        const [, group] = item.to.split("/");
        const allowedRoles = ROUTE_ACCESS[group];

        expect(
          allowedRoles,
          `${role} menu item "${item.id}" points at unknown route group "${group}"`,
        ).toBeDefined();
        expect(
          allowedRoles,
          `${role} menu item "${item.id}" is not in ROUTE_ACCESS.${group}`,
        ).toContain(role);
      }
    }
  });

  it("keeps each role's dashboard exactly one step from its group root", () => {
    for (const [role, items] of Object.entries(NAV_ITEMS)) {
      const dashboard = items.find((item) => item.id === "dashboard");
      expect(dashboard, `${role} has no dashboard entry`).toBeDefined();
      expect(pathDepth(dashboard.to)).toBe(2);
    }
  });
});
