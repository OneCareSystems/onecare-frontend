import apiClient from "./apiClient";

/**
 * Super-admin audit trail (immutable security log).
 *
 * GET /audit-logs — Spring Data `Page` envelope:
 *   { success, message, data: { content: AuditLog[], totalElements,
 *     totalPages, number, size, first, last, pageable, sort, ... } }
 *
 * Wire shape (data.content[]):
 *   { logId, userId, username, actionType, entityType, entityId,
 *     description, ipAddress, timestamp }
 *   // timestamp: "2026-10-20T10:54:46" (no zone offset on the wire)
 *
 * Pagination follows Spring's convention — `?page=` (0-based) and
 * `?size=` — confirmed by the pageable/size/number fields the server
 * echoes back. No server-side filtering parameters are documented, so
 * the page filters the loaded rows client-side and labels it.
 */
export const DEFAULT_PAGE_SIZE = 20;

const asTrimmedString = (value) =>
  typeof value === "string" ? value.trim() : "";

const asNullableString = (value) =>
  value === null || value === undefined || value === "" ? null : String(value);

/** Normalise one wire record into the shape the UI renders. */
export const adaptAuditLog = (raw) => ({
  logId: Number(raw.logId),
  userId:
    raw.userId === null || raw.userId === undefined ? null : Number(raw.userId),
  username: asTrimmedString(raw.username),
  actionType: asTrimmedString(raw.actionType).toUpperCase(),
  entityType: asTrimmedString(raw.entityType).toUpperCase(),
  entityId: asNullableString(raw.entityId),
  description: asTrimmedString(raw.description),
  ipAddress: asTrimmedString(raw.ipAddress),
  timestamp: asTrimmedString(raw.timestamp),
});

/** A row is usable when it carries its server-assigned log id. */
const hasIdentity = (raw) =>
  Boolean(raw) && raw.logId !== null && raw.logId !== undefined;

/** Page response → { content, page, size, totalElements, totalPages, … }. */
export const adaptAuditLogsPageResponse = (payload) => {
  const data = payload?.data;
  if (payload?.success !== true || !data || !Array.isArray(data.content)) {
    throw new Error("Unexpected audit logs response format");
  }
  const content = data.content.filter(hasIdentity).map(adaptAuditLog);
  const rawPage = Number(data.number);
  const rawSize = Number(data.size);
  const rawTotalElements = Number(data.totalElements);
  const rawTotalPages = Number(data.totalPages);
  const page = Number.isFinite(rawPage) && rawPage >= 0 ? rawPage : 0;
  const size =
    Number.isFinite(rawSize) && rawSize > 0
      ? rawSize
      : content.length || DEFAULT_PAGE_SIZE;
  const totalElements =
    Number.isFinite(rawTotalElements) && rawTotalElements >= 0
      ? rawTotalElements
      : content.length;
  const totalPages =
    Number.isFinite(rawTotalPages) && rawTotalPages > 0 ? rawTotalPages : 1;
  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    first: typeof data.first === "boolean" ? data.first : page === 0,
    last: typeof data.last === "boolean" ? data.last : page >= totalPages - 1,
  };
};

/**
 * Fetch one page of the trail. `page` is 0-based (Spring convention);
 * the backend applies its own default sort (newest first in practice).
 */
export const getAuditLogs = async ({
  page = 0,
  size = DEFAULT_PAGE_SIZE,
  signal,
} = {}) => {
  // API_BASE_URL already includes the `/api` prefix.
  const response = await apiClient.get("/audit-logs", {
    params: { page, size },
    signal,
  });
  return adaptAuditLogsPageResponse(response.data);
};

export default {
  DEFAULT_PAGE_SIZE,
  getAuditLogs,
  adaptAuditLog,
  adaptAuditLogsPageResponse,
};
