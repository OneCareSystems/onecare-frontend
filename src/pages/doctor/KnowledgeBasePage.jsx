import { useState, useRef } from 'react';
import Icon from '../../components/Icon';

const KnowledgeBasePage = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [articles, setArticles] = useState([
    {
      id: 1,
      title: '2024 AHA/ACC Hypertension Clinical Practice Guidelines',
      category: 'Cardiology',
      updated: 'Updated Oct 2024',
      badge: 'GUIDELINE',
      desc: 'Updated thresholds for initiating dual-therapy in stage 2 essential hypertension and target systolic blood pressure below 130 mmHg.',
      pdf: '/pdfs/aha-acc-hypertension-2024.pdf',
    },
    {
      id: 2,
      title: 'ADA Standards of Medical Care in Type 2 Diabetes',
      category: 'Endocrinology',
      updated: 'Updated Sept 2024',
      badge: 'CLINICAL BEST PRACTICE',
      desc: 'First-line GLP-1 receptor agonists and SGLT2 inhibitors integration criteria for cardio-renal protection in adult diabetics.',
      pdf: '/pdfs/ada-standards-t2d-2024.pdf',
    },
    {
      id: 3,
      title: 'Severe Anaphylaxis & Acute Allergic Reaction Protocol',
      category: 'Emergency Protocols',
      updated: 'Immediate Action',
      badge: 'CRITICAL',
      critical: true,
      desc: 'Intramuscular epinephrine weight-based dosing algorithms, fluid resuscitation, and secondary refractory airway management.',
      pdf: '/pdfs/anaphylaxis-protocol.pdf',
    },
    {
      id: 4,
      title: 'Antibiotic Stewardship & Renal Dosage Adjustments',
      category: 'Pharmacology',
      updated: 'Updated Aug 2024',
      badge: 'DOSING MATRIX',
      desc: 'Cockcroft-Gault CrCl calculations, vancomycin AUC/MIC targets, and step-down oral beta-lactam transitions.',
      pdf: '/pdfs/antibiotic-stewardship.pdf',
    },
  ]);

  const categories = ['All', 'Cardiology', 'Endocrinology', 'Emergency Protocols', 'Pharmacology'];

  const handleAddPdf = (newArticle) => {
    setArticles((prev) => [...prev, { ...newArticle, id: Date.now() }]);
    setShowAddModal(false);
  };

  const handleRemovePdf = (id, title) => {
    if (!window.confirm(`Remove "${title}" from the knowledge base?`)) return;
    setArticles((prev) => prev.filter((a) => a.id !== id));
    if (selectedPdf?.id === id) setSelectedPdf(null);
  };

  const filtered = articles.filter((a) => {
    const matchCat = selectedCategory === 'All' || a.category === selectedCategory;
    const matchQuery =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  // ---------- PDF VIEWER ----------
  if (selectedPdf) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                {selectedPdf.category}
              </span>
              <h2 className="text-base font-bold text-on-surface font-heading truncate">
                {selectedPdf.title}
              </h2>
              <p className="text-xs text-on-surface-variant">{selectedPdf.updated}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={selectedPdf.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center gap-1"
              >
                <Icon name="arrow-up-right" className="w-3.5 h-3.5" />
                <span>Open in new tab</span>
              </a>
              <button
                onClick={() => setSelectedPdf(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-white shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Icon name="arrow-left" className="w-3.5 h-3.5" />
                <span>Back to list</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl shadow-sm overflow-hidden">
          <iframe
            src={selectedPdf.pdf}
            title={selectedPdf.title}
            className="w-full"
            style={{ height: '80vh', border: 'none' }}
          />
        </div>
      </div>
    );
  }

  // ---------- LIST VIEW ----------
  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
            CLINICAL REFERENCE
          </span>
          <h2 className="text-base font-bold text-on-surface font-heading">
            Medical Knowledge Base
          </h2>
          <p className="text-xs text-on-surface-variant">
            Evidence-based medical clinical guidelines, pharmacology interactions, and emergency protocols.
          </p>
        </div>

        {/* Prominent Add PDF row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 border-t border-outline-variant/30">
          <div className="text-[11px] font-semibold text-on-surface-variant">
            {articles.length} reference{articles.length === 1 ? '' : 's'} in library
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-primary text-white shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>Add PDF Reference</span>
          </button>
        </div>

        <div className="relative">
          <Icon
            name="search"
            className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-3"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clinical guidelines, drug interactions, ICD-10 protocols..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-surface-container-low border border-outline-variant/50 rounded-2xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedCategory === c
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-5 shadow-sm space-y-3 hover:border-primary/40 transition-colors flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${item.critical ? 'bg-error text-white' : 'bg-primary/10 text-primary'
                    }`}
                >
                  {item.badge}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-on-surface-variant font-medium">
                    {item.updated}
                  </span>
                  <button
                    onClick={() => handleRemovePdf(item.id, item.title)}
                    title="Remove PDF"
                    aria-label={`Remove ${item.title}`}
                    className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                  >
                    <Icon name="trash" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-bold text-on-surface font-heading">{item.title}</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30 text-xs">
              <span className="text-[11px] font-semibold text-secondary">{item.category}</span>
              <button
                onClick={() => setSelectedPdf(item)}
                className="text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Read Reference</span>
                <Icon name="arrow-up-right" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-xs text-on-surface-variant">
          No matching references found. Click <strong>Add PDF Reference</strong> to upload one.
        </div>
      )}

      {/* Floating Add button — always visible */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        aria-label="Add PDF reference"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
      >
        <Icon name="plus" className="w-5 h-5" />
      </button>

      {showAddModal && (
        <AddPdfModal
          categories={categories.filter((c) => c !== 'All')}
          onCancel={() => setShowAddModal(false)}
          onAdd={handleAddPdf}
        />
      )}
    </div>
  );
};

// ---------- ADD PDF MODAL ----------
const AddPdfModal = ({ categories, onCancel, onAdd }) => {
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    title: '',
    category: categories[0] || 'Cardiology',
    badge: 'GUIDELINE',
    updated: 'Updated today',
    desc: '',
    critical: false,
  });
  const [fileName, setFileName] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file.');
      return;
    }
    setFileName(file.name);
    setPdfUrl(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return alert('Title is required.');
    if (!pdfUrl) return alert('Please attach a PDF file.');

    onAdd({
      ...form,
      title: form.title.trim(),
      desc: form.desc.trim() || 'No description provided.',
      pdf: pdfUrl,
    });

    setForm({
      title: '',
      category: categories[0] || 'Cardiology',
      badge: 'GUIDELINE',
      updated: 'Updated today',
      desc: '',
      critical: false,
    });
    setFileName('');
    setPdfUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl shadow-lg w-full max-w-lg p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface font-heading">Add PDF Reference</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <Icon name="close" className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-xs bg-surface-container-low border border-outline-variant/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. 2024 Sepsis Management Guideline"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-xs bg-surface-container-low border border-outline-variant/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-on-surface-variant">Badge</label>
              <input
                type="text"
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-xs bg-surface-container-low border border-outline-variant/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-on-surface-variant">Updated label</label>
              <input
                type="text"
                value={form.updated}
                onChange={(e) => setForm({ ...form, updated: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-xs bg-surface-container-low border border-outline-variant/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <label className="flex items-end gap-2 text-[11px] font-bold text-on-surface-variant pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.critical}
                onChange={(e) => setForm({ ...form, critical: e.target.checked })}
              />
              Mark as critical
            </label>
          </div>

          <div>
            <label className="text-[11px] font-bold text-on-surface-variant">Description</label>
            <textarea
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
              rows={3}
              className="mt-1 w-full px-3 py-2 text-xs bg-surface-container-low border border-outline-variant/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Short summary of the reference..."
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-on-surface-variant">PDF file</label>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center gap-1 cursor-pointer"
              >
                <Icon name="plus" className="w-3.5 h-3.5" />
                <span>Choose PDF</span>
              </button>
              <span className="text-[11px] text-on-surface-variant truncate">
                {fileName || 'No file selected'}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={handleFile}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-surface-container-low text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-xs cursor-pointer"
          >
            Add Reference
          </button>
        </div>
      </form>
    </div>
  );
};

export default KnowledgeBasePage;