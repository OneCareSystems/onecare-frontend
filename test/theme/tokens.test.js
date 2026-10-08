import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  borderRadius,
  colors,
  contrastPairs,
  fontFamily,
  fontSize,
  spacing,
  themeTokens,
} from "../../src/theme/tokens";

const EXPECTED_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const HEX_PATTERN = /#[0-9a-f]{3,8}\b/i;

const listSourceFiles = (directory) => {
  const entries = readdirSync(directory);
  return entries.flatMap((entry) => {
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) {
      return listSourceFiles(absolute);
    }
    return entry.endsWith(".jsx") ? [absolute] : [];
  });
};

describe("theme tokens", () => {
  it("exposes every palette family required by CFG-01", () => {
    expect(Object.keys(colors)).toEqual(
      expect.arrayContaining([
        "primary",
        "secondary",
        "success",
        "warning",
        "danger",
        "neutral",
      ]),
    );
  });

  it("declares a complete shade ramp for every family", () => {
    for (const [family, shades] of Object.entries(colors)) {
      const keys = Object.keys(shades).map(Number);
      const expected =
        family === "neutral" ? [0, ...EXPECTED_SHADES] : EXPECTED_SHADES;
      expect(keys, family).toEqual(expected);
      for (const hex of Object.values(shades)) {
        expect(hex, `${family} ${hex}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("uses a larger base font size for readability (client feedback #2)", () => {
    expect(fontSize.base[0]).toBe("1.125rem");
    expect(parseFloat(fontSize.base[0])).toBeGreaterThan(1);
    expect(Object.keys(fontSize)).toEqual(
      expect.arrayContaining([
        "xs",
        "sm",
        "base",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
      ]),
    );
    for (const [key, [, options]] of Object.entries(fontSize)) {
      expect(options.lineHeight, `line height for ${key}`).toBeTruthy();
    }
  });

  it("includes a Tamil-capable font in the primary font stack (CFG-06)", () => {
    expect(fontFamily.sans.join(" ").toLowerCase()).toContain(
      "noto sans tamil",
    );
    expect(fontFamily.tamil[0].toLowerCase()).toContain("noto sans tamil");
  });

  it("declares spacing and radius scales", () => {
    expect(spacing.px).toBe("1px");
    expect(spacing[1]).toBe("0.25rem");
    expect(spacing[4]).toBe("1rem");
    expect(borderRadius["2xl"]).toBe("1.25rem");
    expect(borderRadius.full).toBe("9999px");
  });

  it("declares unique contrast pairs that resolve to hex colours", () => {
    const ids = contrastPairs.map((pair) => pair.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pair of contrastPairs) {
      expect(() => themeTokens.colors[pair.fg[0]][pair.fg[1]]).not.toThrow();
      expect(themeTokens.colors[pair.fg[0]][pair.fg[1]]).toMatch(/^#/i);
      expect(themeTokens.colors[pair.bg[0]][pair.bg[1]]).toMatch(/^#/i);
    }
  });
});

describe("AC3 — no raw colour values in components", () => {
  it("keeps every hex value inside src/theme/tokens.js", () => {
    const offenders = listSourceFiles(path.resolve(process.cwd(), "src"))
      .filter((file) => !file.includes(`theme${path.sep}`))
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .map((line, index) => ({ line, index: index + 1 }))
          .filter(({ line }) => HEX_PATTERN.test(line))
          .map(
            ({ line, index }) =>
              `${path.relative(process.cwd(), file)}:${index} ${line.trim()}`,
          ),
      );

    expect(offenders).toEqual([]);
  });
});
