import { afterEach, describe, expect, it } from "vitest";

import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import {
  adaptAuditLog,
  adaptAuditLogsPageResponse,
  getAuditLogs,
} from "../../src/services/auditService";
import { mswState, resetMswState } from "../msw/handlers";

afterEach(() => {
  store.dispatch(clearSession());
  resetMswState();
});

/** The real /api/audit-logs wire entries, as served by the mock. */
const LOGIN_ENTRY = {
  logId: 2,
  userId: 1,
  username: "superadmin",
  actionType: "LOGIN",
  entityType: "AUTH",
  entityId: null,
  description: "LOGIN outcome=SUCCESS target=AuthServiceImpl.login",
  ipAddress: "0:0:0:0:0:0:0:1",
  timestamp: "2026-10-20T10:54:46",
};

describe("auditService — /api/audit-logs Spring Page contract", () => {
  it("adapts one wire entry, keeping ids and normalising case", () => {
    expect(adaptAuditLog({ ...LOGIN_ENTRY, actionType: "login" })).toEqual({
      logId: 2,
      userId: 1,
      username: "superadmin",
      actionType: "LOGIN",
      entityType: "AUTH",
      entityId: null,
      description: "LOGIN outcome=SUCCESS target=AuthServiceImpl.login",
      ipAddress: "0:0:0:0:0:0:0:1",
      timestamp: "2026-10-20T10:54:46",
    });

    // Numeric ids survive as display strings; nulls stay null.
    expect(adaptAuditLog({ logId: 5, userId: 7, entityId: 12 })).toMatchObject(
      {
        logId: 5,
        userId: 7,
        entityId: "12",
      },
    );
    expect(adaptAuditLog({ logId: 6, userId: null }).userId).toBeNull();
  });

  it("adapts the page envelope and rejects malformed payloads", () => {
    const page = adaptAuditLogsPageResponse({
      success: true,
      message: "Audit logs retrieved successfully",
      data: {
        content: [LOGIN_ENTRY],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
        first: true,
        last: true,
      },
    });

    expect(page).toMatchObject({
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
    });
    expect(page.content).toHaveLength(1);
    expect(page.content[0].logId).toBe(2);

    expect(() =>
      adaptAuditLogsPageResponse({ success: true, data: { items: [] } }),
    ).toThrow(/response format/i);
    expect(() =>
      adaptAuditLogsPageResponse({ success: false, data: { content: [] } }),
    ).toThrow(/response format/i);
  });

  it("fetches the default page through the authenticated client", async () => {
    store.dispatch(
      setSession({ accessToken: "a-access", role: "SUPER_ADMIN" }),
    );

    const result = await getAuditLogs();

    // Newest first, exactly as the backend orders the trail.
    expect(result.content.map((log) => log.logId)).toEqual([2, 1]);
    expect(result).toMatchObject({
      page: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
      first: true,
      last: true,
    });

    const hit = mswState.auditLogsHits[0];
    const url = new URL(hit.url);
    expect(url.pathname).toMatch(/\/api\/audit-logs$/);
    expect(url.searchParams.get("page")).toBe("0");
    expect(url.searchParams.get("size")).toBe("20");
    expect(hit.authorization).toBe("Bearer a-access");
  });

  it("slices server-side pages and echoes the paging metadata", async () => {
    const firstPage = await getAuditLogs({ page: 0, size: 1 });
    expect(firstPage.content.map((log) => log.logId)).toEqual([2]);
    expect(firstPage).toMatchObject({
      totalElements: 2,
      totalPages: 2,
      first: true,
      last: false,
    });

    const secondPage = await getAuditLogs({ page: 1, size: 1 });
    expect(secondPage.content.map((log) => log.logId)).toEqual([1]);
    expect(secondPage).toMatchObject({
      page: 1,
      totalPages: 2,
      first: false,
      last: true,
    });
  });

  it("surfaces server failures for the page to render", async () => {
    mswState.auditLogsErrorMode = "server-error";

    const error = await getAuditLogs().catch((caught) => caught);

    expect(error.status).toBe(500);
  });
});
