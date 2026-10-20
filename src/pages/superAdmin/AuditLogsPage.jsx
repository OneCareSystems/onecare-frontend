import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Button from "../../components/Button";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import Pagination from "../../components/Pagination";
import SearchBar from "../../components/SearchBar";
import Select from "../../components/Select";
import StatCard from "../../components/StatCard";
import Table from "../../components/Table";
import { DEFAULT_PAGE_SIZE, getAuditLogs } from "../../services/auditService";

const ALL_ACTIONS = "ALL";

/** Principal actor details renderer (memoized). */
const PrincipalActorCell = memo(({ username, ipAddress }) => (
  <div className="min-w-0 py-1">
    <span className="block truncate font-medium text-neutral-900">
      {username || "—"}
    </span>
    {ipAddress && (
      <span className="block truncate font-mono text-xs text-neutral-500">
        {ipAddress}
      </span>
    )}
  </div>
));
PrincipalActorCell.displayName = "PrincipalActorCell";

/**
 * Super-admin audit trail (/api/audit-logs, Spring `Page` contract).
 *
 * Pagination is server-driven (?page=&size=, 0-based page). The backend
 * exposes no filtering parameters, so the search box and the action
 * dropdown filter the rows of the loaded page client-side — the hint
 * under the filter bar says exactly that. Timestamps render as the
 * server sends them (no zone offset on the wire, so none is claimed).
 */
const AuditLogsPage = () => {
  /** Server page: { content, page, size, totalElements, totalPages, … } */
  const [pageData, setPageData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);
  /** 1-based UI page number (Spring pages are 0-based on the wire). */
  const [page, setPage] = useState(1);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [actionFilter, setActionFilter] = useState(ALL_ACTIONS);

  const searchInputRef = useRef(null);

  // Ctrl/Cmd + F focuses the search input.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch one server page (unmount-safe).
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    getAuditLogs({ page: page - 1, size: DEFAULT_PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setPageData(result);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  const retry = useCallback(() => {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }, []);

  const handleQueryChange = useCallback((value) => {
    setQuery(value);
  }, []);

  const logs = pageData?.content ?? [];
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  // Client-side filtering over the loaded page only.
  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        const matchesAction =
          actionFilter === ALL_ACTIONS || log.actionType === actionFilter;
        const matchesSearch =
          !normalizedQuery ||
          [
            log.username,
            log.actionType,
            log.entityType,
            log.entityId,
            log.description,
            log.ipAddress,
            log.logId,
          ].some((field) =>
            String(field ?? "").toLowerCase().includes(normalizedQuery),
          );
        return matchesAction && matchesSearch;
      }),
    [logs, actionFilter, normalizedQuery],
  );

  // Action options come from the rows actually loaded on this page.
  const actionOptions = useMemo(() => {
    const actions = [
      ...new Set(logs.map((log) => log.actionType).filter(Boolean)),
    ].sort();
    return [
      { value: ALL_ACTIONS, label: "All Actions" },
      ...actions.map((action) => ({ value: action, label: action })),
    ];
  }, [logs]);

  // Unique principals on the loaded page.
  const uniqueUsers = useMemo(
    () => new Set(logs.map((log) => log.username).filter(Boolean)).size,
    [logs],
  );

  const totalPages = pageData?.totalPages ?? 1;
  const totalElements = pageData?.totalElements ?? 0;
  const isFiltering = Boolean(normalizedQuery) || actionFilter !== ALL_ACTIONS;

  const columns = useMemo(
    () => [
      {
        key: "logId",
        header: "Log ID / Time",
        render: (row) => (
          <div className="min-w-0 whitespace-normal">
            <span className="block font-mono text-xs font-semibold text-neutral-900">
              #{row.logId}
            </span>
            <span className="mt-0.5 block text-xs text-neutral-500">
              {row.timestamp.replace("T", " ")}
            </span>
          </div>
        ),
      },
      {
        key: "username",
        header: "Principal Actor",
        render: (row) => (
          <PrincipalActorCell
            username={row.username}
            ipAddress={row.ipAddress}
          />
        ),
      },
      {
        key: "actionType",
        header: "Action",
        render: (row) => (
          <span className="font-mono text-xs font-semibold text-primary-700">
            {row.actionType || "—"}
          </span>
        ),
      },
      {
        key: "entity",
        header: "Entity",
        render: (row) => (
          <div className="min-w-0 whitespace-normal">
            <span className="block text-xs font-medium text-neutral-800">
              {row.entityType || "—"}
            </span>
            {row.entityId && (
              <span className="mt-0.5 block font-mono text-xs text-neutral-500">
                #{row.entityId}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "description",
        header: "Description",
        render: (row) => (
          <span className="block max-w-md whitespace-normal text-xs leading-relaxed text-neutral-600">
            {row.description || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Summary counters (server totals + current-page facts) */}
      {status === "ready" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Trail Events"
            value={`${totalElements} Logged`}
            chip="All pages"
            icon="activity"
            iconClass="bg-primary-50 text-primary-700"
            chipClass="bg-primary-100 text-primary-800"
          />
          <StatCard
            label="This Page"
            value={`${logs.length} Entries`}
            chip={`Page ${page} of ${totalPages}`}
            icon="inbox"
            iconClass="bg-secondary-50 text-secondary-700"
            chipClass="bg-secondary-100 text-secondary-800"
          />
          <StatCard
            label="Principal Actors"
            value={`${uniqueUsers} Users`}
            chip="On this page"
            icon="users"
            iconClass="bg-teal-50 text-teal-700"
            chipClass="bg-teal-100 text-teal-800"
          />
        </div>
      )}

      {/* Filter bar — search & action filter cover the loaded page only */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBar
            ref={searchInputRef}
            value={query}
            onChange={handleQueryChange}
            placeholder="Search user, action, entity, description or IP... (⌘F)"
            searchLabel="Search audit logs"
            className="w-full sm:max-w-xl"
          />
          <div className="flex items-center gap-3">
            <Select
              id="action-filter"
              name="action-filter"
              label="Action"
              options={actionOptions}
              value={actionFilter}
              onChange={(event) => {
                setActionFilter(event.target.value || ALL_ACTIONS);
              }}
              className="w-full sm:w-48"
            />
            {isFiltering && (
              <Button
                variant="tertiary"
                onClick={() => {
                  setQuery("");
                  setActionFilter(ALL_ACTIONS);
                }}
                className="mt-6 text-xs text-neutral-500 hover:text-neutral-800 sm:mt-0"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
        {isFiltering && (
          <p className="mt-2 text-xs text-neutral-500">
            Search and filters apply to page {page} only — clear them to see
            every row on this page.
          </p>
        )}
      </div>

      {/* Ledger */}
      {status === "loading" ? (
        <div
          role="status"
          aria-label="Loading audit trail"
          className="animate-pulse space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs"
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="h-4 w-1/6 rounded bg-neutral-100" />
              <div className="h-4 w-1/4 rounded bg-neutral-100" />
              <div className="h-4 w-1/4 rounded bg-neutral-100" />
              <div className="h-4 w-1/6 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : status === "failed" ? (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-xs">
          <ErrorMessage
            title="Unable to load the audit trail"
            message="The audit-log service did not answer. Check the API connection and retry."
          />
          <Button
            onClick={retry}
            className="mt-2 inline-flex items-center gap-2"
          >
            <Icon name="refresh" className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <section aria-labelledby="audit-trail-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="audit-trail-heading"
              className="text-base font-semibold text-neutral-900"
            >
              Event Ledger
            </h2>
            <span className="text-sm text-neutral-500">
              {filteredLogs.length === logs.length
                ? `${logs.length} of ${totalElements} events`
                : `${filteredLogs.length} of ${logs.length} on this page · ${totalElements} total`}
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
            <Table
              columns={columns}
              data={filteredLogs}
              getRowKey={(row) => row.logId}
              emptyTitle="No audit entries found"
              emptyMessage={
                isFiltering
                  ? "No entries on this page match the current search or action filter."
                  : "The audit trail has not recorded any events yet."
              }
              label="Audit trail event ledger"
            />
          </div>

          {totalPages > 1 && (
            <Pagination
              className="mt-4"
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </section>
      )}
    </div>
  );
};

export default AuditLogsPage;
