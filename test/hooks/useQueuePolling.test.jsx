import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import useQueuePolling, {
  QUEUE_POLL_INTERVAL_MS,
} from "../../src/hooks/useQueuePolling";

describe("useQueuePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports a ~2s configurable cadence", () => {
    expect(QUEUE_POLL_INTERVAL_MS).toBe(2000);
  });

  it("ticks at the configured interval while enabled", () => {
    const onTick = vi.fn();
    renderHook(() => useQueuePolling({ enabled: true, onTick }));

    act(() => vi.advanceTimersByTime(QUEUE_POLL_INTERVAL_MS));
    expect(onTick).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(QUEUE_POLL_INTERVAL_MS * 2));
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it("does not tick while disabled and stops after unmount", () => {
    const onTick = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ enabled }) => useQueuePolling({ enabled, onTick }),
      { initialProps: { enabled: false } },
    );

    act(() => vi.advanceTimersByTime(QUEUE_POLL_INTERVAL_MS * 3));
    expect(onTick).not.toHaveBeenCalled();

    rerender({ enabled: true });
    act(() => vi.advanceTimersByTime(QUEUE_POLL_INTERVAL_MS));
    expect(onTick).toHaveBeenCalledTimes(1);

    unmount();
    act(() => vi.advanceTimersByTime(QUEUE_POLL_INTERVAL_MS * 5));
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("honours an injected interval for tests", () => {
    const onTick = vi.fn();
    renderHook(() => useQueuePolling({ onTick, intervalMs: 50 }));

    act(() => vi.advanceTimersByTime(150));
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it("skips ticks while the tab is hidden", () => {
    const onTick = vi.fn();
    renderHook(() => useQueuePolling({ onTick, intervalMs: 50 }));

    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => vi.advanceTimersByTime(100));
    expect(onTick).not.toHaveBeenCalled();

    hidden.mockReturnValue(false);
    act(() => vi.advanceTimersByTime(100));
    expect(onTick).toHaveBeenCalledTimes(2);
    hidden.mockRestore();
  });
});
