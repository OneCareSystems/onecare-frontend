import { useCallback, useEffect, useRef, useState } from "react";
import {
  CLINIC_REPORT_TIMEOUT_MS,
  getClinicReport,
} from "../services/reportService";

const initial = { report: null, loading: false, error: null };

// Latest request owns the result, even if an aborted response arrives late.
export default function useClinicReport() {
  const [state, setState] = useState(initial);
  const controller = useRef(null);
  const generation = useRef(0);
  const deadline = useRef(null);
  const invalidate = useCallback(() => {
    generation.current++;
    controller.current?.abort();
    clearTimeout(deadline.current);
    setState(initial);
  }, []);
  const generate = useCallback(async (filters) => {
    const current = ++generation.current;
    controller.current?.abort();
    clearTimeout(deadline.current);
    const request = new AbortController();
    controller.current = request;
    setState({ report: null, loading: true, error: null });
    const timer = setTimeout(() => {
      if (current !== generation.current) return;
      request.abort();
      setState({
        report: null,
        loading: false,
        error: Object.assign(new Error("Clinic report deadline exceeded"), {
          code: "ETIMEDOUT",
        }),
      });
    }, CLINIC_REPORT_TIMEOUT_MS);
    deadline.current = timer;
    try {
      const report = await getClinicReport({
        ...filters,
        signal: request.signal,
      });
      if (current === generation.current && !request.signal.aborted)
        setState({ report, loading: false, error: null });
    } catch (error) {
      if (current === generation.current && !request.signal.aborted)
        setState({ report: null, loading: false, error });
    } finally {
      clearTimeout(timer);
    }
  }, []);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
      clearTimeout(deadline.current);
    },
    [],
  );
  return { ...state, generate, invalidate };
}
