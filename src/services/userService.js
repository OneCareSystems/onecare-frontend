import apiClient from "./apiClient";

/**
 * User management service (super-admin access governance).
 *
 * Endpoints follow the verified API Standards envelope
 * { success, message, data } used by every other service:
 *   GET    /users                     — list every staff account
 *   POST   /users                     — provision a new account (USER_CREATE)
 *   PUT    /users/{id}                — update email (USER_UPDATE)
 *   PUT    /users/{id}/role           — assign role (USER_ROLE_ASSIGN)
 *   PUT    /users/{id}/unlock         — clear lockout (USER_ROLE_ASSIGN, SA)
 *   POST   /users/{id}/reset-password — admin reset (USER_UPDATE, SA/ADMIN)
 *   DELETE /users/{id}                — deactivate account (USER_DELETE)
 *
 * Account state itself (`isActive` plus the automatic failed-login
 * lockout in AuthServiceImpl, `lockedUntil`, cleared by a successful
 * sign-in, a password reset or the unlock endpoint above) belongs to
 * the backend — the adapters derive it for display only.
 *
 * The adapters normalise each record once (tolerating the camelCase /
 * snake_case drift the backend is known for, the same way extractTokens
 * does in apiClient) so pages never touch wire shapes directly.
 */

const asTrimmedString = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeLabel = (value) => asTrimmedString(value).toUpperCase();

/** A record is usable when it carries some stable identifier. */
const hasIdentity = (raw) => {
  if (!raw || typeof raw !== "object") return false;
  const candidate = raw.userId ?? raw.id ?? raw.username;
  return asTrimmedString(String(candidate ?? "")) !== "";
};

/**
 * Normalise one wire record into the shape the UI renders.
 * Field aliases cover the drafts the backend has shipped so far.
 */
export const adaptUserRecord = (raw) => {
  const userId = raw.userId ?? raw.id ?? raw.username;
  const username = asTrimmedString(raw.username) || String(userId);
  const isActive = raw.isActive ?? raw.active;
  const lockedUntilDate = new Date(raw.lockedUntil ?? raw.locked_until ?? NaN);
  const isLocked =
    !Number.isNaN(lockedUntilDate.getTime()) &&
    lockedUntilDate.getTime() > Date.now();

  return {
    userId,
    fullName:
      asTrimmedString(raw.fullName) ||
      asTrimmedString(raw.name) ||
      username,
    username,
    email: asTrimmedString(raw.email),
    role: normalizeLabel(raw.role),
    status: isLocked ? "LOCKED" : isActive === false ? "INACTIVE" : "ACTIVE",
    lockedUntil: isLocked ? lockedUntilDate.toISOString() : null,
  };
};

export const adaptUsersResponse = (payload) => {
  const records = Array.isArray(payload?.data)
    ? payload.data
    : payload?.data?.content;
  if (payload?.success !== true || !Array.isArray(records)) {
    throw new Error("Unexpected users response format");
  }
  return records.filter(hasIdentity).map(adaptUserRecord);
};

export const adaptUserResponse = (payload) => {
  if (payload?.success !== true || !hasIdentity(payload.data)) {
    throw new Error("Unexpected user response format");
  }
  return adaptUserRecord(payload.data);
};

/** List the current users page returned in the API's data.content envelope. */
export const getUsers = async ({ signal } = {}) => {
  // API_BASE_URL already includes the `/api` prefix.
  const response = await apiClient.get("/users", { signal });
  return adaptUsersResponse(response.data);
};

/**
 * Provision a new account. The backend issues the temporary password and
 * mails it to the address on file, so nothing sensitive is returned here.
 */
export const createUser = async (userData) => {
  const response = await apiClient.post("/users", {
    fullName: asTrimmedString(userData.fullName),
    username: asTrimmedString(userData.username),
    email: asTrimmedString(userData.email),
    role: normalizeLabel(userData.role),
  });
  return adaptUserResponse(response.data);
};

/**
 * Admin-triggered password reset (POST, USER_UPDATE — SA/ADMIN). The
 * backend treats this as a placeholder; the envelope message is all we
 * get back by design.
 */
export const resetUserPassword = async (userId) => {
  const response = await apiClient.post(`/users/${userId}/reset-password`);
  return response.data;
};

/** Update the account email (PUT, USER_UPDATE). */
export const updateUserEmail = async (userId, email) => {
  const response = await apiClient.put(`/users/${userId}`, {
    email: asTrimmedString(email),
  });
  return response.data;
};

/** Assign a new role (PUT, USER_ROLE_ASSIGN). */
export const assignUserRole = async (userId, role) => {
  const response = await apiClient.put(`/users/${userId}/role`, {
    role: normalizeLabel(role),
  });
  return response.data;
};

/** Clear the failed-sign-in lockout (PUT, SA-only USER_ROLE_ASSIGN). */
export const unlockUser = async (userId) => {
  const response = await apiClient.put(`/users/${userId}/unlock`, {});
  return response.data;
};

/**
 * Deactivate an account (DELETE, USER_DELETE). The record stays on
 * file — sign-in is what stops.
 */
export const deactivateUser = async (userId) => {
  const response = await apiClient.delete(`/users/${userId}`);
  return response.data;
};

export default {
  getUsers,
  createUser,
  updateUserEmail,
  assignUserRole,
  unlockUser,
  resetUserPassword,
  deactivateUser,
};
