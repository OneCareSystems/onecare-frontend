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
          <span className="font-mono text-neutral-900">#{row.patientId}</span>
        ),
      },
      {
        key: "fullName",
        header: "Name",
        render: (row) => (
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700"
            >
              {String(row.fullName ?? "?")
                .charAt(0)
                .toUpperCase()}
            </span>
            <span className="font-medium text-neutral-900">{row.fullName}</span>
          </div>
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
          >
            View More
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

  return (
    <PageShell>
      <PageHeader
        title="Patient records"
        description={
          "All patients you can access. Choose View More to open a patient\u2019s record."
        }
        meta={
          status === "ready" ? (
            <p className="font-medium text-neutral-800">{countLabel}</p>
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
              <div className="relative w-full max-w-xs">
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
                  placeholder="Search by name or ID"
                  className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            }
          >
            All patients
          </SectionTitle>

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

          {totalPages > 1 && (
            <Pagination
              className="mt-4"
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </section>
      )}
    </PageShell>
  );
};

export default PatientRecordsPage;
