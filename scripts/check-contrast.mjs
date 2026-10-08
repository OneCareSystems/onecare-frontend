#!/usr/bin/env node
/**
 * CFG-01 contrast gate (AC1 / AC2).
 *
 * Computes the WCAG contrast ratio for every text/background token pair
 * declared in src/theme/tokens.js and fails the build when a pair is < 4.5:1.
 *
 * Wired into CI via `npm run check:contrast`.
 */

import { colors, contrastPairs } from "../src/theme/tokens.js";
import { runContrastCheck } from "../src/utils/contrast.js";

const { exitCode } = runContrastCheck({
  colors,
  pairs: contrastPairs,
  stdout: (message) => process.stdout.write(message),
  stderr: (message) => process.stderr.write(message),
});

process.exit(exitCode);
