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
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import Modal from "../../components/doctor/Modal";
import { PageHeader, PageShell } from "../../components/doctor/PageLayout";
import { ErrorPanel, Panel, SkeletonBlock } from "../../components/doctor/Panel";
import {
  deleteDocument,
  listDocuments,
  uploadDocument,
} from "../../services/knowledgeBaseService";

const FIELD_CLASS =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20";
const LABEL_CLASS = "mb-1 block text-sm font-medium text-neutral-700";

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

// ---------------------------------------------------------------------------
// Document card
// ---------------------------------------------------------------------------

const DocumentCard = memo(function DocumentCard({ doc, onRemove, removing }) {
  const size = formatBytes(doc.sizeBytes);
  const uploaded = formatDate(doc.uploadedAt);

  return (
    <article className="group flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition-all hover:border-primary-300 hover:shadow-sm">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
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
            onClick={() => onRemove(doc)}
            disabled={removing}
            aria-label={`Remove ${doc.title}`}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-primary-600 disabled:opacity-40"
          >
            <Icon
              name={removing ? "loader" : "trash"}
              className={`h-4 w-4 ${removing ? "motion-safe:animate-spin text-rose-500" : ""
                }`}
            />
          </button>
        </div>

        <h3 className="line-clamp-2 text-base font-semibold text-neutral-900">
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
            <span className="inline-flex items-center gap-1 truncate max-w-[12rem]">
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
      </div>
    </article>
  );
});

// ---------------------------------------------------------------------------
// Upload modal
// ---------------------------------------------------------------------------

const UploadModal = ({ onCancel, onUpload, uploading, error }) => {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const chooseFile = useCallback((picked) => {
    if (!picked) return;
    const isPdf =
      picked.type === "application/pdf" ||
      picked.name?.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setLocalError("Please select a PDF file.");
      setFile(null);
      return;
    }
    setLocalError(null);
    setFile(picked);
  }, []);

  const handleFileInput = (event) => chooseFile(event.target.files?.[0]);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!file) {
      setLocalError("Attach a PDF file.");
      return;
    }
    onUpload(file);
  };

  const shownError = localError ?? error;

  return (
    <Modal title="Upload PDF reference" onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <span className={LABEL_CLASS}>PDF file</span>
          <label
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragging
                ? "border-primary-400 bg-primary-50/60"
                : "border-neutral-200 bg-neutral-50/60 hover:border-primary-300 hover:bg-primary-50/30"
              }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary-600 shadow-sm ring-1 ring-neutral-200">
              <Icon name="upload" className="h-4 w-4" />
            </span>
            {file ? (
              <span className="flex flex-col items-center">
                <span className="text-sm font-medium text-neutral-900">
                  {file.name}
                </span>
                <span className="text-xs text-neutral-500">
                  {formatBytes(file.size) ?? ""}
                </span>
              </span>
            ) : (
              <span className="flex flex-col items-center">
                <span className="text-sm font-medium text-neutral-800">
                  Drop a PDF here or click to browse
                </span>
                <span className="text-xs text-neutral-500">
                  Only PDF files are accepted
                </span>
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileInput}
              className="hidden"
              aria-label="PDF file"
            />
          </label>
          {shownError && (
            <p role="alert" className="mt-1 text-sm text-rose-600">
              {shownError}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={uploading}
            disabled={uploading || !file}
            className="inline-flex items-center gap-1.5"
          >
            <Icon name="upload" className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload reference"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Remove confirmation
// ---------------------------------------------------------------------------

const ConfirmRemoveModal = ({ doc, onCancel, onConfirm, removing, error }) => (
  <Modal title="Remove reference" onClose={onCancel} widthClass="max-w-md">
    <p className="text-sm text-neutral-700">
      Remove <span className="font-semibold">{doc.title}</span> from the
      knowledge base? The chatbot will no longer reference this document.
    </p>
    {error && (
      <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">
        {error}
      </p>
    )}
    <div className="mt-5 flex justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onCancel}
        disabled={removing}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={onConfirm}
        loading={removing}
        disabled={removing}
        className="inline-flex items-center gap-1.5"
      >
        <Icon name="trash" className="h-4 w-4" />
        {removing ? "Removing…" : "Remove"}
      </Button>
    </div>
  </Modal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Clinical reference library backed by the chatbot knowledge-base API.
 * Uploads, listings, and removals are all server-driven.
 */
const KnowledgeBasePage = () => {
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | failed
  const [reloadKey, setReloadKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  // Initial + retry fetch.
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");

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
        ) return;
        setStatus("failed");
      });

    return () => controller.abort();
  }, [reloadKey]);

  const retry = useCallback(() => {
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

  const openUpload = useCallback(() => {
    setUploadError(null);
    setShowUpload(true);
  }, []);
  const closeUpload = useCallback(() => {
    if (uploading) return;
    setShowUpload(false);
  }, [uploading]);

  const handleUpload = useCallback(
    (file) => {
      setUploading(true);
      setUploadError(null);

      uploadDocument(file)
        .then((created) => {
          setDocuments((current) => {
            if (!created) return current;
            if (current.some((doc) => doc.id === created.id)) return current;
            return [created, ...current];
          });
          setShowUpload(false);
          // Re-sync from the server so order/metadata match the backend.
          setReloadKey((key) => key + 1);
        })
        .catch((error) => {
          if (error?.status === 400) {
            setUploadError("The server rejected this file. Ensure it is a valid PDF.");
          } else if (error?.status === 401 || error?.status === 403) {
            setUploadError("You don't have permission to upload documents.");
          } else {
            setUploadError("Unable to upload the file. Please try again.");
          }
        })
        .finally(() => setUploading(false));
    },
    [],
  );

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

    setRemoving(true);
    setRemovingId(target.id);
    setRemoveError(null);

    deleteDocument(target.id)
      .then(() => {
        setDocuments((current) =>
          current.filter((doc) => doc.id !== target.id),
        );
        setPendingRemoval(null);
      })
      .catch((error) => {
        if (error?.status === 404) {
          // Already gone server-side; reconcile the local list.
          setDocuments((current) =>
            current.filter((doc) => doc.id !== target.id),
          );
          setPendingRemoval(null);
          return;
        }
        setRemoveError(
          error?.status === 401 || error?.status === 403
            ? "You don't have permission to remove this document."
            : "Unable to remove the document. Please try again.",
        );
      })
      .finally(() => {
        setRemoving(false);
        setRemovingId(null);
      });
  }, [pendingRemoval]);

  // ----- render: loading / error / list ------------------------------------

  const countLabel = useMemo(() => {
    const total = documents.length;
    const shown = filtered.length;
    if (deferredQuery.trim()) return `${shown} of ${total} references`;
    return `${total} ${total === 1 ? "reference" : "references"}`;
  }, [documents.length, filtered.length, deferredQuery]);

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
            onClick={openUpload}
            className="inline-flex items-center gap-2"
            disabled={status === "loading"}
          >
            <Icon name="plus" className="h-4 w-4" />
            Upload PDF Reference
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
        <>
          <Panel bodyClassName="space-y-4">
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
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, description, or filename…"
                className={`${FIELD_CLASS} pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden`}
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
          </Panel>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs">
              <EmptyState
                title={
                  deferredQuery.trim()
                    ? "No matching references found"
                    : "No references yet"
                }
                message={
                  deferredQuery.trim()
                    ? "Try a different search, or upload a new PDF reference."
                    : "Upload your first PDF reference to make it available to the chatbot."
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
        </>
      )}

      {showUpload && (
        <UploadModal
          onCancel={closeUpload}
          onUpload={handleUpload}
          uploading={uploading}
          error={uploadError}
        />
      )}

      {pendingRemoval && (
        <ConfirmRemoveModal
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
