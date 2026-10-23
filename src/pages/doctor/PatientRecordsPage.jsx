import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button";
import Icon from "../../components/Icon";
import Pagination from "../../components/Pagination";
import Table from "../../components/Table";
import { PageHeader, PageShell } from "../../components/doctor/PageLayout";
import {
  ErrorPanel,
  SectionTitle,
  SkeletonBlock,
} from "../../components/doctor/Panel";
import PatientAvatarCell from "../../features/doctor/PatientAvatarCell";
import { getPatients } from "../../services/patientService";

/** `GET /patients` returns the whole directory, so paging is client-side. */
const PAGE_SIZE = 10;
const RECORDS_BASE_PATH = "/doctor/patient-records";

const matchesQuery = (patient, query) =>
  String(patient.fullName ?? "")
    .toLowerCase()
    .includes(query) || String(patient.patientId).includes(query);

/**
 * Patient directory: search, page and open a record. Fetch status is
 * `loading | ready | failed`; a failed load keeps the page on screen with a
 * retry instead of blanking it.
 */
const PatientRecordsPage = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [status, setStatus] = useState("loading");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;

    getPatients()
      .then((data) => {
        if (cancelled) return;
        setPatients(data);
        setPage(1);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }, []);

  const handleQueryChange = useCallback((event) => {
    setQuery(event.target.value);
    setPage(1);
  }, []);

  const clearQuery = useCallback(() => {
    setQuery("");
    setPage(1);
  }, []);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      normalizedQuery
        ? patients.filter((patient) => matchesQuery(patient, normalizedQuery))
        : patients,
    [patients, normalizedQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visiblePatients = useMemo(
    () => filtered.slice(startIndex, startIndex + PAGE_SIZE),
    [filtered, startIndex],
  );

  const columns = useMemo(
    () => [
      {
        key: "patientId",
        header: "Patient ID",
        render: (row) => (
          <span className="inline-flex items-center rounded-lg bg-neutral-100 px-2 py-0.5 font-mono text-xs font-medium text-neutral-700">
            #{row.patientId}
          </span>
        ),
      },
      {
        key: "fullName",
        header: "Name",
        render: (row) => (
          <PatientAvatarCell name={row.fullName} subtitle="Patient record" />
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`${RECORDS_BASE_PATH}/${row.patientId}`)}
            className="inline-flex items-center gap-1.5"
          >
            View More
            <Icon name="arrow-right" className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [navigate],
  );

  const total = patients.length;
  const countLabel = normalizedQuery
    ? `${filtered.length} of ${total} patients`
    : `${total} ${total === 1 ? "patient" : "patients"}`;

  const rangeStart = filtered.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + PAGE_SIZE, filtered.length);

  return (
    <PageShell>
      <PageHeader
        title="Patient records"
        description="All patients you can access. Choose View More to open a patient's record."
        meta={
          status === "ready" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
              <Icon name="users" className="h-3 w-3 text-neutral-500" />
              {countLabel}
            </span>
          ) : null
        }
      />

      {status === "loading" ? (
        <SkeletonBlock label="Loading patients" rows={6} />
      ) : status === "failed" ? (
        <ErrorPanel
          title="Unable to load patients"
          message="Please check your connection and try again."
          actionLabel="Retry"
          onAction={retry}
        />
      ) : (
        <section aria-labelledby="patient-directory-heading">
          <SectionTitle
            id="patient-directory-heading"
            aside={
              <div className="relative w-full max-w-sm">
                <label htmlFor="patient-search" className="sr-only">
                  Search patients
                </label>
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                />
                <input
                  id="patient-search"
                  type="search"
                  value={query}
                  onChange={handleQueryChange}
                  placeholder="Search by name or ID…"
                  className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-9 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    onClick={clearQuery}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-primary-600"
                  >
                    <Icon name="x" className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            }
          >
            <span className="inline-flex items-center gap-2">
              <Icon name="users" className="h-4 w-4 text-neutral-400" />
              All patients
            </span>
          </SectionTitle>

          {normalizedQuery && (
            <div className="mb-3 flex items-center gap-2 text-xs text-neutral-500">
              <span>
                Showing results for{" "}
                <span className="font-semibold text-neutral-800">
                  "{deferredQuery.trim()}"
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={clearQuery}
                className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
              >
                Clear search
              </button>
            </div>
          )}

          <Table
            columns={columns}
            data={visiblePatients}
            getRowKey={(row) => row.patientId}
            emptyTitle="No patients found."
            emptyMessage={
              normalizedQuery
                ? "No patients match your search. Try a different name or ID."
                : "There are no patient records available to you yet."
            }
            label="All patients"
          />

          {filtered.length > 0 && (
            <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-xs text-neutral-500">
                Showing{" "}
                <span className="font-semibold tabular-nums text-neutral-800">
                  {rangeStart}–{rangeEnd}
                </span>{" "}
                of{" "}
                <span className="font-semibold tabular-nums text-neutral-800">
                  {filtered.length}
                </span>{" "}
                {filtered.length === 1 ? "patient" : "patients"}
              </p>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
            </div>
          )}
        </section>
      )}
    </PageShell>
  );
};

export default PatientRecordsPage;
