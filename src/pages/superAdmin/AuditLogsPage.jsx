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
const VIEW_TABLE = "table";
const VIEW_TIMELINE = "timeline";

/* ------------------------------------------------------------------ */
/* Small primitives                                                    */
/* ------------------------------------------------------------------ */

const ActionBadge = memo(({ action }) => {
  const palette = useMemo(() => {
    const a = String(action || "").toUpperCase();
    if (a.includes("DELETE") || a.includes("REMOVE"))
      return "bg-red-50 text-red-700 ring-red-200";
    if (a.includes("CREATE") || a.includes("ADD") || a.includes("INSERT"))
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (a.includes("UPDATE") || a.includes("EDIT") || a.includes("PATCH"))
      return "bg-amber-50 text-amber-700 ring-amber-200";
    if (a.includes("LOGIN") || a.includes("AUTH") || a.includes("SESSION"))
      return "bg-blue-50 text-blue-700 ring-blue-200";
    if (a.includes("EXPORT") || a.includes("DOWNLOAD"))
      return "bg-violet-50 text-violet-700 ring-violet-200";
    return "bg-neutral-100 text-neutral-700 ring-neutral-200";
  }, [action]);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ring-inset ${palette}`}
    >
      {action || "—"}
    </span>
  );
});
ActionBadge.displayName = "ActionBadge";

const ActorAvatar = memo(({ username }) => {
  const initials = (username || "?")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  // deterministic hue from username
  const hue = useMemo(() => {
    let h = 0;
    for (const ch of username || "?") h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
  }, [username]);

  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ backgroundColor: `hsl(${hue} 65% 45%)` }}
    >
      {initials || "?"}
    </span>
  );
});
ActorAvatar.displayName = "ActorAvatar";

const RelativeTime = memo(({ iso }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  let label = "just now";
  if (day > 0) label = `${day}d ago`;
  else if (hr > 0) label = `${hr}h ago`;
  else if (min > 0) label = `${min}m ago`;
  else if (sec > 5) label = `${sec}s ago`;

  return (
    <time
      dateTime={iso}
      title={iso?.replace("T", " ")}
      className="text-xs text-neutral-500"
    >
      {label}
    </time>
  );
});
RelativeTime.displayName = "RelativeTime";

/* ------------------------------------------------------------------ */
/* Row detail drawer                                                   */
/* ------------------------------------------------------------------ */

const DetailRow = ({ label, value, mono }) => (
  <div className="flex flex-col gap-0.5 border-b border-neutral-100 py-2.5 last:border-0">
    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
      {label}
    </span>
    <span
      className={`break-words text-sm text-neutral-800 ${mono ? "font-mono text-xs" : ""}`}
    >
      {value || "—"}
    </span>
  </div>
);

const DetailDrawer = ({ log, onClose }) => {
  useEffect(() => {
    if (!log) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [log, onClose]);

  if (!log) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-neutral-900/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Audit event detail"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Event #{log.logId}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-neutral-900">
              Event Detail
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 flex items-center gap-3">
            <ActorAvatar username={log.username} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">
                {log.username || "Unknown actor"}
              </p>
              {log.ipAddress && (
                <p className="truncate font-mono text-xs text-neutral-500">
                  {log.ipAddress}
                </p>
              )}
            </div>
            <div className="ml-auto">
              <ActionBadge action={log.actionType} />
            </div>
          </div>

          <DetailRow label="Timestamp" value={log.timestamp?.replace("T", " ")} mono />
          <DetailRow label="Entity Type" value={log.entityType} />
          <DetailRow label="Entity ID" value={log.entityId} mono />
          <DetailRow label="Description" value={log.description} />
          <DetailRow label="Log ID" value={log.logId} mono />

          <div className="mt-6 rounded-xl bg-neutral-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Raw payload
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-neutral-700">
{JSON.stringify(log, null, 2)}
            </pre>
          </div>
        </div>

        <footer className="border-t border-neutral-200 px-5 py-3">
          <Button onClick={onClose} variant="tertiary" className="w-full">
            Close
          </Button>
        </footer>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Timeline view                                                       */
/* ------------------------------------------------------------------ */

const TimelineView = ({ logs, onRowClick }) => {
  const grouped = useMemo(() => {
    const map = new Map();
    for (const log of logs) {
      const date = (log.timestamp || "").slice(0, 10);
      if (!map.has(date)) map.set(date, []);
      map.get(date).push(log);
    }
    return [...map.entries()];
  }, [logs]);

  if (!logs.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center">
        <p className="text-sm font-medium text-neutral-700">No events</p>
        <p className="mt-1 text-xs text-neutral-500">
          Nothing on this page matches the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([date, rows]) => (
        <div key={date}>
          <div className="sticky top-0 z-10 mb-3 flex items-center gap-3 bg-neutral-50/80 py-1 backdrop-blur">
            <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
              {date || "Undated"}
            </span>
            <span className="text-xs text-neutral-500">
              {rows.length} event{rows.length === 1 ? "" : "s"}
            </span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <ol className="relative space-y-2 border-l border-neutral-200 pl-5">
            {rows.map((log) => (
              <li key={log.logId} className="relative">
                <span className="absolute -left-[27px] top-4 h-2.5 w-2.5 rounded-full border-2 border-white bg-neutral-900 ring-1 ring-neutral-300" />
                <button
                  type="button"
                  onClick={() => onRowClick(log)}
                  className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-xs transition hover:border-neutral-300 hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionBadge action={log.actionType} />
                    <ActorAvatar username={log.username} />
                    <span className="text-sm font-medium text-neutral-900">
                      {log.username || "Unknown"}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {log.entityType}
                      {log.entityId ? ` #${log.entityId}` : ""}
                    </span>
                    <RelativeTime iso={log.timestamp} />
                  </div>
                  {log.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-neutral-600">
                      {log.description}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

const AuditLogsPage = () => {
  const [pageData, setPageData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [actionFilter, setActionFilter] = useState(ALL_ACTIONS);
  const [view, setView] = useState(VIEW_TABLE);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const searchInputRef = useRef(null);

  /* ---- keyboard shortcuts ---- */
  useEffect(() => {
    const onKey = (e) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setShowShortcuts(false);
        setSelectedLog(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---- fetch ---- */
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getAuditLogs({ page: page - 1, size: DEFAULT_PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setPageData(result);
        setStatus("ready");
        setLastUpdated(new Date());
      })
      .catch(() => !cancelled && setStatus("failed"));
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  const retry = useCallback(() => {
    setStatus("loading");
    setReloadKey((k) => k + 1);
  }, []);

  const handleQueryChange = useCallback((v) => setQuery(v), []);

  const logs = pageData?.content ?? [];
  const normalizedQuery = deferredQuery.trim().toLowerCase();

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
          ].some((f) =>
            String(f ?? "").toLowerCase().includes(normalizedQuery),
          );
        return matchesAction && matchesSearch;
      }),
    [logs, actionFilter, normalizedQuery],
  );

  const actionOptions = useMemo(() => {
    const actions = [
      ...new Set(logs.map((l) => l.actionType).filter(Boolean)),
    ].sort();
    return [
      { value: ALL_ACTIONS, label: "All Actions" },
      ...actions.map((a) => ({ value: a, label: a })),
    ];
  }, [logs]);

  const uniqueUsers = useMemo(
    () => new Set(logs.map((l) => l.username).filter(Boolean)).size,
    [logs],
  );

  const totalPages = pageData?.totalPages ?? 1;
  const totalElements = pageData?.totalElements ?? 0;
  const isFiltering =
    Boolean(normalizedQuery) || actionFilter !== ALL_ACTIONS;

  const clearFilters = useCallback(() => {
    setQuery("");
    setActionFilter(ALL_ACTIONS);
  }, []);

  /* ---- CSV export ---- */
  const exportCsv = useCallback(() => {
    const rows = filteredLogs.length ? filteredLogs : logs;
    const headers = [
      "logId",
      "timestamp",
      "username",
      "ipAddress",
      "actionType",
      "entityType",
      "entityId",
      "description",
    ];
    const escape = (v) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs, logs, page]);

  /* ---- columns ---- */
  const columns = useMemo(
    () => [
      {
        key: "logId",
        header: "Log / Time",
        render: (row) => (
          <div className="min-w-0 whitespace-normal">
            <span className="block font-mono text-xs font-semibold text-neutral-900">
              #{row.logId}
            </span>
            <RelativeTime iso={row.timestamp} />
          </div>
        ),
      },
      {
        key: "username",
        header: "Actor",
        render: (row) => (
          <div className="flex min-w-0 items-center gap-2.5 py-0.5">
            <ActorAvatar username={row.username} />
            <div className="min-w-0">
              <span className="block truncate text-sm font-medium text-neutral-900">
                {row.username || "—"}
              </span>
              {row.ipAddress && (
                <span className="block truncate font-mono text-[11px] text-neutral-500">
                  {row.ipAddress}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "actionType",
        header: "Action",
        render: (row) => <ActionBadge action={row.actionType} />,
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
              <span className="mt-0.5 block font-mono text-[11px] text-neutral-500">
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
          <span className="block max-w-md whitespace-normal text-xs leading-relaxed text-neutral-600 line-clamp-2">
            {row.description || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* ============ Hero header ============ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live audit trail
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Every privileged action across the platform, in one ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-neutral-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="tertiary"
            onClick={retry}
            className="inline-flex items-center gap-1.5"
          >
            <Icon name="refresh" className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant="tertiary"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5"
          >
            <Icon name="download" className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </header>

      {/* ============ Stat cards ============ */}
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

      {/* ============ Sticky filter bar ============ */}
      <div className="sticky top-3 z-20 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBar
            ref={searchInputRef}
            value={query}
            onChange={handleQueryChange}
            placeholder="Search user, action, entity, IP…  ( / )"
            searchLabel="Search audit logs"
            className="w-full sm:max-w-xl"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Select
              id="action-filter"
              name="action-filter"
              label="Action"
              options={actionOptions}
              value={actionFilter}
              onChange={(e) =>
                setActionFilter(e.target.value || ALL_ACTIONS)
              }
              className="w-full sm:w-44"
            />

            {/* View toggle */}
            <div
              role="group"
              aria-label="View mode"
              className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5"
            >
              {[
                { id: VIEW_TABLE, label: "Table", icon: "list" },
                { id: VIEW_TIMELINE, label: "Timeline", icon: "activity" },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  aria-pressed={view === v.id}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                    view === v.id
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  <Icon name={v.icon} className="h-3.5 w-3.5" />
                  {v.label}
                </button>
              ))}
            </div>

            {isFiltering && (
              <Button
                variant="tertiary"
                onClick={clearFilters}
                className="text-xs text-neutral-500 hover:text-neutral-800"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {isFiltering && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
            <Icon name="info" className="h-3.5 w-3.5 shrink-0" />
            Filters apply to page {page} only — clear them to see every row.
          </p>
        )}
      </div>

      {/* ============ Content ============ */}
      {status === "loading" ? (
        <div
          role="status"
          aria-label="Loading audit trail"
          className="animate-pulse space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-neutral-100" />
              <div className="h-4 w-1/4 rounded bg-neutral-100" />
              <div className="h-4 w-1/5 rounded bg-neutral-100" />
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
          <Button onClick={retry} className="mt-2 inline-flex items-center gap-2">
            <Icon name="refresh" className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <section aria-labelledby="audit-trail-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="audit-trail-heading"
              className="text-sm font-semibold text-neutral-900"
            >
              Event Ledger
            </h2>
            <span className="text-xs text-neutral-500">
              {filteredLogs.length === logs.length
                ? `${logs.length} of ${totalElements} events`
                : `${filteredLogs.length} of ${logs.length} on this page · ${totalElements} total`}
            </span>
          </div>

          {view === VIEW_TABLE ? (
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
              <Table
                columns={columns}
                data={filteredLogs}
                getRowKey={(row) => row.logId}
                onRowClick={(row) => setSelectedLog(row)}
                emptyTitle="No audit entries found"
                emptyMessage={
                  isFiltering
                    ? "No entries on this page match the current search or action filter."
                    : "The audit trail has not recorded any events yet."
                }
                label="Audit trail event ledger"
              />
            </div>
          ) : (
            <TimelineView logs={filteredLogs} onRowClick={setSelectedLog} />
          )}

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

      {/* ============ Keyboard shortcut hint ============ */}
      <button
        type="button"
        onClick={() => setShowShortcuts((v) => !v)}
        className="fixed bottom-4 right-4 z-30 hidden rounded-full bg-neutral-900 px-3.5 py-2 text-xs font-medium text-white shadow-lg transition hover:bg-neutral-800 sm:inline-flex sm:items-center sm:gap-1.5"
      >
        <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
        Shortcuts
      </button>

      {showShortcuts && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/30 backdrop-blur-sm p-4"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-neutral-900">
              Keyboard shortcuts
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ["⌘ / Ctrl + F", "Focus search"],
                ["/", "Focus search"],
                ["⌘ / Ctrl + K", "Toggle shortcuts"],
                ["Esc", "Close drawer / dialog"],
              ].map(([key, label]) => (
                <li key={key} className="flex items-center justify-between">
                  <span className="text-neutral-600">{label}</span>
                  <kbd className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[11px] text-neutral-700">
                    {key}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ============ Detail drawer ============ */}
      <DetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
};

export default AuditLogsPage;