import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import ClinicReportsPage from "./ClinicReportsPage";
import PharmacyReportsPage from "../shared/PharmacyReportsPage";

const REPORT_SECTIONS = [
  { id: "clinic", label: "Clinic Reports" },
  { id: "pharmacy", label: "Pharmacy Reports" },
];

const VALID_SECTIONS = new Set(REPORT_SECTIONS.map((s) => s.id));

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("section");
  const activeSection = VALID_SECTIONS.has(requested) ? requested : "clinic";

  const tabRefs = useRef({});

  /* Normalize an invalid ?section=foo back to the default. */
  useEffect(() => {
    if (requested && !VALID_SECTIONS.has(requested)) {
      const next = new URLSearchParams(searchParams);
      next.delete("section");
      setSearchParams(next, { replace: true });
    }
  }, [requested, searchParams, setSearchParams]);

  const selectSection = useCallback(
    (section) => {
      // Preserve unrelated params; only toggle `section`.
      const next = new URLSearchParams(searchParams);
      if (section === "clinic") next.delete("section");
      else next.set("section", section);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const focusTab = (id) => tabRefs.current[id]?.focus();

  const onKeyDown = (event) => {
    const idx = REPORT_SECTIONS.findIndex((s) => s.id === activeSection);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = REPORT_SECTIONS[(idx + 1) % REPORT_SECTIONS.length];
      selectSection(next.id);
      focusTab(next.id);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prev =
        REPORT_SECTIONS[
          (idx - 1 + REPORT_SECTIONS.length) % REPORT_SECTIONS.length
        ];
      selectSection(prev.id);
      focusTab(prev.id);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectSection(REPORT_SECTIONS[0].id);
      focusTab(REPORT_SECTIONS[0].id);
    } else if (event.key === "End") {
      event.preventDefault();
      const last = REPORT_SECTIONS[REPORT_SECTIONS.length - 1];
      selectSection(last.id);
      focusTab(last.id);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      {/* ---- Tab bar (aligned with report content padding) ---- */}
      <div
        role="tablist"
        aria-label="Report type"
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-2 px-4 pt-4 sm:px-6 sm:pt-6"
      >
        {REPORT_SECTIONS.map(({ id, label }) => {
          const selected = activeSection === id;
          return (
            <button
              key={id}
              ref={(el) => (tabRefs.current[id] = el)}
              id={`report-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`report-panel-${id}`}
              tabIndex={selected ? 0 : -1}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 ${
                selected
                  ? "bg-primary-600 text-white shadow-xs"
                  : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
              onClick={() => selectSection(id)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ---- Panel ---- */}
      <div
        key={activeSection}
        id={`report-panel-${activeSection}`}
        role="tabpanel"
        aria-labelledby={`report-tab-${activeSection}`}
        tabIndex={-1}
      >
        {activeSection === "clinic" ? (
          <ClinicReportsPage />
        ) : (
          <PharmacyReportsPage />
        )}
      </div>
    </div>
  );
}