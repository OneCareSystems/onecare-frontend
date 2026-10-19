import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";

import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import Pagination from "../../components/Pagination";
import SearchBar from "../../components/SearchBar";
import Select from "../../components/Select";
import StatCard from "../../components/StatCard";
import StatusBadge from "../../components/StatusBadge";
import Table from "../../components/Table";
import Toast from "../../components/Toast";
import {
  getAuditLogs,
  isAuditTrailUnavailable,
  SEVERITY_LEVELS,
} from "../../services/auditService";

const PAGE_SIZE = 10;
const ALL_SEVERITIES = "ALL";

const SEVERITY_BADGE_VARIANT = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "danger",
};

const SEVERITY_FILTER_OPTIONS = [
  { value: ALL_SEVERITIES, label: "All Severities" },
  ...SEVERITY_LEVELS.map((severity) => ({
    value: severity,
    label: severity,
  })),
];

/**
 * Principal actor details renderer (Memoized)
 */
const PrincipalActorCell = memo(({ user, ip }) => (
  <div className="min-w-0 py-1">
    <span className="block font-medium text-neutral-900 truncate">
      {user || "—"}
    </span>
    {ip && (
      <span className="block font-mono text-xs text-neutral-500 truncate">
        {ip}
      </span>
    )}
  </div>
));
PrincipalActorCell.displayName = "PrincipalActorCell";

/**
 * Copyable Hash Cell component for security verification (Memoized)
 */
const IntegrityHashCell = memo(({ hash, onCopy }) => {
  if (!hash) return <span className="text-neutral-400">—</span>;

  const truncatedHash =
    hash.length > 16 ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash;

  return (
    <button
      type="button"
      onClick={() => onCopy(hash)}
      title={`Click to copy full hash: ${hash}`}
      className="group inline-flex items-center gap-1.5 rounded-md bg-neutral-100 hover:bg-neutral-200 px-2 py-1 font-mono text-xs text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <span>{truncatedHash}</span>
      <Icon
        name="copy"
        className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500"
      />
    </button>
  );
});
IntegrityHashCell.displayName = "IntegrityHashCell";

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [severityFilter, setSeverityFilter] = useState(ALL_SEVERITIES);
  const [page, setPage] = useState(1);

  const [toast, setToast] = useState(null);
  const searchInputRef = useRef(null);

  // Keyboard shortcut Ctrl/Cmd + F for search autofocus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch audit logs with unmount protection
  useEffect(() => {
    let cancelled = false;

    getAuditLogs()
      .then((data) => {
        if (cancelled) return;
        setLogs(data || []);
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

  const handleCopyHash = useCallback((hash) => {
    navigator.clipboard.writeText(hash);
    setToast({
      type: "success",
      message: "Integrity hash signature copied to clipboard.",
    });
  }, []);

  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSeverity =
        severityFilter === ALL_SEVERITIES || log.severity === severityFilter;

      const matchesSearch =
        !normalizedQuery ||
        [log.action, log.user, log.target, log.ip, log.hash].some((field) =>
          String(field ?? "")
            .toLowerCase()
            .includes(normalizedQuery)
        );

      return matchesSeverity && matchesSearch;
    });
  }, [logs, severityFilter, normalizedQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const visibleLogs = useMemo(
    () => filteredLogs.slice(startIndex, startIndex + PAGE_SIZE),
    [filteredLogs, startIndex]
  );

  // Ledger summary statistics
  const metrics = useMemo(() => {
    const total = logs.length;
    const criticals = logs.filter((l) => l.severity === "CRITICAL").length;
    const uniqueUsers = new Set(logs.map((l) => l.user).filter(Boolean)).size;
    return { total, criticals, uniqueUsers };
  }, [logs]);

  const columns = useMemo(
    () => [
      {
        key: "timestamp",
        header: "Timestamp (UTC)",
        render: (row) => (
          <span className="font-mono text-xs text-neutral-900 whitespace-nowrap">
            {row.timestamp || "—"}
          </span>
        ),
      },
      {
        key: "user",
        header: "Principal Actor",
        render: (row) => <PrincipalActorCell user={row.user} ip={row.ip} />,
      },
      {
        key: "action",
        header: "Action Event",
        render: (row) => (
          <span className="font-semibold text-primary-700 font-mono text-xs">
            {row.action || "—"}
          </span>
        ),
      },
      {
        key: "target",
        header: "Target Resource",
        render: (row) => (
          <span className="text-neutral-800 text-xs font-medium">
            {row.target || "—"}
          </span>
        ),
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
        header: "Integrity Hash",
        render: (row) => (
          <IntegrityHashCell hash={row.hash} onCopy={handleCopyHash} />
        ),
      },
    ],
    [handleCopyHash]
  );

  const isFiltering =
    Boolean(normalizedQuery) || severityFilter !== ALL_SEVERITIES;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Summary Stat Counters */}
      {status === "ready" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Trail Events"
            value={`${metrics.total} Logged`}
            chip="Immutable"
            icon="shield-check"
            iconClass="bg-primary-50 text-primary-700"
            chipClass="bg-primary-100 text-primary-800"
          />
          <StatCard
            label="Critical Alerts"
            value={`${metrics.criticals} Recorded`}
            chip="Audited"
            icon="alert-triangle"
            iconClass="bg-danger-50 text-danger-700"
            chipClass="bg-danger-100 text-danger-800"
          />
          <StatCard
            label="Active Principal Actors"
            value={`${metrics.uniqueUsers} Users`}
            chip="Identity"
            icon="users"
            iconClass="bg-teal-50 text-teal-700"
            chipClass="bg-teal-100 text-teal-800"
          />
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBar
            ref={searchInputRef}
            value={query}
            onChange={handleQueryChange}
            placeholder="Search event, target, principal user, IP, or hash... (⌘F)"
            searchLabel="Search audit logs"
            className="w-full sm:max-w-xl"
          />

          <div className="flex items-center gap-3">
            <Select
              id="severity-filter"
              name="severity-filter"
              label="Severity"
              options={SEVERITY_FILTER_OPTIONS}
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value || ALL_SEVERITIES);
                setPage(1);
              }}
              className="w-full sm:w-48"
            />

            {isFiltering && (
              <Button
                variant="tertiary"
                onClick={() => {
                  setQuery("");
                  setSeverityFilter(ALL_SEVERITIES);
                  setPage(1);
                }}
                className="mt-6 sm:mt-0 text-xs text-neutral-500 hover:text-neutral-800"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Ledger Event Content */}
      {status === "loading" ? (
        <div
          role="status"
          aria-label="Loading audit trail"
          className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs animate-pulse"
        >
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="flex gap-4 items-center">
              <div className="h-4 w-1/6 rounded bg-neutral-100" />
              <div className="h-4 w-1/4 rounded bg-neutral-100" />
              <div className="h-4 w-1/4 rounded bg-neutral-100" />
              <div className="h-4 w-1/6 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : status === "unavailable" ? (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <EmptyState
            title="Audit trail service not connected"
            message="The SIEM immutable audit-log endpoint is currently inactive or unreachable in this environment."
            action={
              <Button
                variant="outline"
                onClick={retry}
                className="inline-flex items-center gap-2"
              >
                <Icon name="refresh" className="h-4 w-4" />
                Check Service Status
              </Button>
            }
          />
        </div>
      ) : status === "failed" ? (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs text-center">
          <ErrorMessage
            title="Unable to load security audit trail"
            message="We could not establish a connection to the audit service. Please try again later."
          />
          <Button onClick={retry} className="inline-flex items-center gap-2 mt-2">
            <Icon name="refresh" className="h-4 w-4" />
            Retry Connection
          </Button>
        </div>
      ) : (
        <section aria-labelledby="audit-trail-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="audit-trail-heading"
              className="text-base font-semibold text-neutral-900"
            >
              Event Ledger ({filteredLogs.length})
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
            <Table
              columns={columns}
              data={visibleLogs}
              getRowKey={(row) => row.id}
              emptyTitle="No audit entries found"
              emptyMessage={
                isFiltering
                  ? "No ledger entries match the specified search or severity criteria."
                  : "The security audit trail has not recorded any system events yet."
              }
              label="Audit trail event ledger"
            />
          </div>

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

      {/* Global Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
          className="fixed bottom-4 right-4 z-50 max-w-sm shadow-xl"
        />
      )}
    </div>
  );
};

export default AuditLogsPage;