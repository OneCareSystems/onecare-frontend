import { afterEach, describe, expect, it } from "vitest";

import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import {
  adaptBackupListResponse,
  adaptBackupRecord,
  createBackup,
  downloadBackup,
  formatBytes,
  listBackups,
  parseContentDisposition,
  restoreBackup,
} from "../../src/services/systemBackupService";
import { mswState, resetMswState } from "../msw/handlers";

afterEach(() => {
  store.dispatch(clearSession());
  resetMswState();
});

/** The FR010/UC5 spec example, seeded into the mock as the newest backup. */
const SPEC_BACKUP = {
  backupId: 2,
  createdAt: "2026-10-19T10:15:30.123",
  filename: "onecare-backup-20261019T101530.backup",
  sizeBytes: 48213,
};

describe("systemBackupService — FR010/UC5 backup & restore", () => {
  it("normalises a record and sorts the list newest first", () => {
    expect(
      adaptBackupRecord({
        backupId: "3",
        createdAt: "2026-10-19T10:15:30.123",
        filename: "onecare-backup.backup",
        sizeBytes: "48213",
      }),
    ).toEqual({
      backupId: 3,
      createdAt: "2026-10-19T10:15:30.123",
      filename: "onecare-backup.backup",
      sizeBytes: 48213,
    });

    expect(() => adaptBackupRecord(null)).toThrow(/record format/i);
    expect(() => adaptBackupRecord({ filename: "x.backup" })).toThrow(
      /record format/i,
    );

    expect(
      adaptBackupListResponse({
        success: true,
        data: [
          {
            backupId: 1,
            createdAt: "2026-10-12T03:00:08.902",
            filename: "older.backup",
            sizeBytes: 46880,
          },
          SPEC_BACKUP,
        ],
      }).map((backup) => backup.backupId),
    ).toEqual([2, 1]);

    expect(() =>
      adaptBackupListResponse({ success: false, data: [] }),
    ).toThrow(/list response/i);
    expect(() =>
      adaptBackupListResponse({ success: true, data: { backupId: 1 } }),
    ).toThrow(/list response/i);
  });

  it("lists stored backups through the authenticated client", async () => {
    store.dispatch(
      setSession({ accessToken: "s-access", role: "SUPER_ADMIN" }),
    );

    const backups = await listBackups();

    expect(backups).toEqual([SPEC_BACKUP, mswState.systemBackups[1]]);
    expect(backups[0].backupId).toBeGreaterThan(backups[1].backupId);
    expect(mswState.systemBackupHits[0]).toMatchObject({
      authorization: "Bearer s-access",
    });
  });

  it("creates a backup and shows it in the next listing", async () => {
    const record = await createBackup();

    expect(record.backupId).toBe(3);
    expect(record.filename).toMatch(/^onecare-backup-\d{8}T\d{6}\.backup$/);
    expect(record.sizeBytes).toBeGreaterThan(0);
    expect(mswState.systemBackupCreateHits).toHaveLength(1);

    const listed = await listBackups();
    expect(listed[0]).toEqual(record);
  });

  it("streams the encrypted file and keeps its real filename", async () => {
    const { blob, filename } = await downloadBackup(1);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(filename).toBe("onecare-backup-20261012T030008.backup");
    expect(mswState.systemBackupDownloadHits[0]).toMatchObject({ id: "1" });
  });

  it("reports an unknown backup as 404 on download", async () => {
    const error = await downloadBackup(999).catch((caught) => caught);

    expect(error.status).toBe(404);
  });

  it("restores from a stored backupId and returns the per-table counts", async () => {
    store.dispatch(
      setSession({ accessToken: "s-access", role: "SUPER_ADMIN" }),
    );

    const counts = await restoreBackup({ backupId: 2, confirm: true });

    expect(counts).toEqual({ users: 12, patients: 340, appointments: 1250 });
    expect(mswState.systemRestoreHits[0]).toMatchObject({
      backupId: "2",
      fileName: null,
      authorization: "Bearer s-access",
    });
  });

  it("refuses an unconfirmed restore before any request (AC4)", async () => {
    const hits = mswState.systemRestoreHits.length;

    await expect(restoreBackup({ backupId: 2 })).rejects.toThrow(
      /confirmation/i,
    );
    await expect(restoreBackup({ confirm: true })).rejects.toThrow(
      /backupId or an uploaded/i,
    );

    expect(mswState.systemRestoreHits.length).toBe(hits);
  });

  it("surfaces the backend's confirmation and lookup errors", async () => {
    const unknown = await restoreBackup({
      backupId: 999,
      confirm: true,
    }).catch((caught) => caught);
    expect(unknown.status).toBe(404);
    expect(unknown.userMessage).toMatch(/Unknown backupId/);

    mswState.systemRestoreErrorMode = "corrupt";
    const corrupt = await restoreBackup({ backupId: 2, confirm: true }).catch(
      (caught) => caught,
    );
    expect(corrupt.status).toBe(400);
    expect(corrupt.userMessage).toMatch(/Checksum mismatch/);

    mswState.systemRestoreErrorMode = "forbidden";
    const forbidden = await restoreBackup({
      backupId: 2,
      confirm: true,
    }).catch((caught) => caught);
    expect(forbidden.status).toBe(403);
  });

  it("parses Content-Disposition filenames and formats sizes", () => {
    expect(
      parseContentDisposition(
        'attachment; filename="onecare-backup-20261019T101530.backup"',
      ),
    ).toBe("onecare-backup-20261019T101530.backup");
    expect(parseContentDisposition("attachment; filename=plain.backup")).toBe(
      "plain.backup",
    );
    expect(parseContentDisposition("attachment")).toBeNull();
    expect(parseContentDisposition(undefined)).toBeNull();

    expect(formatBytes(0)).toBe("—");
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(512)).toBe("0.5 KB");
    expect(formatBytes(48213)).toBe("47.1 KB");
  });
});
