import StatusBadge from "../../components/StatusBadge";
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
