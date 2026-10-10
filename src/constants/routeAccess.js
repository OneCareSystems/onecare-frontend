import { ROLES } from "./roles";

/**
 * CFG-03 — route access table, derived from SDS Table 9 (OD-3).
 * Each entry lists the roles allowed to open routes in that group or on
 * that shared screen. This is a UX layer only — the backend still
 * authorises every request (403), per Coding Standards §21.
 */
export const ROUTE_ACCESS = Object.freeze({
  admin: Object.freeze([ROLES.ADMIN]),
  doctor: Object.freeze([ROLES.DOCTOR]),
  pharmacist: Object.freeze([ROLES.PHARMACIST]),
  superadmin: Object.freeze([ROLES.SUPER_ADMIN]),
  // Shared screens (AC4): one route, several allowed roles.
  queue: Object.freeze([ROLES.ADMIN, ROLES.DOCTOR, ROLES.SUPER_ADMIN]),
});

export const CHANGE_PASSWORD_PATH = "/change-password";
