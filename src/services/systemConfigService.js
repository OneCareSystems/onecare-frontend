import apiClient from "./apiClient";
import { API_BASE_URL } from "./config";

/** Re-exported so the config screen can show the real fallback value. */
export { DEFAULT_EXPIRES_IN_SECONDS } from "./apiClient";

/**
 * Clinic configuration helpers (super-admin ops screen).
 *
 * The backend exposes no configuration endpoint (none is planned), so
 * this module only does two real, self-contained things:
 *
 * - testBackendHealth(): probes `{baseUrl}/health` with a hard time
 *   budget using plain fetch — deliberately NOT apiClient, so a public
 *   health probe never carries a Bearer token or triggers the 401
 *   refresh flow. Any HTTP answer (2xx or not) proves the gateway is
 *   up; only a network / CORS / timeout failure means "unreachable".
 *   The reference page's binary ok/not-ok loses that distinction.
 * - applySessionBaseUrl(): re-points the shared Axios client for the
 *   current browser session. Nothing is persisted: the build-time
 *   VITE_API_BASE_URL wins again on reload.
 */

export const HEALTH_TIMEOUT_MS = 5000;

export const DEFAULT_BASE_URL = API_BASE_URL ?? "";

/** Trim, drop trailing slashes and validate an absolute http(s) URL. */
export const normalizeBaseUrl = (value) => {
  const url = String(value ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!/^https?:\/\/[^\s/]+/i.test(url)) {
    return {
      ok: false,
      url,
      error: "Enter a full URL beginning with http:// or https://",
    };
  }
  return { ok: true, url, error: "" };
};

/**
 * GET {baseUrl}/health and classify the result honestly.
 *
 * Outcomes:
 * - "healthy"     HTTP 2xx from /health
 * - "responding"  any other HTTP status — the server answered, so the
 *                 gateway is up even if /health does not exist (401/404
 *                 still prove reachability)
 * - "timeout"     no response inside the time budget
 * - "unreachable" network error / CORS refusal / DNS failure
 * - "invalid"     base URL failed validation (nothing was sent)
 *
 * Never throws; callers branch on `outcome`.
 */
export const testBackendHealth = async (
  baseUrl,
  { fetchImpl, timeoutMs = HEALTH_TIMEOUT_MS } = {},
) => {
  const probe = fetchImpl ?? globalThis.fetch;
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized.ok || typeof probe !== "function") {
    return { outcome: "invalid", status: null };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await probe(`${normalized.url}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    return response?.ok
      ? { outcome: "healthy", status: response.status ?? 200 }
      : { outcome: "responding", status: response?.status ?? null };
  } catch (error) {
    return {
      outcome: error?.name === "AbortError" ? "timeout" : "unreachable",
      status: null,
    };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Point the shared Axios client at `baseUrl` for this session only.
 * Throws on an invalid URL so callers can surface the reason.
 */
export const applySessionBaseUrl = (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized.ok) throw new Error(normalized.error);
  apiClient.defaults.baseURL = normalized.url;
  return normalized.url;
};

export default {
  DEFAULT_BASE_URL,
  applySessionBaseUrl,
  normalizeBaseUrl,
  testBackendHealth,
};
