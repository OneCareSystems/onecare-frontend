// CFG-02 — configuration read point (DDP-#49 / DKR-03).
//
// Precedence for the API base URL:
//   1. Runtime file  /config.json  (written at container start, not cached)
//   2. Build-time    VITE_API_BASE_URL
//   3. Default       "/api" (same origin; nginx/Vite proxies it)
//
// The runtime file carries PUBLIC settings only — never secrets. A missing
// or partial file must never crash the app: everything falls back silently.

/** Normalise a base URL: trim and strip trailing slashes. Empty → null. */
export const normalizeBaseUrl = (value) =>
  typeof value === "string" ? value.trim().replace(/\/+$/, "") || null : null;

let runtimeConfig = {};

/**
 * Merge a runtime configuration object (from /config.json) into the module
 * state. Values here override build-time defaults. Non-objects are ignored.
 */
export const applyRuntimeConfig = (config) => {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    runtimeConfig = { ...runtimeConfig, ...config };
  }
  return runtimeConfig;
};

/** The current runtime configuration (for tests/diagnostics). */
export const getRuntimeConfig = () => ({ ...runtimeConfig });

/**
 * Resolve the API base URL with the precedence above. Safe to call at any
 * time; after loadRuntimeConfig() resolves it reflects the runtime file.
 */
export const resolveApiBaseUrl = ({
  runtime = runtimeConfig,
  env = import.meta.env,
} = {}) =>
  normalizeBaseUrl(runtime.apiBaseUrl) ||
  normalizeBaseUrl(env.VITE_API_BASE_URL) ||
  "/api";

// Build-time resolution, kept for the Axios client created at module load
// (src/services/apiClient.js) and for environments with no fetch step.
export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Fetch the runtime configuration before the app boots. Called once from
 * main.jsx. Any failure (404, network, invalid JSON) leaves the build-time
 * defaults in place — the app still starts (AC3).
 */
export const loadRuntimeConfig = async (url = "/config.json") => {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return runtimeConfig;
    applyRuntimeConfig(await response.json());
  } catch {
    // Missing or unreachable config file: fall back to build-time defaults.
  }
  return runtimeConfig;
};
