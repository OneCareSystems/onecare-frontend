/**
 * CFG-03 — role constants (SDS §2.5.2, permission matrix Table 9).
 * Defined once and imported everywhere; never hard-code role strings.
 */
export const ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  DOCTOR: "DOCTOR",
  PHARMACIST: "PHARMACIST",
});

/**
 * The dashboard each role lands on after login (AC1) or when redirected
 * from a screen their role may not use (AC2, AC4).
 */
export const ROLE_DASHBOARDS = Object.freeze({
  [ROLES.SUPER_ADMIN]: "/superadmin/dashboard",
  [ROLES.ADMIN]: "/admin/dashboard",
  [ROLES.DOCTOR]: "/doctor/dashboard",
  [ROLES.PHARMACIST]: "/pharmacist/dashboard",
});

/**
 * Safe fallback when the session carries no known role.
 */
export const dashboardPathForRole = (role) =>
  ROLE_DASHBOARDS[role] ?? "/login";
