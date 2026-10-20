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
    Object.freeze({ id: "register-patient", to: "/super-admin/register-patient", label: "Register Patient", icon: "user-check" }),
    Object.freeze({
      id: "user-management",
      to: "/super-admin/user-management",
      label: "User Management",
      icon: "users",
    }),
    Object.freeze({
      id: "access-control",
      to: "/super-admin/access-control",
      label: "Access Control",
      icon: "shield",
    }),
    Object.freeze({
      id: "clinic-configuration",
      to: "/super-admin/clinic-configuration",
      label: "Clinic Configuration",
      icon: "hospital",
    }),
    Object.freeze({
      id: "system-maintenance",
      to: "/super-admin/system-maintenance",
      label: "System Maintenance",
      icon: "activity",
    }),
    Object.freeze({
      id: "audits-reports",
      to: "/super-admin/audits-reports",
      label: "Audits & Reports",
      icon: "clipboard",
    }),
  ]),
  [ROLES.ADMIN]: Object.freeze([
    Object.freeze({
      id: "dashboard",
      to: "/admin/dashboard",
      label: "Dashboard",
      icon: "dashboard",
    }),
    Object.freeze({ id: "register-patient", to: "/admin/register-patient", label: "Register Patient", icon: "user-check" }),
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
    // Object.freeze({
    //   id: "queue",
    //   to: "/queue",
    //   label: "Queue",
    //   icon: "list-checks",
    // }),
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
