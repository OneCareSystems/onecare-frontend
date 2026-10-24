import { useEffect, useState } from "react";
import Button from "../Button";
import ConfirmDialog from "../ConfirmDialog";
import Icon from "../Icon";
import Input from "../Input";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import Pagination from "../Pagination";
import StatusBadge from "../StatusBadge";
import Table from "../Table";
import {
  addKnowledgeLink,
  getKnowledgeResource,
  listKnowledgeResources,
  removeKnowledgeResource,
  uploadKnowledgePdf,
} from "../../services/knowledgeBaseService";

const STATUSES = ["PENDING", "PROCESSING", "INDEXED", "FAILED", "REMOVED"];
const message = (error) =>
  error.userMessage || error.message || "The request failed. Please try again.";

const SELECT_CLASS =
  "rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20";

const FIELD_CLASS =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-700 hover:file:bg-primary-100";

/** Segmented toggle: PDF | Link */
const SourceToggle = ({ value, onChange, disabled }) => (
  <div
    role="tablist"
    aria-label="Source type"
    className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-1"
  >
    {[
      { key: "PDF", label: "Upload PDF", icon: "file-text" },
      { key: "LINK", label: "Add Link", icon: "link" },
    ].map((opt) => {
      const active = value === opt.key;
      return (
        <button
          key={opt.key}
          type="button"
          role="tab"
          aria-selected={active}
          disabled={disabled}
          onClick={() => onChange(opt.key)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            active
              ? "bg-white text-primary-700 shadow-xs ring-1 ring-inset ring-neutral-200"
              : "text-neutral-600 hover:text-neutral-900"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Icon name={opt.icon} className="h-4 w-4" />
          {opt.label}
        </button>
      );
    })}
  </div>
);

export default function KnowledgeBaseManager({ embedded = false, onUploaded }) {
  const [result, setResult] = useState({ items: [], count: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [sourceType, setSourceType] = useState("");
  const [status, setStatus] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Add-source form
  const [mode, setMode] = useState("PDF"); // "PDF" | "LINK"
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const [details, setDetails] = useState(null);
  const [removal, setRemoval] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    listKnowledgeResources(
      {
        page,
        pageSize: 20,
        sourceType: sourceType || undefined,
        status: status || undefined,
      },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(message(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, sourceType, status, reload]);

  const refresh = () => {
    setLoading(true);
    setError("");
    setReload((v) => v + 1);
  };

  const mutate = async (action, success) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      refresh();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setUrl("");
  };

  const switchMode = (next) => {
    if (next === mode) return;
    resetForm();
    setMode(next);
    setError("");
    setNotice("");
  };

  const submit = (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (mode === "PDF") {
      if (!file) {
        setError("Choose a PDF file.");
        return;
      }
      const formElement = event.currentTarget;
      void mutate(async () => {
        const created = await uploadKnowledgePdf(file, title);
        resetForm();
        formElement.reset(); // clear native file input
        onUploaded?.(created);
      }, "PDF queued for ingestion.");
      return;
    }

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a website URL.");
      return;
    }
    void mutate(async () => {
      await addKnowledgeLink(trimmed);
      setUrl("");
    }, "Link queued for ingestion.");
  };

  const view = async (id) => {
    setBusy(true);
    setError("");
    try {
      setDetails(await getKnowledgeResource(id));
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  };

  const changePage = (value) => {
    setLoading(true);
    setError("");
    setPage(value);
  };

  const filter = (setter, value) => {
    setLoading(true);
    setError("");
    setPage(1);
    setter(value);
  };

  const canSubmit =
    !busy && (mode === "PDF" ? Boolean(file) : Boolean(url.trim()));

  const columns = [
    {
      key: "title",
      header: "Resource",
      render: (row) => (
        <span className="font-medium text-neutral-900">
          {row.title || row.originalFilename || `Resource ${row.id}`}
        </span>
      ),
    },
    {
      key: "sourceType",
      header: "Type",
      render: (row) => <StatusBadge>{row.sourceType}</StatusBadge>,
    },
    {
      key: "status",
      header: "Ingestion status",
      render: (row) => (
        <StatusBadge
          status={
            row.status === "FAILED"
              ? "danger"
              : row.status === "INDEXED"
                ? "success"
                : "info"
          }
        >
          {row.status}
        </StatusBadge>
      ),
    },
    { key: "language", header: "Language" },
    {
      key: "createdAt",
      header: "Created",
      render: (row) =>
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—",
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void view(row.id)}
          >
            Details
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || row.status === "REMOVED"}
            onClick={() => setRemoval(row)}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="chatbot-kb-heading" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="chatbot-kb-heading" className="text-xl font-semibold">
            Chatbot Knowledge Base
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Add a PDF or an approved website link. The patient chatbot will
            reference these sources when answering questions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={loading || busy}
            onClick={refresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}
        </div>
      )}

      {/* Add-source form (single mode) */}
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-neutral-900">Add resource</h3>
          <SourceToggle value={mode} onChange={switchMode} disabled={busy} />
        </div>

        {mode === "PDF" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              id="chatbot-pdf-title"
              label="PDF title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
            />
            <div>
              <label
                className="mb-1 block text-sm font-medium text-neutral-700"
                htmlFor="chatbot-pdf-file"
              >
                PDF file
              </label>
              <input
                id="chatbot-pdf-file"
                type="file"
                accept="application/pdf,.pdf"
                disabled={busy}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className={FIELD_CLASS}
              />
            </div>
          </div>
        ) : (
          <Input
            id="chatbot-web-url"
            type="url"
            label="Approved website URL"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
            placeholder="https://approved-website.org/article"
          />
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              resetForm();
              setError("");
              setNotice("");
            }}
          >
            Clear
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5"
          >
            <Icon
              name={mode === "PDF" ? "upload" : "link"}
              className="h-4 w-4"
            />
            {busy ? "Submitting…" : mode === "PDF" ? "Upload PDF" : "Add link"}
          </Button>
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Resource type</span>
          <select
            className={SELECT_CLASS}
            value={sourceType}
            onChange={(e) => filter(setSourceType, e.target.value)}
          >
            <option value="">All types</option>
            <option value="PDF">PDF</option>
            <option value="WEB">Website</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Ingestion status</span>
          <select
            className={SELECT_CLASS}
            value={status}
            onChange={(e) => filter(setStatus, e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Table */}
      {loading && result.items.length === 0 ? (
        <LoadingSpinner label="Loading knowledge base" />
      ) : (
        <div
          className={
            loading && result.items.length > 0
              ? "opacity-60 transition-opacity"
              : ""
          }
          aria-busy={loading}
        >
          <p className="mb-2 text-sm text-neutral-600">
            {result.count} resource{result.count === 1 ? "" : "s"}
          </p>
          <Table
            columns={columns}
            data={result.items}
            label="Chatbot knowledge resources"
            emptyTitle="No knowledge resources found"
          />
          {result.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={result.totalPages}
              onPageChange={changePage}
              disabled={busy}
            />
          )}
        </div>
      )}

      {!embedded && (
        <>
          <Modal
            isOpen={Boolean(details)}
            onClose={() => setDetails(null)}
            title="Knowledge resource details"
          >
            {details && (
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-[9rem,1fr]">
                {[
                  ["ID", details.id, "font-mono"],
                  ["Title", details.title],
                  ["Filename", details.originalFilename, "font-mono break-all"],
                  ["Type", details.sourceType],
                  ["URL", details.sourceUrl, "break-all"],
                  ["Language", details.language],
                  ["Status", details.status],
                  [
                    "Created",
                    details.createdAt
                      ? new Date(details.createdAt).toLocaleString()
                      : null,
                  ],
                  ["Uploaded by", details.uploadedBy],
                  ["Ingestion error", details.failureReason, "text-rose-700"],
                ].map(([label, value, cls = ""]) => (
                  <div key={label} className="contents">
                    <dt className="font-semibold text-neutral-500">{label}</dt>
                    <dd className={`text-neutral-900 ${cls}`}>
                      {value ?? "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Modal>
          <ConfirmDialog
            isOpen={Boolean(removal)}
            onClose={() => {
              if (!busy) setRemoval(null);
            }}
            loading={busy}
            title="Remove knowledge resource"
            message={`Remove ${
              removal?.title || removal?.originalFilename || "this resource"
            } from chatbot retrieval?`}
            confirmLabel="Remove resource"
            onConfirm={() =>
              void mutate(async () => {
                await removeKnowledgeResource(removal.id);
                setRemoval(null);
                if (result.items.length === 1 && page > 1) setPage(page - 1);
              }, "Resource removed from chatbot retrieval.")
            }
          />
        </>
      )}
    </section>
  );
}
