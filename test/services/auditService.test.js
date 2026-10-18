import { afterEach, describe, expect, it } from "vitest";

import {
  adaptAuditLogsResponse,
  getAuditLogs,
  isAuditTrailUnavailable,
} from "../../src/services/auditService";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { mswState, resetMswState } from "../msw/handlers";

afterEach(() => {
  store.dispatch(clearSession());
  resetMswState();
});

describe("auditService — immutable security trail", () => {
  it("adapts the trail, normalises fields and skips records without an id", () => {
    expect(
      adaptAuditLogsResponse({
        success: true,
        message: "Audit logs retrieved successfully",
        data: [
          {
            id: "LOG-1042",
            timestamp: "2026-10-18T09:12:44Z",
            user: "Dr. Sterling",
            ip: "10.0.4.21",
            action: "PHI_RECORD_VIEWED",
            target: "PATIENT-88",
            severity: "warning",
            hash: "3f9c1a7e5b2d8f40",
          },
          {
            eventId: 77,
            createdAt: "2026-10-17T22:03:01Z",
            actor: "root",
            ip_address: "192.168.1.9",
            event: "LOGIN_FAILED",
            resource: "/auth/login",
            severity: "critical",
            integrity_hash: "be44d1",
          },
          { action: "NO_ID" },
          null,
        ],
      }),
    ).toEqual([
      {
        id: "LOG-1042",
        timestamp: "2026-10-18T09:12:44Z",
        user: "Dr. Sterling",
        ip: "10.0.4.21",
        action: "PHI_RECORD_VIEWED",
        target: "PATIENT-88",
        severity: "WARNING",
        hash: "3f9c1a7e5b2d8f40",
      },
      {
        id: 77,
        timestamp: "2026-10-17T22:03:01Z",
        user: "root",
        ip: "192.168.1.9",
        action: "LOGIN_FAILED",
        target: "/auth/login",
        severity: "CRITICAL",
        hash: "be44d1",
      },
    ]);

    expect(() =>
      adaptAuditLogsResponse({ success: true, data: { items: [] } }),
    ).toThrow(/response format/i);
    expect(() =>
      adaptAuditLogsResponse({ success: false, data: [] }),
    ).toThrow(/response format/i);
  });

  it("fetches the trail through the authenticated client", async () => {
    store.dispatch(
      setSession({ accessToken: "a-access", role: "SUPER_ADMIN" }),
    );
    mswState.auditLogsResponses = [
      [
        {
          id: "LOG-1",
          timestamp: "2026-10-18T10:00:00Z",
          user: "Marcus Vance",
          action: "ROLE_PERMISSION_ALTERED",
          target: "USR-4",
          severity: "INFO",
        },
      ],
    ];

    const logs = await getAuditLogs();

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      id: "LOG-1",
      action: "ROLE_PERMISSION_ALTERED",
      severity: "INFO",
    });
    expect(new URL(mswState.auditLogsHits[0].url).pathname).toMatch(
      /\/api\/audit-logs$/,
    );
    expect(mswState.auditLogsHits[0].authorization).toBe(
      "Bearer a-access",
    );
  });

  it("reports a missing backend endpoint as unavailable, not a failure", async () => {
    mswState.auditLogsErrorMode = "not-implemented";

    const error = await getAuditLogs().catch((caught) => caught);

    expect(error.status).toBe(404);
    expect(isAuditTrailUnavailable(error)).toBe(true);
  });

  it("treats server and transport errors as retryable failures", () => {
    expect(isAuditTrailUnavailable({ status: 500 })).toBe(false);
    expect(isAuditTrailUnavailable({ status: null })).toBe(false);
    expect(isAuditTrailUnavailable(undefined)).toBe(false);
    expect(isAuditTrailUnavailable({ response: { status: 403 } })).toBe(
      false,
    );
  });

  it("propagates trail failures for callers to surface", async () => {
    mswState.auditLogsErrorMode = "server-error";
    await expect(getAuditLogs()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
