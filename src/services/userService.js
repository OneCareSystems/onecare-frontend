import apiClient from "./apiClient";

/**
 * User management service (super-admin access governance).
 *
 * Endpoints follow the verified API Standards envelope
 * { success, message, data } used by every other service:
 *   GET   /users                    — list every staff account
 *   POST  /users                    — provision a new account
 *   PATCH /users/{id}/status        — activate / suspend an account
 *   POST  /users/{id}/password-reset — email a temporary password link
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

  return {
    userId,
    fullName:
      asTrimmedString(raw.fullName) ||
      asTrimmedString(raw.name) ||
      username,
    username,
    email: asTrimmedString(raw.email),
    role: normalizeLabel(raw.role),
    status:
      normalizeLabel(raw.status) ||
      (isActive === undefined ? "ACTIVE" : isActive ? "ACTIVE" : "SUSPENDED"),
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

/** Activate or suspend an account (AUD-05 access-governance trail). */
export const updateUserStatus = async (userId, status) => {
  const response = await apiClient.patch(`/users/${userId}/status`, {
    status: normalizeLabel(status),
  });
  return adaptUserResponse(response.data);
};

/**
 * Trigger the "reset key" flow: the backend emails a temporary password
 * link. The envelope message is all we get back by design.
 */
export const resetUserPassword = async (userId) => {
  const response = await apiClient.post(`/users/${userId}/password-reset`);
  return response.data;
};

export default {
  getUsers,
  createUser,
  updateUserStatus,
  resetUserPassword,
};
