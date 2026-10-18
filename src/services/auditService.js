import apiClient from "./apiClient";

/**
 * Audit-log service (super-admin immutable security trail).
 *
 * Planned backend contract (not yet implemented server-side — until it
 * ships, `getAuditLogs` rejects with status 404/501 and pages should use
 * `isAuditTrailUnavailable` to render a friendly notice instead of an
 * error):
 *   GET /audit-logs — { success, message, data: AuditLog[] }
 *
 * AuditLog wire shape (normalised once in `adaptAuditLog`, tolerating
 * the camelCase / snake_case drift extractTokens already handles in
 * apiClient):
 *   { id, timestamp, user/actor, ip, action, target, severity, hash }
 *
 * Severities the ledger uses; the page builds its filter from this.
 */
export const SEVERITY_LEVELS = Object.freeze(["INFO", "WARNING", "CRITICAL"]);

const asTrimmedString = (value) =>
  typeof value === "string" ? value.trim() : "";

/** An entry is usable when it carries some stable identifier. */
const hasIdentity = (raw) => {
  if (!raw || typeof raw !== "object") return false;
  const candidate = raw.id ?? raw.logId ?? raw.eventId;
  return asTrimmedString(String(candidate ?? "")) !== "";
};

/** Normalise one wire record into the shape the UI renders. */
export const adaptAuditLog = (raw) => ({
  id: raw.id ?? raw.logId ?? raw.eventId,
  timestamp: asTrimmedString(raw.timestamp ?? raw.createdAt ?? raw.created_at),
  user: asTrimmedString(raw.user ?? raw.actor ?? raw.username ?? raw.principal),
  ip: asTrimmedString(raw.ip ?? raw.ipAddress ?? raw.ip_address),
  action: asTrimmedString(raw.action ?? raw.event),
  target: asTrimmedString(raw.target ?? raw.resource ?? raw.targetResource),
  severity: asTrimmedString(raw.severity).toUpperCase(),
  hash: asTrimmedString(raw.hash ?? raw.integrityHash ?? raw.integrity_hash),
});

export const adaptAuditLogsResponse = (payload) => {
  if (payload?.success !== true || !Array.isArray(payload.data)) {
    throw new Error("Unexpected audit logs response format");
  }
  return payload.data.filter(hasIdentity).map(adaptAuditLog);
};

/**
 * The endpoint has not been built yet: a 404/501 means "not connected",
 * which callers surface as a notice rather than a failure. Transport and
 * server errors keep status null / 5xx and stay retryable errors.
 */
export const isAuditTrailUnavailable = (error) =>
  error?.status === 404 || error?.status === 501;

/** Fetch the whole security trail (ordering is the backend's contract). */
export const getAuditLogs = async ({ signal } = {}) => {
  // API_BASE_URL already includes the `/api` prefix.
  const response = await apiClient.get("/audit-logs", { signal });
  return adaptAuditLogsResponse(response.data);
};

export default {
  SEVERITY_LEVELS,
  getAuditLogs,
  adaptAuditLog,
  adaptAuditLogsResponse,
  isAuditTrailUnavailable,
};
