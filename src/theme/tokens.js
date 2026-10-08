/**
 * CFG-01 — Theme tokens.
 *
 * Single source of truth for colours, typography and spacing.
 * Consumed by:
 *   - tailwind.config.js        (builds the Tailwind theme)
 *   - scripts/check-contrast.mjs (CI contrast gate)
 *   - src/pages/styleguide/*     (colour / type reference page)
 *
 * Components must never contain raw hex values — always use a token.
 */

export const colors = {
  primary: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },
  secondary: {
    50: "#f5f3ff",
    100: "#ede9fe",
    200: "#ddd6fe",
    300: "#c4b5fd",
    400: "#a78bfa",
    500: "#8b5cf6",
    600: "#7c3aed",
    700: "#6d28d9",
    800: "#5b21b6",
    900: "#4c1d95",
    950: "#2e1065",
  },
  success: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
    950: "#052e16",
  },
  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03",
  },
  danger: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
    950: "#450a0a",
  },
  neutral: {
    0: "#ffffff",
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
};

export const fontFamily = {
  sans: [
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Noto Sans Tamil",
    "Noto Sans",
    "Arial",
    "sans-serif",
  ],
  tamil: ["Noto Sans Tamil", "system-ui", "sans-serif"],
  mono: [
    "ui-monospace",
    "SFMono-Regular",
    "Consolas",
    "Liberation Mono",
    "monospace",
  ],
};

export const fontSize = {
  xs: ["0.8125rem", { lineHeight: "1.4" }],
  sm: ["0.9375rem", { lineHeight: "1.5" }],
  base: ["1.125rem", { lineHeight: "1.6" }],
  lg: ["1.25rem", { lineHeight: "1.55" }],
  xl: ["1.375rem", { lineHeight: "1.45" }],
  "2xl": ["1.75rem", { lineHeight: "1.35" }],
  "3xl": ["2.125rem", { lineHeight: "1.25" }],
  "4xl": ["2.5rem", { lineHeight: "1.15" }],
  "5xl": ["3rem", { lineHeight: "1.1" }],
};

const spacingSteps = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24,
  28, 32,
];

export const spacing = {
  px: "1px",
  ...Object.fromEntries(
    spacingSteps.map((step) => [step, `${step * 0.25}rem`]),
  ),
};

export const borderRadius = {
  none: "0px",
  sm: "0.25rem",
  DEFAULT: "0.5rem",
  md: "0.625rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.25rem",
  "3xl": "1.75rem",
  full: "9999px",
};

/**
 * Every text/background pair the UI is allowed to use.
 * Checked by scripts/check-contrast.mjs and src/utils/contrast.test.js (AC1/AC2).
 */
export const contrastPairs = [
  { id: "heading-on-page", fg: ["neutral", 900], bg: ["neutral", 0] },
  { id: "body-on-page", fg: ["neutral", 700], bg: ["neutral", 0] },
  { id: "body-on-subtle", fg: ["neutral", 700], bg: ["neutral", 50] },
  { id: "muted-on-page", fg: ["neutral", 600], bg: ["neutral", 0] },
  { id: "muted-on-subtle", fg: ["neutral", 600], bg: ["neutral", 100] },
  { id: "muted-strong-on-page", fg: ["neutral", 500], bg: ["neutral", 0] },
  { id: "link-on-page", fg: ["primary", 700], bg: ["neutral", 0] },
  { id: "link-on-primary-subtle", fg: ["primary", 700], bg: ["primary", 50] },
  { id: "label-on-primary-subtle", fg: ["primary", 800], bg: ["primary", 100] },
  {
    id: "label-on-secondary-subtle",
    fg: ["secondary", 800],
    bg: ["secondary", 100],
  },
  { id: "label-on-success-subtle", fg: ["success", 800], bg: ["success", 100] },
  { id: "label-on-warning-subtle", fg: ["warning", 900], bg: ["warning", 100] },
  { id: "label-on-danger-subtle", fg: ["danger", 800], bg: ["danger", 100] },
  { id: "label-on-neutral-subtle", fg: ["neutral", 800], bg: ["neutral", 100] },
  { id: "on-primary-button", fg: ["neutral", 0], bg: ["primary", 600] },
  { id: "on-primary-strong", fg: ["neutral", 0], bg: ["primary", 700] },
  { id: "on-secondary-button", fg: ["neutral", 0], bg: ["secondary", 700] },
  { id: "on-success-button", fg: ["neutral", 0], bg: ["success", 700] },
  { id: "on-warning-button", fg: ["neutral", 0], bg: ["warning", 800] },
  { id: "on-danger-button", fg: ["neutral", 0], bg: ["danger", 700] },
  { id: "success-text-on-page", fg: ["success", 700], bg: ["neutral", 0] },
  { id: "warning-text-on-page", fg: ["warning", 700], bg: ["neutral", 0] },
  { id: "danger-text-on-page", fg: ["danger", 700], bg: ["neutral", 0] },
  { id: "primary-text-on-page", fg: ["primary", 700], bg: ["neutral", 0] },
  { id: "on-dark-surface", fg: ["neutral", 50], bg: ["neutral", 900] },
  { id: "muted-on-dark-surface", fg: ["neutral", 300], bg: ["neutral", 900] },
  { id: "on-dark-card", fg: ["neutral", 100], bg: ["neutral", 800] },
];

export const themeTokens = {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
  contrastPairs,
};
