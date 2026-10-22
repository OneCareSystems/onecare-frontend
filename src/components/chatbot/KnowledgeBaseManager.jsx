import { useEffect, useState } from "react";
import Button from "../Button";
import ConfirmDialog from "../ConfirmDialog";
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

export default function KnowledgeBaseManager() {
  const [result, setResult] = useState({ items: [], count: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [sourceType, setSourceType] = useState("");
  const [status, setStatus] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
    setReload((value) => value + 1);
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
  const upload = (event) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a PDF file.");
      return;
    }
    const form = event.currentTarget;
    void mutate(async () => {
      await uploadKnowledgePdf(file, title);
      setFile(null);
      setTitle("");
      form.reset();
    }, "PDF queued for ingestion.");
  };
  const submitLink = (event) => {
    event.preventDefault();
    void mutate(async () => {
      await addKnowledgeLink(url.trim());
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
  const columns = [
    {
      key: "title",
      header: "Resource",
      render: (row) =>
        row.title || row.originalFilename || `Resource ${row.id}`,
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
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
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
            variant="danger"
            disabled={busy || row.status === "REMOVED"}
            onClick={() => setRemoval(row)}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section
      aria-labelledby="chatbot-kb-heading"
      className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="chatbot-kb-heading" className="text-xl font-semibold">
            Chatbot Knowledge Base
          </h2>
          <p className="text-sm text-neutral-600">
            Manage the PDFs and approved websites used by the patient chatbot.
            Refresh to check ingestion progress.
          </p>
        </div>
        <Button variant="outline" disabled={loading || busy} onClick={refresh}>
          Refresh resources
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-danger-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-success-700">
          {notice}
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <form onSubmit={upload} className="space-y-3">
          <h3 className="font-semibold">Add PDF</h3>
          <Input
            id="chatbot-pdf-title"
            label="PDF title (optional)"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={busy}
          />
          <label
            className="block text-sm font-medium"
            htmlFor="chatbot-pdf-file"
          >
            PDF file
          </label>
          <input
            id="chatbot-pdf-file"
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <Button type="submit" disabled={busy}>
            Upload PDF
          </Button>
        </form>
        <form onSubmit={submitLink} className="space-y-3">
          <h3 className="font-semibold">Add website</h3>
          <Input
            id="chatbot-web-url"
            type="url"
            label="Approved website URL"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={busy}
            placeholder="https://approved-website.org/article"
          />
          <Button type="submit" disabled={busy || !url.trim()}>
            Add link
          </Button>
        </form>
      </div>
      <div className="flex flex-wrap gap-4">
        <label>
          Resource type{" "}
          <select
            className="rounded border p-2"
            value={sourceType}
            onChange={(event) => filter(setSourceType, event.target.value)}
          >
            <option value="">All types</option>
            <option value="PDF">PDF</option>
            <option value="WEB">Website</option>
          </select>
        </label>
        <label>
          Ingestion status{" "}
          <select
            className="rounded border p-2"
            value={status}
            onChange={(event) => filter(setStatus, event.target.value)}
          >
            <option value="">Active resources</option>
            {STATUSES.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      {(loading || busy) && <LoadingSpinner label="Loading knowledge base" />}
      {!loading && !error && (
        <>
          <p className="text-sm text-neutral-600">{result.count} resources</p>
          <Table
            columns={columns}
            data={result.items}
            label="Chatbot knowledge resources"
            emptyTitle="No knowledge resources found"
          />
          <Pagination
            currentPage={page}
            totalPages={result.totalPages}
            onPageChange={changePage}
            disabled={busy}
          />
        </>
      )}
      <Modal
        isOpen={Boolean(details)}
        onClose={() => setDetails(null)}
        title="Knowledge resource details"
      >
        {details && (
          <dl className="space-y-2 break-words text-sm">
            {[
              ["ID", details.id],
              ["Title", details.title],
              ["Filename", details.originalFilename],
              ["Type", details.sourceType],
              ["URL", details.sourceUrl],
              ["Language", details.language],
              ["Status", details.status],
              ["Created", details.createdAt],
              ["Uploaded by", details.uploadedBy],
              ["Ingestion error", details.failureReason],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-semibold">{label}</dt>
                <dd>{value ?? "—"}</dd>
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
        message={`Remove ${removal?.title || removal?.originalFilename || "this resource"} from chatbot retrieval?`}
        confirmLabel="Remove resource"
        onConfirm={() =>
          void mutate(async () => {
            await removeKnowledgeResource(removal.id);
            setRemoval(null);
            if (result.items.length === 1 && page > 1) setPage(page - 1);
          }, "Resource removed from chatbot retrieval.")
        }
      />
    </section>
  );
}
