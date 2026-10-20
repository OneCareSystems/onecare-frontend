import { useEffect, useId, useState } from "react";
import Button from "./Button";
import SearchBar from "./SearchBar";
import Select from "./Select";
import Table from "./Table";
import EmptyState from "./EmptyState";
import ErrorMessage from "./ErrorMessage";
import LoadingSpinner from "./LoadingSpinner";
import { searchPatients } from "../services/patientService";
import {
  normalizePatientSearch,
  patientErrorMessage,
  validatePatientSearch,
} from "../utils/patientSearch";

export default function PatientSearch({
  onSelect,
  onSearchChange,
  registerAction,
  refreshKey = 0,
  pageSize = 10,
  debounceMs = 350,
  selectedId,
}) {
  const [query, setQuery] = useState({
    text: "",
    mode: "name",
    page: 0,
    attempt: 0,
    immediate: false,
  });
  const [result, setResult] = useState({
    key: "",
    rows: [],
    status: "idle",
    message: "",
  });
  const term = normalizePatientSearch(query.text, query.mode);
  const validation = validatePatientSearch(query.text, query.mode);
  const validationId = useId();
  const key = JSON.stringify([
    term,
    query.mode,
    query.page,
    query.attempt,
    refreshKey,
    pageSize,
  ]);
  useEffect(() => {
    if (!term || validation) return;
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(
      async () => {
        setResult({ key, rows: [], status: "loading", message: "" });
        try {
          const rows = await searchPatients({
            search: term,
            page: query.page,
            size: pageSize,
            signal: controller.signal,
          });
          if (current) setResult({ key, rows, status: "ready", message: "" });
        } catch (error) {
          if (current)
            setResult({
              key,
              rows: [],
              status: "error",
              message: patientErrorMessage(error, "search"),
            });
        }
      },
      query.immediate || query.page > 0 ? 0 : debounceMs,
    );
    return () => {
      current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    key,
    term,
    validation,
    query.page,
    query.immediate,
    pageSize,
    debounceMs,
  ]);
  const change = (changes) => {
    setQuery((previous) => ({
      ...previous,
      ...changes,
      attempt: previous.attempt + 1,
      page: 0,
      immediate: false,
    }));
    onSearchChange?.();
  };
  const ready =
    term && !validation && result.key === key && result.status === "ready";
  const error =
    term && !validation && result.key === key && result.status === "error";
  const busy = Boolean(term && !validation && !ready && !error);
  return (
    <section
      aria-label="Patient search"
      className="min-w-0 space-y-4 rounded-xl border border-primary-100 bg-neutral-0/70 p-4 shadow-sm"
    >
      <Select
        name="patient-search-mode"
        label="Search by"
        showPlaceholder={false}
        value={query.mode}
        onChange={(event) => change({ mode: event.target.value, text: "" })}
        options={[
          { value: "name", label: "Name" },
          { value: "phone", label: "Phone number" },
          { value: "id", label: "Clinic ID" },
        ]}
      />
      <SearchBar
        value={query.text}
        error={validation}
        errorId={validationId}
        inputMode={
          query.mode === "id"
            ? "numeric"
            : query.mode === "phone"
              ? "tel"
              : "text"
        }
        onChange={(text) => change({ text })}
        onSearch={() => {
          if (validation) return;
          setQuery((previous) => ({
            ...previous,
            page: 0,
            immediate: true,
            attempt: previous.attempt + 1,
          }));
        }}
        searchLabel="Search patients"
        placeholder={
          query.mode === "name"
            ? "Enter a patient name…"
            : query.mode === "phone"
              ? "Enter a phone number…"
              : "Enter a numeric clinic ID…"
        }
      />
      {validation && (
        <div id={validationId}>
          <ErrorMessage message={validation} />
        </div>
      )}
      {!term && (
        <EmptyState
          title="Find a patient"
          message="Enter a name, phone number or clinic ID to begin."
        />
      )}
      {busy && <LoadingSpinner label="Searching patients" />}
      {error && <ErrorMessage message={result.message} />}
      {ready && result.rows.length === 0 && (
        <EmptyState
          title={
            query.page === 0
              ? "No patient found matching the search criteria."
              : "No more matches on this page."
          }
          message={
            query.page === 0
              ? "Try another search or register a new patient."
              : "Return to the previous page to see earlier matches."
          }
          action={query.page === 0 ? registerAction : undefined}
        />
      )}
      {ready && result.rows.length > 0 && (
        <Table
          label="Patient search results"
          getRowKey={(row) => row.patientId}
          data={result.rows}
          columns={[
            { key: "patientId", header: "Patient ID" },
            { key: "fullName", header: "Name" },
            { key: "contactNo", header: "Phone" },
            { key: "dateOfBirth", header: "Date of Birth" },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <Button
                  variant="primary"
                  className="bg-primary-800 hover:bg-primary-900"
                  size="sm"
                  aria-label={`Edit patient ${row.patientId}`}
                  aria-pressed={String(row.patientId) === String(selectedId)}
                  onClick={() => onSelect(row.patientId)}
                >
                  Edit
                </Button>
              ),
            },
          ]}
        />
      )}
      {term && !validation && (
        <nav
          aria-label="Search result pages"
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <Button
            variant="outline"
            disabled={busy || query.page === 0}
            onClick={() =>
              setQuery((previous) => ({
                ...previous,
                page: previous.page - 1,
                immediate: true,
              }))
            }
          >
            Previous
          </Button>
          <span className="text-sm">Page {query.page + 1}</span>
          <Button
            variant="outline"
            disabled={!ready || result.rows.length < pageSize}
            onClick={() =>
              setQuery((previous) => ({
                ...previous,
                page: previous.page + 1,
                immediate: true,
              }))
            }
          >
            Check next page
          </Button>
        </nav>
      )}
    </section>
  );
}
