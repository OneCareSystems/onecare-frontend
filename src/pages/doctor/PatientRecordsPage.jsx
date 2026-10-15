import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import Pagination from "../../components/Pagination";
import Table from "../../components/Table";
import { getPatients } from "../../services/patientService";

/** Rows per page. `GET /patients` returns the whole directory in one payload,
 *  so paging is done client-side — the backend exposes no page parameters. */
const PAGE_SIZE = 10;

const RECORDS_BASE_PATH = "/doctor/patient-records";

/**
 * Patient directory (DOC — Patient Records).
 *
 * Lists every patient the signed-in doctor can read, paged, and hands off to
 * the record view: "View More" navigates to `/doctor/patient-records/:patientId`.
 *
 * Fetch status is one of `loading | ready | failed`; a failed load keeps the
 * page on screen with a retry rather than blanking it.
 */
const PatientRecordsPage = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [status, setStatus] = useState("loading");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

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
        if (cancelled) return;
        // The envelope is already normalised by the apiClient; the directory
        // simply could not be read, so surface a retry instead of details.
        setStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Loading is set from the event handler, not the effect, so the effect only
  // ever writes from an async result. The first load starts in `loading`.
  const retry = useCallback(() => {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(patients.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visiblePatients = patients.slice(startIndex, startIndex + PAGE_SIZE);

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
          <span className="font-medium text-neutral-900">{row.fullName}</span>
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

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-6xl py-4 sm:py-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <LoadingSpinner label="Loading patients" />
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mx-auto max-w-6xl py-4 sm:py-6">
        <div className="space-y-3">
          <ErrorMessage
            title="Unable to load patients"
            message="Please check your connection and try again."
          />
          <Button onClick={retry}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl py-4 sm:py-6">
      <header className="mb-6">
         <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-pulse"></span>
            Doctor Workspace
          </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
          Patient records
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          All patients you can access. Choose View More to open a patient’s
          record.
        </p>
        <p className="mt-1 text-sm font-medium text-neutral-800">
          {patients.length} {patients.length === 1 ? "patient" : "patients"}
        </p>
      </header>

      <section aria-labelledby="patient-directory-heading">
        <h2
          id="patient-directory-heading"
          className="mb-3 text-lg font-semibold text-neutral-900"
        >
          All patients
        </h2>

        <Table
          columns={columns}
          data={visiblePatients}
          getRowKey={(row) => row.patientId}
          emptyTitle="No patients found."
          emptyMessage="There are no patient records available to you yet."
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
    </div>
  );
};

export default PatientRecordsPage;
