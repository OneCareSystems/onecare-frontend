import apiClient from "./apiClient";

/**
 * FR010/UC5 — system backup & restore (Super Admin only).
 *
 * POST /system/backups                     — run a backup → 201 record
 * GET  /system/backups                     — list metadata, newest first
 * GET  /system/backups/{backupId}/download — stream the encrypted file
 * POST /system/restore                     — destructive, multipart form
 *
 * Backups are full data exports, timestamped and encrypted with
 * AES-256-GCM (SDS §2.5.3); these endpoints expose the metadata
 * (timestamp, filename, size). Reads and downloads answer 403 for any
 * non-Super-Admin role (AC1: SYSTEM_BACKUP / SYSTEM_RESTORE).
 *
 * Restore takes a multipart form: `backupId` (a stored backup) or
 * `file` (an uploaded encrypted backup), plus `confirm` which must be
 * true — there is no silent overwrite (AC4). On success every exported
 * table is replaced inside one transaction and an audit entry
 * (action=SYSTEM_RESTORE) is written afterwards; the response carries
 * the restored row count per table. NFRR-005: restore completes within
 * 4 hours (operational target).
 */

/** Normalise one backup metadata record. */
export const adaptBackupRecord = (raw) => {
  if (!raw || typeof raw !== "object" || raw.backupId === undefined) {
    throw new Error("Unexpected backup record format");
  }
  return {
    backupId: Number(raw.backupId),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    filename: typeof raw.filename === "string" ? raw.filename : "",
    sizeBytes: Number.isFinite(Number(raw.sizeBytes))
      ? Number(raw.sizeBytes)
      : 0,
  };
};

/** List response: an array of backup records, sorted newest first. */
export const adaptBackupListResponse = (payload) => {
  if (payload?.success !== true || !Array.isArray(payload?.data)) {
    throw new Error("Unexpected backup list response format");
  }
  return payload.data
    .map(adaptBackupRecord)
    .sort((a, b) => b.backupId - a.backupId);
};

const adaptBackupResponse = (payload) => {
  if (payload?.success !== true) {
    throw new Error("Unexpected backup response format");
  }
  return adaptBackupRecord(payload.data);
};

/** Restore response: per-table restored row counts. */
const adaptRestoreResponse = (payload) => {
  const data = payload?.data;
  if (
    payload?.success !== true ||
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.values(data).some((count) => !Number.isFinite(Number(count)))
  ) {
    throw new Error("Unexpected restore response format");
  }
  return Object.fromEntries(
    Object.entries(data).map(([table, count]) => [table, Number(count)]),
  );
};

/** Parse `attachment; filename="…"` from a Content-Disposition header. */
export const parseContentDisposition = (header) => {
  const match = /filename="?([^";]+)"?/i.exec(String(header ?? ""));
  return match ? match[1] : null;
};

export const listBackups = async ({ signal } = {}) => {
  const response = await apiClient.get("/system/backups", { signal });
  return adaptBackupListResponse(response.data);
};

/** Run a backup now; the backend answers 201 with the new record. */
export const createBackup = async () => {
  const response = await apiClient.post("/system/backups");
  return adaptBackupResponse(response.data);
};

/** Stream the encrypted file; returns the blob plus its real filename. */
export const downloadBackup = async (backupId) => {
  const response = await apiClient.get(`/system/backups/${backupId}/download`, {
    responseType: "blob",
  });
  return {
    blob: response.data,
    filename:
      parseContentDisposition(response.headers?.["content-disposition"]) ??
      `onecare-backup-${backupId}.backup`,
  };
};

/**
 * Restore from a stored backupId or an uploaded encrypted file.
 * `confirm` is mandatory — the backend refuses without it (AC4), and
 * so do we: no request leaves the browser for an unconfirmed restore.
 */
export const restoreBackup = async ({ backupId, file, confirm }) => {
  if (confirm !== true) {
    throw new Error("Restore requires explicit confirmation");
  }
  if (!backupId && !file) {
    throw new Error(
      "Provide a backupId or an uploaded backup file to restore",
    );
  }
  const form = new FormData();
  form.append("confirm", "true");
  if (backupId !== undefined && backupId !== null) {
    form.append("backupId", String(backupId));
  }
  if (file) form.append("file", file);
  const response = await apiClient.post("/system/restore", form);
  return adaptRestoreResponse(response.data);
};

/** Human-readable size for the backups table. */
export const formatBytes = (sizeBytes) => {
  const bytes = Number(sizeBytes);
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
};

export default {
  listBackups,
  createBackup,
  downloadBackup,
  restoreBackup,
  formatBytes,
};
