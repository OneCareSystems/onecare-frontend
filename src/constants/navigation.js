import { ROLES } from "./roles";

/**
 * CFG-03/04 — per-role navigation menu (AC6).
 * Sidebar entries for each staff role. Common tasks must stay reachable
 * within ≤ 3 navigation steps; navigation.test.js enforces the depth.
 * Labels are plain English — staff chrome is not translated (team
 * decision); only the home page is.
 * Feature tickets extend this table as new screens land.
 */
export const NAV_ITEMS = Object.freeze({
  [ROLES.SUPER_ADMIN]: Object.freeze([
    Object.freeze({
      id: "dashboard",
      to: "/super-admin/dashboard",
      label: "Dashboard",
      icon: "dashboard",
    }),
    Object.freeze({
      id: "queue",
      to: "/queue",
      label: "Queue",
      icon: "list-checks",
    }),
  ]),
  [ROLES.ADMIN]: Object.freeze([
    Object.freeze({
      id: "dashboard",
      to: "/admin/dashboard",
      label: "Dashboard",
      icon: "dashboard",
    }),
    Object.freeze({
      id: "queue",
      to: "/queue",
      label: "Queue",
      icon: "list-checks",
    }),
  ]),
  [ROLES.DOCTOR]: Object.freeze([
    Object.freeze({
      id: "dashboard",
      to: "/doctor/dashboard",
      label: "Dashboard",
      icon: "dashboard",
    }),
    Object.freeze({
      id: "today-schedule",
      to: "/doctor/today-schedule",
      label: "Today’s schedule",
      icon: "calendar-clock",
    }),
    Object.freeze({
      id: "patient-records",
      to: "/doctor/patient-records",
      label: "Patients Records",
      icon: "users",
    }),
    Object.freeze({
      id: "knowledge-base",
      to: "/doctor/knowledge-base",
      label: "Knowledge Base",
      icon: "brain",
    }),
    Object.freeze({
      id: "queue",
      to: "/queue",
      label: "Queue",
      icon: "list-checks",
    }),
  ]),
  [ROLES.PHARMACIST]: Object.freeze([
    Object.freeze({
      id: "dashboard",
      to: "/pharmacist/dashboard",
      label: "Dashboard",
      icon: "dashboard",
    }),
  ]),
});
