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
import Input from "../../components/Input";
import Modal from "../../components/doctor/Modal";
import { PageHeader, PageShell } from "../../components/doctor/PageLayout";
import { Panel } from "../../components/doctor/Panel";

const CATEGORIES = [
  "Cardiology",
  "Endocrinology",
  "Emergency Protocols",
  "Pharmacology",
];
const FILTERS = ["All", ...CATEGORIES];

const SEED_ARTICLES = [
  {
    id: 1,
    title: "2024 AHA/ACC Hypertension Clinical Practice Guidelines",
    category: "Cardiology",
    updated: "Updated Oct 2024",
    badge: "Guideline",
    desc: "Updated thresholds for initiating dual-therapy in stage 2 essential hypertension and target systolic blood pressure below 130 mmHg.",
    pdf: "/pdfs/aha-acc-hypertension-2024.pdf",
  },
  {
    id: 2,
    title: "ADA Standards of Medical Care in Type 2 Diabetes",
    category: "Endocrinology",
    updated: "Updated Sept 2024",
    badge: "Clinical best practice",
    desc: "First-line GLP-1 receptor agonists and SGLT2 inhibitors integration criteria for cardio-renal protection in adult diabetics.",
    pdf: "/pdfs/ada-standards-t2d-2024.pdf",
  },
  {
    id: 3,
    title: "Severe Anaphylaxis & Acute Allergic Reaction Protocol",
    category: "Emergency Protocols",
    updated: "Immediate action",
    badge: "Critical",
    critical: true,
    desc: "Intramuscular epinephrine weight-based dosing algorithms, fluid resuscitation, and secondary refractory airway management.",
    pdf: "/pdfs/anaphylaxis-protocol.pdf",
  },
  {
    id: 4,
    title: "Antibiotic Stewardship & Renal Dosage Adjustments",
    category: "Pharmacology",
    updated: "Updated Aug 2024",
    badge: "Dosing matrix",
    desc: "Cockcroft-Gault CrCl calculations, vancomycin AUC/MIC targets, and step-down oral beta-lactam transitions.",
    pdf: "/pdfs/antibiotic-stewardship.pdf",
  },
];

const FIELD_CLASS =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20";
const LABEL_CLASS = "mb-1 block text-sm font-medium text-neutral-700";

const isBlobUrl = (url) => typeof url === "string" && url.startsWith("blob:");

const ArticleCard = memo(function ArticleCard({ article, onOpen, onRemove }) {
  return (
    <article className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition-colors hover:border-primary-300">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              article.critical
                ? "bg-rose-100 text-rose-800"
                : "bg-primary-50 text-primary-700"
            }`}
          >
            {article.badge}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">{article.updated}</span>
            <button
              type="button"
              onClick={() => onRemove(article)}
              aria-label={`Remove ${article.title}`}
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-primary-600"
            >
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </div>
        </div>
        <h3 className="text-base font-semibold text-neutral-900">
          {article.title}
        </h3>
        <p className="text-sm leading-relaxed text-neutral-600">
          {article.desc}
        </p>
      </div>
      <div className="flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
        <span className="font-medium text-neutral-600">{article.category}</span>
        <button
          type="button"
          onClick={() => onOpen(article)}
          className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline focus-visible:outline-2 focus-visible:outline-primary-600"
        >
          Read reference
          <Icon name="arrow-up-right" className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
});

const AddPdfModal = ({ onCancel, onAdd }) => {
  const fileRef = useRef(null);
  const urlRef = useRef("");
  const consumedRef = useRef(false);

  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    badge: "Guideline",
    updated: "Updated today",
    desc: "",
    critical: false,
  });
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState({});

  // Free the temporary PDF URL if the dialog closes without adding it.
  useEffect(
    () => () => {
      if (!consumedRef.current && urlRef.current)
        URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const setField = useCallback(
    (key) => (event) => {
      const { type, checked, value } = event.target;
      setForm((current) => ({
        ...current,
        [key]: type === "checkbox" ? checked : value,
      }));
    },
    [],
  );

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setErrors((current) => ({
        ...current,
        file: "Please select a PDF file.",
      }));
      return;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(file);
    setFileName(file.name);
    setErrors((current) => ({ ...current, file: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = "Enter a title.";
    if (!urlRef.current) nextErrors.file = "Attach a PDF file.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    consumedRef.current = true;
    onAdd({
      ...form,
      title: form.title.trim(),
      desc: form.desc.trim() || "No description provided.",
      pdf: urlRef.current,
    });
  };

  return (
    <Modal title="Add PDF reference" onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Input
            id="kb-title"
            label="Title"
            value={form.title}
            onChange={setField("title")}
            placeholder="e.g. 2024 Sepsis Management Guideline"
          />
          {errors.title && (
            <p role="alert" className="mt-1 text-sm text-rose-600">
              {errors.title}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="kb-category" className={LABEL_CLASS}>
              Category
            </label>
            <select
              id="kb-category"
              value={form.category}
              onChange={setField("category")}
              className={FIELD_CLASS}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <Input
            id="kb-badge"
            label="Badge"
            value={form.badge}
            onChange={setField("badge")}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            id="kb-updated"
            label="Updated label"
            value={form.updated}
            onChange={setField("updated")}
          />
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={form.critical}
              onChange={setField("critical")}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Mark as critical
          </label>
        </div>

        <div>
          <label htmlFor="kb-desc" className={LABEL_CLASS}>
            Description
          </label>
          <textarea
            id="kb-desc"
            value={form.desc}
            onChange={setField("desc")}
            rows={3}
            className={`${FIELD_CLASS} resize-none`}
            placeholder="Short summary of the reference..."
          />
        </div>

        <div>
          <span className={LABEL_CLASS}>PDF file</span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5"
            >
              <Icon name="plus" className="h-4 w-4" />
              Choose PDF
            </Button>
            <span className="truncate text-sm text-neutral-600">
              {fileName || "No file selected"}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={handleFile}
              className="hidden"
              aria-label="PDF file"
            />
          </div>
          {errors.file && (
            <p role="alert" className="mt-1 text-sm text-rose-600">
              {errors.file}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <button
            type="submit"
            className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            Add reference
          </button>
        </div>
      </form>
    </Modal>
  );
};

const ConfirmRemoveModal = ({ article, onCancel, onConfirm }) => (
  <Modal title="Remove reference" onClose={onCancel} widthClass="max-w-md">
    <p className="text-sm text-neutral-700">
      Remove <span className="font-semibold">{article.title}</span> from the
      knowledge base?
    </p>
    <div className="mt-5 flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <button
        type="button"
        data-autofocus
        onClick={onConfirm}
        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
      >
        Remove
      </button>
    </div>
  </Modal>
);

/**
 * Clinical reference library. Articles live in component state only: PDFs
 * added here are held as temporary browser URLs and are lost on reload.
 */
const KnowledgeBasePage = () => {
  const [articles, setArticles] = useState(SEED_ARTICLES);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState(null);

  // Release any browser-held PDF URLs when leaving the page.
  const articlesRef = useRef(articles);
  useEffect(() => {
    articlesRef.current = articles;
  }, [articles]);
  useEffect(
    () => () => {
      articlesRef.current.forEach((article) => {
        if (isBlobUrl(article.pdf)) URL.revokeObjectURL(article.pdf);
      });
    },
    [],
  );

  const filtered = useMemo(() => {
    const query = deferredQuery.trim().toLowerCase();
    return articles.filter(
      (article) =>
        (selectedCategory === "All" || article.category === selectedCategory) &&
        (!query ||
          article.title.toLowerCase().includes(query) ||
          article.desc.toLowerCase().includes(query)),
    );
  }, [articles, selectedCategory, deferredQuery]);

  const handleAdd = useCallback((newArticle) => {
    setArticles((current) => [...current, { ...newArticle, id: Date.now() }]);
    setShowAddModal(false);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (!pendingRemoval) return;
    if (isBlobUrl(pendingRemoval.pdf)) URL.revokeObjectURL(pendingRemoval.pdf);
    setArticles((current) =>
      current.filter((item) => item.id !== pendingRemoval.id),
    );
    setPendingRemoval(null);
  }, [pendingRemoval]);

  const openAdd = useCallback(() => setShowAddModal(true), []);
  const closeAdd = useCallback(() => setShowAddModal(false), []);
  const closeRemove = useCallback(() => setPendingRemoval(null), []);
  const closeViewer = useCallback(() => setSelectedPdf(null), []);

  if (selectedPdf) {
    return (
      <PageShell>
        <PageHeader
          title={selectedPdf.title}
          description={`${selectedPdf.category}. ${selectedPdf.updated}.`}
          actions={
            <>
              <a
                href={selectedPdf.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Icon name="arrow-up-right" className="h-4 w-4" />
                Open in new tab
              </a>
              <Button
                size="sm"
                onClick={closeViewer}
                className="inline-flex items-center gap-1.5"
              >
                <Icon name="arrow-left" className="h-4 w-4" />
                Back to list
              </Button>
            </>
          }
        />
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <iframe
            src={selectedPdf.pdf}
            title={selectedPdf.title}
            className="h-[75vh] w-full border-0"
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Medical Knowledge Base"
        description="Evidence-based clinical guidelines, pharmacology references and emergency protocols."
        meta={
          <p className="font-medium text-neutral-800">
            {articles.length}{" "}
            {articles.length === 1 ? "reference" : "references"} in library
          </p>
        }
        actions={
          <Button onClick={openAdd} className="inline-flex items-center gap-2">
            <Icon name="plus" className="h-4 w-4" />
            Add PDF Reference
          </Button>
        }
      />

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
            placeholder="Search guidelines, drug interactions, protocols..."
            className={`${FIELD_CLASS} pl-9`}
          />
        </div>
        <div
          role="group"
          aria-label="Filter by category"
          className="flex flex-wrap gap-2"
        >
          {FILTERS.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary-600 ${
                selectedCategory === category
                  ? "bg-primary-600 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <EmptyState
            title="No matching references found."
            message="Try a different search or category, or add a PDF reference."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onOpen={setSelectedPdf}
              onRemove={setPendingRemoval}
            />
          ))}
        </div>
      )}

      {showAddModal && <AddPdfModal onCancel={closeAdd} onAdd={handleAdd} />}
      {pendingRemoval && (
        <ConfirmRemoveModal
          article={pendingRemoval}
          onCancel={closeRemove}
          onConfirm={handleConfirmRemove}
        />
      )}
    </PageShell>
  );
};

export default KnowledgeBasePage;
