import { useEffect } from "react";

/**
 * Polling cadence for the doctor's schedule queue (~2s per the ticket).
 * Named and exported so the interval is configurable in one place, and
 * injectable per-call (`intervalMs`) so tests can shorten it.
 */
export const QUEUE_POLL_INTERVAL_MS = 2000;

/**
 * Calls `onTick` every `intervalMs` while `enabled`. Ticks are skipped while
 * the tab is hidden (no background requests); polling resumes automatically
 * because the interval keeps running. The interval is cleaned up on unmount
 * or whenever `enabled`/`onTick` change.
 */
const useQueuePolling = ({
  enabled = true,
  onTick,
  intervalMs = QUEUE_POLL_INTERVAL_MS,
}) => {
  useEffect(() => {
    if (!enabled || typeof onTick !== "function") return undefined;

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      onTick();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [enabled, onTick, intervalMs]);
};

export default useQueuePolling;
