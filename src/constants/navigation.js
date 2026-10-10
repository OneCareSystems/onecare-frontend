import { ROLES } from "./roles";

/**
 * CFG-03 — per-role navigation menu (AC6).
 * Sidebar entries for each staff role. Common tasks must stay reachable
 * within ≤ 3 navigation steps; navigation.test.js enforces the depth.
 * Feature tickets extend this table as new screens land.
 */
export const NAV_ITEMS = Object.freeze({
  [ROLES.SUPER_ADMIN]: Object.freeze([
    Object.freeze({
      id: "dashboard",
      to: "/superadmin/dashboard",
      label: "Dashboard",
    }),
    Object.freeze({ id: "queue", to: "/queue", label: "Queue" }),
  ]),
  [ROLES.ADMIN]: Object.freeze([
    Object.freeze({ id: "dashboard", to: "/admin/dashboard", label: "Dashboard" }),
    Object.freeze({ id: "queue", to: "/queue", label: "Queue" }),
  ]),
  [ROLES.DOCTOR]: Object.freeze([
    Object.freeze({
      id: "dashboard",
      to: "/doctor/dashboard",
      label: "Dashboard",
    }),
    Object.freeze({ id: "queue", to: "/queue", label: "Queue" }),
  ]),
  [ROLES.PHARMACIST]: Object.freeze([
    Object.freeze({
      id: "dashboard",
      to: "/pharmacist/dashboard",
      label: "Dashboard",
    }),
  ]),
});
