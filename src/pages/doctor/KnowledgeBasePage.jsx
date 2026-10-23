import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import Button from "../../components/Button";
import KnowledgeBaseManager from "../../components/chatbot/KnowledgeBaseManager";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import Modal from "../../components/doctor/Modal";
import { PageHeader, PageShell } from "../../components/doctor/PageLayout";
import { ErrorPanel, SkeletonBlock } from "../../components/doctor/Panel";
import ConfirmRemoveDialog from "../../features/doctor/ConfirmRemoveDialog";
import {
  deleteDocument,
  listDocuments,
} from "../../services/knowledgeBaseService";

/** Shared input class for search fields within this page. */
const SEARCH_INPUT_CLASS =
  "w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-9 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 [&::-webkit-search-cancel-button]:hidden";

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const DocumentCard = memo(function DocumentCard({ doc, onRemove, removing }) {
  const size = formatBytes(doc.sizeBytes);
  const uploaded = formatDate(doc.uploadedAt);

  const openUrl =
    doc.fileUrl ||
    doc.downloadUrl ||
    doc.url ||
    doc.sourceUrl ||
    (doc.id ? `/api/knowledge-base/documents/${doc.id}/file` : null);

  const handleOpen = (e) => {
    e.stopPropagation();
    if (!openUrl) return;
    window.open(openUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <article
      className={`group flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition-all hover:border-primary-300 hover:shadow-sm ${
        openUrl ? "cursor-pointer" : ""
      }`}
      onClick={openUrl ? handleOpen : undefined}
      role={openUrl ? "button" : undefined}
      tabIndex={openUrl ? 0 : undefined}
      onKeyDown={
        openUrl
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpen(e);
              }
            }
          : undefined
      }
      aria-label={openUrl ? `Open ${doc.title} in a new tab` : undefined}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-100">
              <Icon name="file-text" className="h-4 w-4" />
            </span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
              PDF
            </span>
            {doc.category && (
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
                {doc.category}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(doc);
            }}
            disabled={removing}
            aria-label={`Remove ${doc.title}`}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-primary-600 disabled:opacity-40"
          >
            <Icon
              name={removing ? "loader" : "trash"}
              className={`h-4 w-4 ${
                removing ? "motion-safe:animate-spin text-rose-500" : ""
              }`}
            />
          </button>
        </div>

        <h3 className="line-clamp-2 text-base font-semibold text-neutral-900 group-hover:text-primary-700">
          {doc.title}
        </h3>

        {doc.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600">
            {doc.description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {doc.fileName && (
            <span className="inline-flex max-w-[12rem] items-center gap-1 truncate">
              <Icon name="file" className="h-3 w-3" />
              {doc.fileName}
            </span>
          )}
          {size && (
            <span className="inline-flex items-center gap-1">
              <Icon name="hard-drive" className="h-3 w-3" />
              {size}
            </span>
          )}
          {uploaded && (
            <span className="inline-flex items-center gap-1">
              <Icon name="calendar" className="h-3 w-3" />
              {uploaded}
            </span>
          )}
        </div>

        {openUrl && (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline"
          >
            Open
            <Icon name="arrow-right" className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
});
DocumentCard.displayName = "DocumentCard";

const KnowledgeBasePage = () => {
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);

  const [showManager, setShowManager] = useState(false);

  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [removeError, setRemoveError] = useState(null);
  const removing = removingId !== null;

  useEffect(() => {
    const controller = new AbortController();

    listDocuments({ signal: controller.signal })
      .then((docs) => {
        setDocuments(docs);
        setStatus("ready");
      })
      .catch((err) => {
        if (
          err?.name === "AbortError" ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED"
        )
          return;
        setStatus("failed");
      });

    return () => controller.abort();
  }, [reloadKey]);

  const retry = useCallback(() => {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }, []);

  const filtered = useMemo(() => {
    const query = deferredQuery.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter((doc) => {
      const haystack = [doc.title, doc.description, doc.fileName, doc.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [documents, deferredQuery]);

  const openManager = useCallback(() => setShowManager(true), []);
  const closeManager = useCallback(() => setShowManager(false), []);
  const handleManagerUpload = useCallback(() => {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }, []);

  const openRemove = useCallback((doc) => {
    setRemoveError(null);
    setPendingRemoval(doc);
  }, []);
  const closeRemove = useCallback(() => {
    if (removing) return;
    setPendingRemoval(null);
  }, [removing]);

  const confirmRemove = useCallback(() => {
    if (!pendingRemoval) return;
    const target = pendingRemoval;

    setRemovingId(target.id);
    setRemoveError(null);

    deleteDocument(target.id)
      .then(() => {
        setDocuments((cur) => cur.filter((d) => d.id !== target.id));
        setPendingRemoval(null);
      })
      .catch((error) => {
        if (error?.status === 404) {
          setDocuments((cur) => cur.filter((d) => d.id !== target.id));
          setPendingRemoval(null);
          return;
        }
        setRemoveError(
          error?.status === 401 || error?.status === 403
            ? "You don't have permission to remove this document."
            : "Unable to remove the document. Please try again.",
        );
      })
      .finally(() => setRemovingId(null));
  }, [pendingRemoval]);

  const countLabel = useMemo(() => {
    const total = documents.length;
    const shown = filtered.length;
    if (deferredQuery.trim()) return `${shown} of ${total} references`;
    return `${total} ${total === 1 ? "reference" : "references"}`;
  }, [documents.length, filtered.length, deferredQuery]);

  const isSearching = deferredQuery.trim().length > 0;

  return (
    <PageShell>
      <PageHeader
        title="Medical Knowledge Base"
        description="Upload clinical guidelines and protocols. The chatbot will reference these documents when assisting you."
        meta={
          status === "ready" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
              <Icon name="file-text" className="h-3 w-3 text-neutral-500" />
              {countLabel}
            </span>
          ) : null
        }
        actions={
          <Button
            onClick={openManager}
            className="inline-flex items-center gap-2"
            disabled={status === "loading"}
          >
            <Icon name="plus" className="h-4 w-4" />
            Upload Reference
          </Button>
        }
      />

      {status === "loading" ? (
        <SkeletonBlock label="Loading knowledge base" rows={4} />
      ) : status === "failed" ? (
        <ErrorPanel
          title="Unable to load the knowledge base"
          message="Please check your connection and try again."
          actionLabel="Retry"
          onAction={retry}
        />
      ) : (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <label htmlFor="kb-search" className="sr-only">
              Search references
            </label>
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            />
            <input
              id="kb-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, or filename…"
              className={SEARCH_INPUT_CLASS}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-primary-600"
              >
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs">
              <EmptyState
                title={
                  isSearching
                    ? "No matching references found"
                    : "No references yet"
                }
                message={
                  isSearching
                    ? "Try a different search, or upload a new PDF reference."
                    : "Upload your first PDF reference to make it available to the chatbot."
                }
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={
                      isSearching ? () => setSearchQuery("") : openManager
                    }
                  >
                    {isSearching ? "Clear search" : "Upload reference"}
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {filtered.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onRemove={openRemove}
                  removing={removingId === doc.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload modal */}
      {showManager && (
        <Modal
          title="Add to Knowledge Base"
          onClose={closeManager}
          widthClass="max-w-5xl"
          bodyClassName="max-h-[80vh] overflow-y-auto"
        >
          <KnowledgeBaseManager embedded onUploaded={handleManagerUpload} />
        </Modal>
      )}

      {/* Confirm remove dialog */}
      {pendingRemoval && (
        <ConfirmRemoveDialog
          doc={pendingRemoval}
          onCancel={closeRemove}
          onConfirm={confirmRemove}
          removing={removing}
          error={removeError}
        />
      )}
    </PageShell>
  );
};

export default KnowledgeBasePage;
