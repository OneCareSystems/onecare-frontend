import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import Pagination from "../../components/Pagination";
import SearchBar from "../../components/SearchBar";
import Select from "../../components/Select";
import StatusBadge from "../../components/StatusBadge";
import Table from "../../components/Table";
import Toast from "../../components/Toast";
import {
  getAuditLogs,
  isAuditTrailUnavailable,
  SEVERITY_LEVELS,
} from "../../services/auditService";

/** `GET /audit-logs` returns the whole trail, so paging is client-side. */
const PAGE_SIZE = 10;

const ALL_SEVERITIES = "ALL";

/** Severity → StatusBadge variant (approved label-on-*-subtle pairs). */
const SEVERITY_BADGE_VARIANT = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "danger",
};

const SEVERITY_FILTER_OPTIONS = SEVERITY_LEVELS.map((severity) => ({
  value: severity,
  label: severity,
}));

const matchesQuery = (log, query) =>
  [log.action, log.user, log.target, log.ip].some((field) =>
    String(field ?? "").toLowerCase().includes(query),
  );

/**
 * Super-admin audit trail: an immutable, hash-chained event ledger of
 * PHI access, role alterations and auth attempts.
 *
 * Fetch status is `loading | ready | failed | unavailable`. The backend
 * endpoint is not built yet, so a 404/501 renders a friendly "not
 * connected" notice (with a check-again action) instead of an error;
 * everything else behaves like every other data screen.
 */
const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [severityFilter, setSeverityFilter] = useState(ALL_SEVERITIES);
  const [page, setPage] = useState(1);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getAuditLogs()
      .then((data) => {
        if (cancelled) return;
        setLogs(data);
        setPage(1);
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus(isAuditTrailUnavailable(error) ? "unavailable" : "failed");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }, []);

  const handleQueryChange = useCallback((value) => {
    setQuery(value);
    setPage(1);
  }, []);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        const matchesSeverity =
          severityFilter === ALL_SEVERITIES || log.severity === severityFilter;
        return (
          matchesSeverity &&
          (!normalizedQuery || matchesQuery(log, normalizedQuery))
        );
      }),
    [logs, severityFilter, normalizedQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleLogs = useMemo(
    () => filtered.slice(startIndex, startIndex + PAGE_SIZE),
    [filtered, startIndex],
  );

  /**
   * Client-side SIEM export: the filtered view is downloaded as JSON —
   * no backend needed. Swapping in a streaming endpoint later only
   * replaces this handler.
   */
  const handleExport = () => {
    if (filtered.length === 0) return;

    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            source: "onecare-audit-trail",
            count: filtered.length,
            logs: filtered,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    setToast({
      type: "success",
      message: `${filtered.length} audit ${
        filtered.length === 1 ? "entry" : "entries"
      } exported as JSON.`,
    });
  };

  const columns = useMemo(
    () => [
      {
        key: "timestamp",
        header: "Timestamp (UTC)",
        render: (row) => (
          <span className="font-mono text-xs text-neutral-900">
            {row.timestamp || "—"}
          </span>
        ),
      },
      {
        key: "user",
        header: "Principal actor",
        render: (row) => (
          <div className="min-w-0">
            <span className="block font-medium text-neutral-900">
              {row.user || "—"}
            </span>
            {row.ip && (
              <span className="block font-mono text-xs text-neutral-500">
                {row.ip}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "action",
        header: "Action event",
        render: (row) => (
          <span className="font-medium text-primary-700">
            {row.action || "—"}
          </span>
        ),
      },
      {
        key: "target",
        header: "Target resource",
        render: (row) => row.target || "—",
      },
      {
        key: "severity",
        header: "Severity",
        render: (row) => (
          <StatusBadge
            status={SEVERITY_BADGE_VARIANT[row.severity] ?? "neutral"}
          >
            {row.severity || "—"}
          </StatusBadge>
        ),
      },
      {
        key: "hash",
        header: "Integrity hash",
        render: (row) => (
          <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700">
            {row.hash || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  const total = logs.length;
  const isFiltering =
    Boolean(normalizedQuery) || severityFilter !== ALL_SEVERITIES;
  const countLabel = isFiltering
    ? `${filtered.length} of ${total} audit ${total === 1 ? "entry" : "entries"}`
    : `${total} audit ${total === 1 ? "entry" : "entries"}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header — immutable security-trail framing + SIEM export */}
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary-700">
            Immutable security trail
          </span>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
            System audit logs
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Cryptographically chained event ledger monitoring PHI access,
            role alterations, and auth attempts.
          </p>
          {status === "ready" && (
            <p className="mt-2 text-sm font-medium text-neutral-800">
              {countLabel}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          onClick={handleExport}
          disabled={status !== "ready" || filtered.length === 0}
          title={
            filtered.length === 0
              ? "No entries to export"
              : "Download the filtered view as JSON"
          }
          className="inline-flex shrink-0 items-center gap-2"
        >
          <Icon name="download" className="h-4 w-4 text-secondary-700" />
          Export SIEM logs
        </Button>
      </div>

      {/* Search + severity filter */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            placeholder="Search action event, target resource, user, or IP address..."
            searchLabel="Search audit logs"
            className="w-full sm:max-w-xl"
          />

          <Select
            id="severity-filter"
            name="severity-filter"
            label="Severity"
            options={SEVERITY_FILTER_OPTIONS}
            placeholder="All severities"
            defaultValue=""
            onChange={(event) => {
              setSeverityFilter(event.target.value || ALL_SEVERITIES);
              setPage(1);
            }}
            className="w-full sm:w-48"
          />
        </div>
      </div>

      {/* Event ledger */}
      {status === "loading" ? (
        <div
          role="status"
          aria-label="Loading audit trail"
          aria-busy="true"
          className="motion-safe:animate-pulse space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs"
        >
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-4 rounded bg-neutral-100"
              style={{ width: `${Math.max(40, 92 - index * 10)}%` }}
            />
          ))}
        </div>
      ) : status === "unavailable" ? (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <EmptyState
            title="Audit service not connected yet"
            message="The audit-log endpoint is not available in this environment. Entries from the security trail will appear here automatically as soon as it goes live."
            action={
              <Button
                variant="outline"
                onClick={retry}
                className="inline-flex items-center gap-2"
              >
                <Icon name="refresh" className="h-4 w-4" />
                Check again
              </Button>
            }
          />
        </div>
      ) : status === "failed" ? (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
          <ErrorMessage
            title="Unable to load audit logs"
            message="Please check your connection and try again."
          />
          <Button onClick={retry} className="inline-flex items-center gap-2">
            <Icon name="refresh" className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <section aria-labelledby="audit-trail-heading">
          <h2
            id="audit-trail-heading"
            className="mb-3 text-base font-semibold text-neutral-900"
          >
            Event ledger
          </h2>

          <Table
            columns={columns}
            data={visibleLogs}
            getRowKey={(row) => row.id}
            emptyTitle="No audit entries found."
            emptyMessage={
              isFiltering
                ? "No entries match the current filters. Try a different search or severity."
                : "The security trail has not recorded any events yet."
            }
            label="Audit trail event ledger"
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={6000}
          className="fixed bottom-4 right-4 z-50 max-w-sm shadow-lg"
        />
      )}
    </div>
  );
};

export default AuditLogsPage;
