import {
  readFileSync,
  mkdtempSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { render } from "@testing-library/react";
import postcss from "postcss";
import path from "node:path";
import tailwindcssPostcss from "@tailwindcss/postcss";
import { describe, expect, it } from "vitest";
import config from "../../../tailwind.config.js";
import { colors, contrastPairs, fontSize } from "../../../src/theme/tokens.js";
import { evaluateContrastPairs } from "../../../src/utils/contrast.js";
import ThemeReferencePage from "../../../src/pages/styleguide/ThemeReferencePage.jsx";

const INDEX_CSS = path.resolve(process.cwd(), "src/index.css");
const SOURCE_CSS = readFileSync(INDEX_CSS, "utf8");

const buildCss = async (overrides = {}) => {
  if (!Object.keys(overrides).length) {
    const result = await postcss([tailwindcssPostcss()]).process(SOURCE_CSS, {
      from: INDEX_CSS,
    });
    return result.css;
  }

  const directory = mkdtempSync(path.join(tmpdir(), "onecare-theme-"));
  const configPath = path.join(directory, "tailwind.config.mjs");
  try {
    writeFileSync(
      configPath,
      `export default ${JSON.stringify({ ...config, ...overrides })};`,
    );
    const source = SOURCE_CSS.replace(
      '@config "../tailwind.config.js";',
      `@config "${configPath.replaceAll("\\", "/")}";`,
    );
    const result = await postcss([tailwindcssPostcss()]).process(source, {
      from: INDEX_CSS,
    });
    return result.css;
  } finally {
    unlinkSync(configPath);
    rmdirSync(directory);
  }
};

const collectUsedClasses = (container) => {
  const classes = new Set();
  for (const element of container.querySelectorAll("*")) {
    for (const name of element.classList) {
      classes.add(name);
    }
  }
  return [...classes];
};

describe("Colour / type reference page", () => {
  it("renders the palette, type scale and contrast results", () => {
    const { container } = render(<ThemeReferencePage />);

    expect(screenHeading(container, "Theme reference")).toBeTruthy();
    expect(container.textContent).toContain("primary-600");
    expect(container.textContent).toContain("text-base");
    expect(container.textContent).toContain("Status indicators");

    for (const pair of contrastPairs) {
      expect(container.textContent).toContain(pair.id);
    }
  });

  it("only uses token utilities — no raw colours in the markup", () => {
    const source = readFileSync(
      path.resolve(
        process.cwd(),
        "src/pages/styleguide/ThemeReferencePage.jsx",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("shows every declared pair as passing on the page", () => {
    const report = evaluateContrastPairs(contrastPairs, colors);

    expect(report.passed).toBe(true);
    expect(report.results.every((result) => result.ratio >= 4.5)).toBe(true);
  });
});

describe("AC3 — integration: theme token change rebuilds everywhere", () => {
  it("builds CSS containing the declared token values from the page markup", async () => {
    const { container } = render(<ThemeReferencePage />);
    const css = await buildCss();

    expect(collectUsedClasses(container).length).toBeGreaterThan(10);
    expect(ruleFor(css, ".bg-primary-600")).toContain(colors.primary[600]);
    expect(ruleFor(css, ".bg-primary-700")).toContain(colors.primary[700]);
    expect(css).toContain(`font-size: ${fontSize.base[0]}`); // 18px base type
    expect(css).toContain(".rounded-2xl");
  });

  it("reflects a token change in the rebuilt CSS with no component edits", async () => {
    const { container } = render(<ThemeReferencePage />);
    const usedClasses = collectUsedClasses(container);
    const originalColor = colors.primary[600];

    const before = await buildCss();
    expect(ruleFor(before, ".bg-primary-600")).toContain(originalColor);

    const changedColors = structuredClone(colors);
    changedColors.primary[600] = colors.secondary[600];
    const replacementColor = changedColors.primary[600];

    const after = await buildCss({
      theme: {
        ...config.theme,
        extend: { ...config.theme.extend, colors: changedColors },
      },
    });

    // Scoped to the token's own rule: other selectors (e.g. Tailwind's
    // default blue-600) may coincidentally share the same RGB value.
    const changedRule = ruleFor(after, ".bg-primary-600");
    expect(changedRule).toContain(replacementColor);
    expect(changedRule).not.toContain(originalColor);

    // The component markup is untouched — the same token classes are still emitted.
    expect(usedClasses).toContain("bg-primary-600");
    expect(after).toContain(".bg-primary-600");
    expect(after).toContain(`font-size: ${fontSize.base[0]}`);
  });
});

function ruleFor(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{[^}]*\\}`).exec(css);
  return match ? match[0] : "";
}

function screenHeading(container, text) {
  return [...container.querySelectorAll("h1")].find(
    (heading) => heading.textContent === text,
  );
}
