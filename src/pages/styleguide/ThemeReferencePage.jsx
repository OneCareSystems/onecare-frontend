import IconButton from "../../components/IconButton";
import Icon from "../../components/Icon";
import StatusBadge from "../../components/StatusBadge";
import Table from "../../components/Table";
import {
  borderRadius,
  colors,
  contrastPairs,
  fontFamily,
  fontSize,
  spacing,
} from "../../theme/tokens";
import { evaluateContrastPairs } from "../../utils/contrast";

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const TYPE_SAMPLES = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
};

const TYPE_LABELS = {
  xs: "Caption / helper text",
  sm: "Secondary label",
  base: "Body copy — default for all pages",
  lg: "Lead paragraph",
  xl: "Card title",
  "2xl": "Section heading",
  "3xl": "Page sub-heading",
  "4xl": "Page heading",
  "5xl": "Hero heading",
};

const STATUS_EXAMPLES = [
  { status: "success", label: "Prescription dispensed" },
  { status: "warning", label: "Appointment due soon" },
  { status: "danger", label: "Payment failed" },
  { status: "info", label: "Refill requested" },
  { status: "neutral", label: "Draft" },
];

/**
 * CFG-07 — medical icon set (client feedback #4). Rendered with the
 * shared Icon component so the styleguide always shows the real registry.
 */
const MEDICAL_ICON_EXAMPLES = [
  { name: "stethoscope", label: "Consultation" },
  { name: "pill", label: "Medication" },
  { name: "calendar", label: "Appointment" },
  { name: "heart-pulse", label: "Vitals" },
  { name: "syringe", label: "Immunisation" },
  { name: "thermometer", label: "Temperature" },
  { name: "hospital", label: "Ward" },
  { name: "microscope", label: "Laboratory" },
  { name: "test-tube", label: "Pathology" },
  { name: "clipboard", label: "Notes" },
  { name: "users", label: "Patients" },
  { name: "shield-plus", label: "First aid" },
];

/**
 * CFG-07 AC3 demo — a deliberately wide table. At a 360 px viewport it
 * overflows its own scroll container (`overflow-x-auto` region in Table)
 * without producing a page-level horizontal scrollbar.
 */
const WIDE_TABLE_COLUMNS = [
  { key: "mrn", header: "Medical record no." },
  { key: "patient", header: "Patient name" },
  { key: "dob", header: "Date of birth" },
  { key: "appointment", header: "Appointment" },
  { key: "clinician", header: "Clinician" },
  { key: "department", header: "Department" },
  { key: "status", header: "Status" },
  { key: "prescription", header: "Prescription" },
  { key: "notes", header: "Notes" },
];

const WIDE_TABLE_ROWS = [
  {
    id: 1,
    mrn: "MRN-000184722",
    patient: "Anandhi Rajendran",
    dob: "1984-03-12",
    appointment: "2026-10-14 09:30",
    clinician: "Dr house",
    department: "General medicine",
    status: "scheduled",
    prescription: "Metformin 500 mg, twice daily",
    notes: "Fasting glucose review due",
  },
  {
    id: 2,
    mrn: "MRN-000184933",
    patient: "Kumaravel Subramanian",
    dob: "1971-11-02",
    appointment: "2026-10-14 10:15",
    clinician: "Dr Nila",
    department: "Cardiology",
    status: "arrived",
    prescription: "Atorvastatin 20 mg, nightly",
    notes: "ECG on arrival",
  },
  {
    id: 3,
    mrn: "MRN-000185104",
    patient: "Mary Josephine",
    dob: "1996-07-25",
    appointment: "2026-10-14 11:00",
    clinician: "Dr arun",
    department: "Paediatrics",
    status: "completed",
    prescription: "Amoxicillin 250 mg, three times daily",
    notes: "Follow-up in two weeks",
  },
];

const SPACING_SAMPLES = [1, 2, 4, 8, 12, 16];

const RADIUS_SAMPLES = [
  { className: "rounded-sm", label: "rounded-sm" },
  { className: "rounded-md", label: "rounded-md" },
  { className: "rounded-xl", label: "rounded-xl" },
  { className: "rounded-2xl", label: "rounded-2xl" },
  { className: "rounded-full", label: "rounded-full" },
];

const SECTION_TITLE = "mt-10 mb-4 text-2xl font-bold text-neutral-900";

const ThemeReferencePage = () => {
  const report = evaluateContrastPairs(contrastPairs, colors);

  return (
    <div className="page-container py-10">
      <h1 className="text-4xl font-bold text-neutral-900">Theme reference</h1>
      <p className="mt-3 max-w-3xl text-lg text-neutral-600">
        Every colour, font and spacing value used by OneCare is declared once in{" "}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-sm text-neutral-800">
          src/theme/tokens.js
        </code>{" "}
        and consumed through Tailwind token classes. Components never carry raw
        hex values, so a token change is reflected everywhere on the next build.
      </p>

      <section aria-labelledby="colours-heading">
        <h2 id="colours-heading" className={SECTION_TITLE}>
          Colours
        </h2>
        <p className="mb-4 text-base text-neutral-700">
          Pairs below are checked against the WCAG 2.1 minimum of 4.5:1 for
          normal text.
        </p>
        <div className="space-y-6">
          {Object.entries(colors).map(([family, shades]) => (
            <div key={family}>
              <h3 className="mb-2 text-lg font-semibold capitalize text-neutral-800">
                {family}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {SHADES.map((shade) => (
                  <div key={shade} className="flex flex-col gap-1">
                    <div
                      className="h-14 rounded-lg border border-neutral-200"
                      style={{ backgroundColor: shades[shade] }}
                    />
                    <span className="text-sm font-semibold text-neutral-700">
                      {family}-{shade}
                    </span>
                    <span className="font-mono text-xs uppercase text-neutral-600">
                      {shades[shade]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="contrast-heading">
        <h2 id="contrast-heading" className={SECTION_TITLE}>
          Contrast checks
        </h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">
              Contrast ratio of every declared text and background token pair
            </caption>
            <thead>
              <tr className="bg-neutral-100 text-neutral-800">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Pair
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Foreground
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Background
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Ratio
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {report.results.map((result) => (
                <tr key={result.id} className="border-t border-neutral-200">
                  <td className="px-4 py-2 font-mono text-xs text-neutral-700">
                    {result.id}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs uppercase text-neutral-700">
                    {result.foreground}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs uppercase text-neutral-700">
                    {result.background}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-700">
                    {result.ratio}:1
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={result.passes ? "success" : "danger"}>
                      {result.passes ? "Pass" : "Fail"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="type-heading">
        <h2 id="type-heading" className={SECTION_TITLE}>
          Typography
        </h2>
        <p className="mb-4 text-base text-neutral-700">
          Base size is {fontSize.base[0]} for comfortable reading; the scale
          above it keeps a clear heading hierarchy.
        </p>
        <div className="space-y-4 rounded-xl border border-neutral-200 p-6">
          {Object.keys(TYPE_SAMPLES).map((size) => (
            <div
              key={size}
              className="flex flex-wrap items-baseline gap-4 border-b border-neutral-100 pb-3"
            >
              <span className="w-28 shrink-0 font-mono text-xs text-neutral-600">
                text-{size}
              </span>
              <span className={TYPE_SAMPLES[size]}>{TYPE_LABELS[size]}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 p-6">
            <p className="mb-2 font-mono text-xs text-neutral-600">font-sans</p>
            <p className={TYPE_SAMPLES.lg}>
              Readable English copy for every page.
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 p-6">
            <p className="mb-2 font-mono text-xs text-neutral-600">
              font-tamil
            </p>
            <p className={`${TYPE_SAMPLES.lg} font-tamil`}>
              நோயாளர்களுக்கு எளிதாகப் படிக்கக்கூடிய எழுத்துரு.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg bg-primary-600 px-5 py-3 text-base font-semibold text-neutral-0"
          >
            Primary action
          </button>
          <button
            type="button"
            className="rounded-lg bg-secondary-700 px-5 py-3 text-base font-semibold text-neutral-0"
          >
            Secondary action
          </button>
          <button
            type="button"
            className="rounded-lg bg-danger-700 px-5 py-3 text-base font-semibold text-neutral-0"
          >
            Destructive action
          </button>
          <button
            type="button"
            className="rounded-lg border border-neutral-300 bg-neutral-0 px-5 py-3 text-base font-semibold text-neutral-700"
          >
            Cancel
          </button>
        </div>
      </section>

      <section aria-labelledby="status-heading">
        <h2 id="status-heading" className={SECTION_TITLE}>
          Status indicators
        </h2>
        <p className="mb-4 text-base text-neutral-700">
          Status always combines colour with an icon and a text label, so it
          never depends on colour alone.
        </p>
        <div className="flex flex-wrap gap-3">
          {STATUS_EXAMPLES.map((example) => (
            <StatusBadge key={example.status} status={example.status}>
              {example.label}
            </StatusBadge>
          ))}
        </div>
      </section>

      <section aria-labelledby="icons-heading">
        <h2 id="icons-heading" className={SECTION_TITLE}>
          Medical icons
        </h2>
        <p className="mb-4 text-base text-neutral-700">
          The shared{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-sm text-neutral-800">
            Icon
          </code>{" "}
          component exposes one medical icon set (client feedback #4). Icons
          next to a text label are decorative; standalone icons carry an ARIA
          label so screen readers announce them.
        </p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MEDICAL_ICON_EXAMPLES.map((icon) => (
            <li
              key={icon.name}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4"
            >
              <Icon
                name={icon.name}
                size="1.5rem"
                className="shrink-0 text-primary-600"
              />
              <span className="text-sm font-semibold text-neutral-800">
                {icon.label}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="icon-buttons-heading">
        <h2 id="icon-buttons-heading" className={SECTION_TITLE}>
          Icon-only buttons
        </h2>
        <p className="mb-4 text-base text-neutral-700">
          Icon-only controls always expose an ARIA label (AC2), so a screen
          reader announces the action instead of &ldquo;button&rdquo;. Each
          button keeps a ≥ 44 × 44 px touch target and the shared
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-sm text-neutral-800">
            {" "}
            :focus-visible{" "}
          </code>
          ring.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <IconButton icon="refresh" label="Refresh queue" />
          <IconButton icon="print" label="Print prescription" />
          <IconButton icon="pencil" label="Edit appointment" />
          <IconButton
            icon="trash"
            label="Cancel appointment"
            variant="danger"
          />
        </div>
      </section>

      <section aria-labelledby="wide-table-heading">
        <h2 id="wide-table-heading" className={SECTION_TITLE}>
          Wide table
        </h2>
        <p className="mb-4 text-base text-neutral-700">
          Wide tables scroll inside their own container (AC3). On a 360 px
          screen the table region below scrolls horizontally while the page
          itself never scrolls sideways.
        </p>
        <Table
          label="Example appointment list"
          columns={WIDE_TABLE_COLUMNS}
          data={WIDE_TABLE_ROWS}
          getRowKey={(row) => row.id}
        />
      </section>

      <section aria-labelledby="spacing-heading">
        <h2 id="spacing-heading" className={SECTION_TITLE}>
          Spacing &amp; radius
        </h2>
        <div className="space-y-3 rounded-xl border border-neutral-200 p-6">
          {SPACING_SAMPLES.map((step) => (
            <div key={step} className="flex items-center gap-4">
              <span className="w-20 shrink-0 font-mono text-xs text-neutral-600">
                {step}
              </span>
              <span
                className="block h-6 rounded bg-primary-500"
                style={{ width: spacing[step] }}
              />
              <span className="font-mono text-xs text-neutral-600">
                {spacing[step]}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          {RADIUS_SAMPLES.map((sample) => (
            <div key={sample.label} className="text-center">
              <div
                className={`mb-2 h-16 w-16 border-2 border-primary-500 bg-primary-100 ${sample.className}`}
              />
              <span className="font-mono text-xs text-neutral-600">
                {sample.label}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 font-mono text-xs text-neutral-600">
          borderRadius token values:{" "}
          {Object.entries(borderRadius)
            .map(([key, value]) => `${key}=${value}`)
            .join(", ")}
        </p>
      </section>

      <section aria-labelledby="fonts-heading">
        <h2 id="fonts-heading" className={SECTION_TITLE}>
          Font stacks
        </h2>
        <ul className="space-y-2 text-base text-neutral-700">
          {Object.entries(fontFamily).map(([key, stack]) => (
            <li key={key}>
              <span className="font-semibold text-neutral-800">{key}:</span>{" "}
              <span className="font-mono text-sm text-neutral-600">
                {stack.join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default ThemeReferencePage;
