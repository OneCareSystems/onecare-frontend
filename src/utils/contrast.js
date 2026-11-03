/**
 * WCAG 2.1 contrast helpers (SC 1.4.3 — text contrast ≥ 4.5:1).
 * Used by the CI contrast gate, the unit tests and the reference page.
 */

export const MIN_CONTRAST_RATIO = 4.5;

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function parseHexColor(hex) {
  if (typeof hex !== "string") {
    throw new TypeError(`Expected a hex colour string, received ${typeof hex}`);
  }
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) {
    throw new Error(`Invalid hex colour: "${hex}"`);
  }
  let digits = match[1];
  if (digits.length === 3) {
    digits = digits
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16),
  };
}

export function hexToRgbTriplet(hex) {
  const { r, g, b } = parseHexColor(hex);
  return `${r} ${g} ${b}`;
}

function channelLuminance(value) {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const { r, g, b } = parseHexColor(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

export function contrastRatio(foreground, background) {
  const lighter = relativeLuminance(foreground);
  const darker = relativeLuminance(background);
  const light = Math.max(lighter, darker);
  const dark = Math.min(lighter, darker);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Resolves a token path such as ["primary", 600] against the colour palette.
 * Plain hex strings are returned as-is so callers can pass either form.
 */
export function resolveColorPath(colors, path) {
  if (typeof path === "string") {
    return path;
  }
  const value = path.reduce(
    (node, key) => (node == null ? node : node[key]),
    colors,
  );
  if (typeof value !== "string") {
    throw new Error(`Unknown colour token: ${path.join(".")}`);
  }
  return value;
}

/**
 * Checks every declared text/background pair against the minimum ratio.
 * Returns a report so both the CLI gate and the unit tests can consume it.
 */
export function evaluateContrastPairs(
  pairs,
  colors,
  minRatio = MIN_CONTRAST_RATIO,
) {
  const results = pairs.map((pair) => {
    const foreground = resolveColorPath(colors, pair.fg);
    const background = resolveColorPath(colors, pair.bg);
    const ratio = contrastRatio(foreground, background);
    return {
      id: pair.id,
      fg: pair.fg,
      bg: pair.bg,
      foreground,
      background,
      ratio: Number(ratio.toFixed(2)),
      minRatio,
      passes: ratio >= minRatio,
    };
  });

  return {
    passed: results.every((result) => result.passes),
    results,
    failures: results.filter((result) => !result.passes),
  };
}

function pairLabel(result) {
  return `${result.fg.join(".")} on ${result.bg.join(".")}`;
}

/**
 * Runs the contrast gate over a colour palette and writes a human readable
 * report. Returns the process exit code: 0 when every pair passes, 1 when at
 * least one pair is flagged (AC2).
 */
export function runContrastCheck({
  colors,
  pairs,
  minRatio = MIN_CONTRAST_RATIO,
  stdout = () => {},
  stderr = () => {},
}) {
  const report = evaluateContrastPairs(pairs, colors, minRatio);

  stdout(
    `Contrast check — ${report.results.length} token pairs (min ${minRatio}:1)\n`,
  );
  for (const result of report.results) {
    const status = result.passes ? "PASS" : "FAIL";
    stdout(
      `  [${status}] ${result.id.padEnd(28)} ${result.foreground} on ${result.background} = ${result.ratio}:1\n`,
    );
  }

  if (!report.passed) {
    stderr("\nContrast check failed — the following pairs are below 4.5:1:\n");
    for (const failure of report.failures) {
      stderr(
        `  ✗ ${failure.id} (${pairLabel(failure)}) — ${failure.ratio}:1 < ${failure.minRatio}:1\n`,
      );
    }
    stderr("Fix the token colours in src/theme/tokens.js and re-run.\n");
    return { exitCode: 1, report };
  }

  stdout("\nAll token pairs meet the 4.5:1 contrast requirement.\n");
  return { exitCode: 0, report };
}
