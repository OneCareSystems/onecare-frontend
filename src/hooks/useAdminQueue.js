import { useCallback, useEffect, useRef, useState } from "react";
import { adminQueue } from "../services/adminWorkflowService";

export default function useAdminQueue({
  paused = false,
  intervalMs = 2000,
} = {}) {
  const [state, setState] = useState({ rows: [], loading: true, error: null });
  const [revision, setRevision] = useState(0);
  const owner = useRef(0);
  useEffect(() => {
    const epoch = ++owner.current;
    let mounted = true,
      timer,
      controller,
      running = false,
      queued = false,
      backoff = intervalMs;
    const visible = () => !document.hidden;
    const load = async () => {
      clearTimeout(timer);
      if (!mounted || paused || !visible()) return;
      if (running) {
        queued = true;
        return;
      }
      running = true;
      controller = new AbortController();
      try {
        const rows = await adminQueue({ signal: controller.signal });
        if (
          mounted &&
          owner.current === epoch &&
          visible() &&
          !controller.signal.aborted
        ) {
          setState({ rows, loading: false, error: null });
          backoff = intervalMs;
        }
      } catch (error) {
        if (
          mounted &&
          owner.current === epoch &&
          visible() &&
          !controller.signal.aborted
        ) {
          setState((previous) => ({ ...previous, loading: false, error }));
          if ((error.status ?? error.response?.status) === 429) {
            const value = error.response?.headers?.["retry-after"];
            const seconds = Number(value);
            const retry =
              value && Number.isFinite(seconds)
                ? seconds * 1000
                : value
                  ? Date.parse(value) - Date.now()
                  : 0;
            backoff = Math.min(
              60000,
              Math.max(
                intervalMs * 2,
                backoff * 2,
                Number.isFinite(retry) ? retry : 0,
              ),
            );
          } else backoff = Math.min(30000, Math.max(intervalMs, backoff * 2));
        }
      } finally {
        running = false;
        if (mounted && !paused && visible()) {
          const delay = queued ? 0 : backoff;
          queued = false;
          timer = setTimeout(load, delay);
        }
      }
    };
    const visibility = () => {
      clearTimeout(timer);
      if (!visible()) controller?.abort();
      else load();
    };
    document.addEventListener("visibilitychange", visibility);
    load();
    return () => {
      mounted = false;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [paused, intervalMs, revision]);
  const refresh = useCallback(() => setRevision((key) => key + 1), []);
  return { ...state, refresh };
}
