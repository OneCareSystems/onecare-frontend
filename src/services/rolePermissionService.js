import apiClient from "./apiClient";

/**
 * CFG-03 — role permission governance (FR003, UC3).
 *
 * GET  /api/roles/{role}/permissions — the role's current set.
 * PUT  /api/roles/{role}/permissions — replace the full set.
 *
 * Both endpoints require the Super Admin role at the URL level plus
 * ROLE_PERMISSION_READ / ROLE_PERMISSION_UPDATE respectively.
 *
 * The backend enforces its policy rules and never persists a partial
 * result (AC5); `apiClient` surfaces the envelope message on
 * `error.userMessage`, so callers can show the exact rule that failed:
 *   400 unknown permission(s) · 403 missing ROLE_PERMISSION_UPDATE
 *   404 unknown role · 422 BR004 (SYSTEM_BACKUP is privileged),
 *   BR005 (SUPER_ADMIN's own set cannot be modified),
 *   BR006 (a role's set cannot be empty).
 */

/** Validate the {success, data:{role, permissions}} envelope. */
export const adaptRolePermissionsResponse = (payload) => {
  const data = payload?.data;
  if (
    payload?.success !== true ||
    !data ||
    typeof data.role !== "string" ||
    !Array.isArray(data.permissions) ||
    data.permissions.some((code) => typeof code !== "string")
  ) {
    throw new Error("Unexpected role permissions response format");
  }
  return { role: data.role, permissions: [...data.permissions] };
};

export const getRolePermissions = async (role, { signal } = {}) => {
  const response = await apiClient.get(`/roles/${role}/permissions`, {
    signal,
  });
  return adaptRolePermissionsResponse(response.data);
};

/**
 * Replace a role's full permission set. The backend treats this
 * atomically: every rule must pass or the stored set is untouched.
 */
export const setRolePermissions = async (role, permissions) => {
  if (
    !Array.isArray(permissions) ||
    permissions.some((code) => typeof code !== "string" || !code.trim())
  ) {
    throw new Error("permissions must be an array of permission codes");
  }
  const response = await apiClient.put(`/roles/${role}/permissions`, {
    permissions,
  });
  return adaptRolePermissionsResponse(response.data);
};

export default { getRolePermissions, setRolePermissions };
