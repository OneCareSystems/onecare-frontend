import { afterEach, describe, expect, it } from "vitest";

import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import {
  adaptBackupListResponse,
  adaptBackupRecord,
  createBackup,
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

describe("systemBackupService — backup & restore", () => {
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

    expect(() => adaptBackupListResponse({ success: false, data: [] })).toThrow(
      /list response/i,
    );
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
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(48213)).toBe("47.1 KB");
  });
});
