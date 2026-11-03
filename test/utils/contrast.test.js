import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { colors, contrastPairs } from "../../src/theme/tokens";
import {
  MIN_CONTRAST_RATIO,
  contrastRatio,
  evaluateContrastPairs,
  hexToRgbTriplet,
  parseHexColor,
  relativeLuminance,
  resolveColorPath,
  runContrastCheck,
} from "../../src/utils/contrast";

const collect = () => {
  const stdout = [];
  const stderr = [];
  return {
    stdout,
    stderr,
    writeOut: (message) => stdout.push(message),
    writeErr: (message) => stderr.push(message),
  };
};

describe("AC1 — happy path: every declared token pair is ≥ 4.5:1", () => {
  it("checks every pair declared in the theme tokens", () => {
    const report = evaluateContrastPairs(contrastPairs, colors);

    expect(report.results).toHaveLength(contrastPairs.length);
    expect(report.results.length).toBeGreaterThan(0);
  });

  it("reports a ratio ≥ 4.5:1 for each pair", () => {
    const report = evaluateContrastPairs(contrastPairs, colors);

    for (const result of report.results) {
      expect(
        result.ratio,
        `${result.id} = ${result.ratio}:1`,
      ).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
      expect(result.passes).toBe(true);
    }
  });

  it("passes the contrast gate with exit code 0", () => {
    const streams = collect();

    const { exitCode, report } = runContrastCheck({
      colors,
      pairs: contrastPairs,
      stdout: streams.writeOut,
      stderr: streams.writeErr,
    });

    expect(exitCode).toBe(0);
    expect(report.failures).toHaveLength(0);
    expect(streams.stdout.join("")).toContain("All token pairs meet");
    expect(streams.stderr.join("")).toBe("");
  });

  it("runs the CLI gate successfully", () => {
    const script = path.resolve(process.cwd(), "scripts/check-contrast.mjs");
    const output = execFileSync(process.execPath, [script], {
      encoding: "utf8",
    });

    expect(output).toContain("Contrast check");
    expect(output).toContain("All token pairs meet");
  });
});

describe("AC2 — error handling: a failing pair is flagged and fails the check", () => {
  const badPair = {
    id: "muted-on-page-weak",
    fg: ["neutral", 400],
    bg: ["neutral", 0],
  };

  it("flags a pair below 4.5:1", () => {
    const report = evaluateContrastPairs([badPair], colors);

    expect(report.passed).toBe(false);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0].id).toBe("muted-on-page-weak");
    expect(report.failures[0].ratio).toBeLessThan(MIN_CONTRAST_RATIO);
  });

  it("returns a failing exit code and reports the offending pair", () => {
    const streams = collect();

    const { exitCode, report } = runContrastCheck({
      colors,
      pairs: contrastPairs.concat(badPair),
      stdout: streams.writeOut,
      stderr: streams.writeErr,
    });

    expect(exitCode).toBe(1);
    expect(report.passed).toBe(false);
    expect(streams.stderr.join("")).toContain("muted-on-page-weak");
    expect(streams.stderr.join("")).toContain("Contrast check failed");
    expect(streams.stdout.join("")).toContain("[FAIL]");
  });

  it("keeps failing until the token is corrected", () => {
    const fixedPair = {
      id: "muted-on-page-weak",
      fg: ["neutral", 600],
      bg: ["neutral", 0],
    };

    const failing = runContrastCheck({ colors, pairs: [badPair] });
    const corrected = runContrastCheck({ colors, pairs: [fixedPair] });

    expect(failing.exitCode).toBe(1);
    expect(corrected.exitCode).toBe(0);
  });
});

describe("contrast maths", () => {
  it("computes black on white as 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("computes identical colours as 1:1", () => {
    expect(contrastRatio("#2563eb", "#2563eb")).toBeCloseTo(1, 10);
  });

  it("matches the WCAG reference value for #767676 on white", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.6);
  });

  it("computes relative luminance for black and white", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 10);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 10);
  });

  it("expands shorthand hex colours", () => {
    expect(parseHexColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor("2563eb")).toEqual({ r: 37, g: 99, b: 235 });
  });

  it("rejects invalid hex colours", () => {
    expect(() => parseHexColor("not-a-colour")).toThrow("Invalid hex colour");
    expect(() => parseHexColor(42)).toThrow(TypeError);
  });

  it("formats a triplet for CSS rgb() output", () => {
    expect(hexToRgbTriplet("#2563eb")).toBe("37 99 235");
  });

  it("resolves token paths against the palette", () => {
    expect(resolveColorPath(colors, ["primary", 600])).toBe(
      colors.primary[600],
    );
    expect(resolveColorPath(colors, "#abcdef")).toBe("#abcdef");
    expect(() => resolveColorPath(colors, ["primary", 123])).toThrow(
      "Unknown colour token",
    );
  });
});
