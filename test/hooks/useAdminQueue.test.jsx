import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../../src/services/adminWorkflowService", () => ({
  adminQueue: vi.fn(),
}));
import { adminQueue } from "../../src/services/adminWorkflowService";
import useAdminQueue from "../../src/hooks/useAdminQueue";
let hidden;
beforeEach(() => {
  hidden = false;
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  vi.useFakeTimers();
  adminQueue.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete document.hidden;
});
const tick = (ms = 0) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
const visibility = (value) =>
  act(() => {
    hidden = value;
    document.dispatchEvent(new Event("visibilitychange"));
  });

describe("ADM-06 serial visible polling", () => {
  it("refreshes within the configured cadence, resumes immediately and cleans timers", async () => {
    adminQueue
      .mockResolvedValueOnce([{ status: "SCHEDULED" }])
      .mockResolvedValue([{ status: "COMPLETED" }]);
    const { result, unmount } = renderHook(() => useAdminQueue());
    await tick();
    expect(result.current.rows[0].status).toBe("SCHEDULED");
    await tick(2000);
    expect(result.current.rows[0].status).toBe("COMPLETED");
    expect(adminQueue).toHaveBeenCalledTimes(2);
    visibility(true);
    await tick(6000);
    expect(adminQueue).toHaveBeenCalledTimes(2);
    visibility(false);
    await tick();
    expect(adminQueue).toHaveBeenCalledTimes(3);
    unmount();
    await tick(10000);
    expect(adminQueue).toHaveBeenCalledTimes(3);
  });
  it("does not overlap requests and ignores an aborted response after visibility changes", async () => {
    let release, firstSignal;
    adminQueue
      .mockImplementationOnce(({ signal }) => {
        firstSignal = signal;
        return new Promise((resolve) => {
          release = resolve;
        });
      })
      .mockResolvedValue([{ status: "ARRIVED" }]);
    const { result } = renderHook(() => useAdminQueue());
    await tick(6000);
    expect(adminQueue).toHaveBeenCalledTimes(1);
    visibility(true);
    expect(firstSignal.aborted).toBe(true);
    visibility(false);
    await tick();
    expect(adminQueue).toHaveBeenCalledTimes(1);
    await act(async () => release([{ status: "STALE" }]));
    await tick();
    expect(adminQueue).toHaveBeenCalledTimes(2);
    expect(result.current.rows[0].status).toBe("ARRIVED");
  });
  it("does not fetch when initially hidden and supports a paused mutation", async () => {
    hidden = true;
    adminQueue.mockResolvedValue([]);
    const { rerender } = renderHook(({ paused }) => useAdminQueue({ paused }), {
      initialProps: { paused: false },
    });
    await tick(4000);
    expect(adminQueue).not.toHaveBeenCalled();
    visibility(false);
    await tick();
    expect(adminQueue).toHaveBeenCalledTimes(1);
    rerender({ paused: true });
    await tick(4000);
    expect(adminQueue).toHaveBeenCalledTimes(1);
    rerender({ paused: false });
    await tick();
    expect(adminQueue).toHaveBeenCalledTimes(2);
  });
  it.each(["10", "bad", undefined])(
    "backs off 429 safely with Retry-After %s and recovers",
    async (header) => {
      adminQueue
        .mockRejectedValueOnce({
          status: 429,
          response: { headers: { "retry-after": header } },
        })
        .mockResolvedValue([{ status: "ARRIVED" }]);
      const { result } = renderHook(() => useAdminQueue());
      await tick();
      expect(result.current.error.status).toBe(429);
      const wait = header === "10" ? 10000 : 4000;
      await tick(wait - 1);
      expect(adminQueue).toHaveBeenCalledTimes(1);
      await tick(1);
      expect(result.current.error).toBeNull();
      await tick(2000);
      expect(adminQueue).toHaveBeenCalledTimes(3);
    },
  );
  it("keeps server-confirmed rows on recoverable error and allows manual refresh", async () => {
    adminQueue
      .mockResolvedValueOnce([{ status: "ARRIVED" }])
      .mockRejectedValueOnce({ status: 500 })
      .mockResolvedValue([]);
    const { result } = renderHook(() => useAdminQueue());
    await tick();
    await tick(2000);
    expect(result.current.rows[0].status).toBe("ARRIVED");
    act(() => result.current.refresh());
    await tick();
    expect(result.current.rows).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
