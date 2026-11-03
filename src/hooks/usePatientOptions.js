import { useEffect, useState } from "react";
import { searchPatients } from "../services/patientService";
import {
  normalizePatientSearch,
  patientErrorMessage,
  validatePatientSearch,
} from "../utils/patientSearch";

export default function usePatientOptions({
  open,
  query,
  mode = "all",
  page,
  debounceMs = 350,
}) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: "", rows: [], error: "" });
  // Keep an all-digit query literal: the backend searches exact clinic ID and
  // phone variants together. Normalizing it as a phone could hide a long ID.
  const searchMode =
    mode === "all" && /^[1-9]\d*$/.test(query.trim()) ? "id" : mode;
  const term = normalizePatientSearch(query, searchMode);
  const validation = validatePatientSearch(query, mode);
  const key = JSON.stringify([term, mode, page, attempt]);
  useEffect(() => {
    if (!open || validation) return;
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(
      async () => {
        try {
          const rows = await searchPatients({
            search: term || undefined,
            page,
            size: 10,
            signal: controller.signal,
          });
          if (current) setResult({ key, rows, error: "" });
        } catch (error) {
          if (current)
            setResult({
              key,
              rows: [],
              error: patientErrorMessage(error, "search"),
            });
        }
      },
      term && page === 0 ? debounceMs : 0,
    );
    return () => {
      current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, term, mode, page, key, validation, debounceMs]);
  // Hide results immediately when query/page changes, before the effect runs.
  const ready = open && !validation && result.key === key;
  return {
    rows: ready ? result.rows : [],
    loading: open && !validation && !ready,
    error: validation || (ready ? result.error : ""),
    retry: () => setAttempt((value) => value + 1),
  };
}
