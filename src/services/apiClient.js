import axios from "axios";
import { API_BASE_URL } from "./config";
import { store } from "../app/store";
import {
  clearSession,
  selectAccessToken,
  selectExpiresAt,
  selectRefreshToken,
  setSession,
} from "../features/auth/authSlice";

/**
 * CFG-02 — central Axios client (API Standards §49–50).
 *
 * - Request interceptor: attaches the Bearer token in one place only (§38).
 * - Response interceptor: 401 → single shared refresh then transparent retry;
 *   401 from the refresh endpoint (or a second 401) ends the session exactly
 *   once and sends the user to /login (no retry loop).
 * - 403 / 429 / 500: the standard {success, message, data} envelope is surfaced
 *   on the rejected error; the user is never logged out for these (§14–15, §44).
 *
 * Auth state lives in the Redux store (src/features/auth/authSlice.js), read
 * through selectors and written through dispatch — never in component-local
 * copies.
 * Never log tokens, passwords or request bodies.
 */

export const REFRESH_URL = "/auth/refresh";
export const LOGIN_PATH = "/login";
export const SESSION_EXPIRED_EVENT = "onecare:session-expired";
export const SESSION_EXPIRED_REASON = "session-expired";
export const DEFAULT_EXPIRES_IN_SECONDS = 1800;
export const REFRESH_LEEWAY_MS = 5 * 60 * 1000;

const NETWORK_MESSAGE = "Unable to reach the server. Please try again.";
const GENERIC_MESSAGE = "Something went wrong. Please try again.";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

const defaultNavigate = (to) => {
  if (typeof window !== "undefined" && window.location) {
    window.location.assign(to);
  }
};

let navigate = defaultNavigate;
let sessionExpired = false;
let refreshPromise = null;
const stopCallbacks = new Set();

/** Test/app seam: swap the redirect implementation (router navigate, spy, ...). */
export const setNavigator = (fn) => {
  navigate = typeof fn === "function" ? fn : defaultNavigate;
};

/**
 * Clear auth state and send the user to /login once.
 * Idempotent: concurrent failures share a single redirect.
 */
export const handleSessionExpired = () => {
  if (sessionExpired) return;
  sessionExpired = true;
  store.dispatch(clearSession());
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function"
  ) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  navigate(`${LOGIN_PATH}?reason=${SESSION_EXPIRED_REASON}`);
};

/** Call after a successful login so the next expiry can redirect again. */
export const resetAuthState = () => {
  sessionExpired = false;
};

/** Normalise an Axios error onto the standard envelope, without assuming more. */
export const normalizeError = (error) => {
  const response = error.response;
  const body = response?.data;
  const envelope =
    body && typeof body === "object" && !Array.isArray(body) ? body : null;

  error.status = response?.status ?? null;
  if (envelope && "success" in envelope) error.success = envelope.success;
  if (envelope && "data" in envelope) error.data = envelope.data;
  if (typeof envelope?.message === "string") error.message = envelope.message;

  if (typeof error.userMessage !== "string") {
    if (typeof envelope?.message === "string") {
      error.userMessage = envelope.message;
    } else if (!response) {
      error.userMessage = NETWORK_MESSAGE;
    } else {
      error.userMessage = GENERIC_MESSAGE;
    }
  }
  return error;
};

export const extractTokens = (payload) => {
  const data = payload?.data ?? payload ?? {};
  return {
    accessToken: data.accessToken ?? data.access_token ?? data.token ?? null,
    refreshToken: data.refreshToken ?? data.refresh_token ?? null,
    expiresIn: data.expiresIn ?? data.expires_in ?? DEFAULT_EXPIRES_IN_SECONDS,
  };
};

const withAuthHeader = (headers, token) => {
  const value = `Bearer ${token}`;
  if (!headers) return { Authorization: value };
  if (typeof headers.set === "function") {
    headers.set("Authorization", value);
    return headers;
  }
  headers.Authorization = value;
  return headers;
};

const cloneHeaders = (headers) => {
  if (!headers) return {};
  if (typeof headers.toJSON === "function") return { ...headers.toJSON() };
  return { ...headers };
};

const isRefreshRequest = (config) => {
  if (!config) return false;
  if (config._isRefresh) return true;
  const url = config.url ?? "";
  if (url === REFRESH_URL || url.endsWith(REFRESH_URL)) return true;
  return `${config.baseURL ?? ""}${url}`.includes("/auth/refresh");
};

const performRefresh = async () => {
  const refreshToken = selectRefreshToken(store.getState());
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }
  const response = await apiClient.post(
    REFRESH_URL,
    { refreshToken },
    { skipAuth: true, _isRefresh: true },
  );
  const tokens = extractTokens(response.data);
  if (!tokens.accessToken) {
    throw new Error("Refresh response did not include an access token");
  }
  store.dispatch(setSession(tokens));
  sessionExpired = false;
  return tokens.accessToken;
};

/**
 * Single-flight refresh: concurrent 401s share one refresh call.
 * A failure rejects every waiter; no caller retries.
 */
export const refreshSession = () => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = performRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
};

apiClient.interceptors.request.use((config) => {
  if (config.skipAuth) return config;
  const token = selectAccessToken(store.getState());
  if (token) config.headers = withAuthHeader(config.headers, token);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;

    if (!config) return Promise.reject(normalizeError(error));

    if (status === 401) {
      if (isRefreshRequest(config) || config._retry) {
        handleSessionExpired();
        return Promise.reject(normalizeError(error));
      }
      if (config.skipAuth) {
        // Public endpoint (e.g. wrong credentials on login): surface the
        // envelope, do not refresh and do not end the session.
        return Promise.reject(normalizeError(error));
      }
      config._retry = true;
      try {
        await refreshSession();
        // Fresh headers so the request interceptor attaches the new token
        // without mutating the failed attempt's config.
        return await apiClient({
          ...config,
          headers: cloneHeaders(config.headers),
        });
      } catch {
        handleSessionExpired();
        return Promise.reject(normalizeError(error));
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

/**
 * Proactive refresh (SDS §2.5.1): fires ~5 minutes before expiry (expiresIn
 * 1800 s) and only while the user is active — an idle session is never
 * extended (FR008). `isUserActive` is supplied by CFG-05 and defaults to
 * inactive-safe.
 *
 * Returns a stop function.
 */
export const startTokenRefreshScheduler = ({
  isUserActive = () => false,
  checkIntervalMs = 60 * 1000,
  now = () => Date.now(),
  leewayMs = REFRESH_LEEWAY_MS,
} = {}) => {
  const tick = () => {
    if (refreshPromise) return;
    const expiresAt = selectExpiresAt(store.getState());
    if (!expiresAt) return;
    if (expiresAt - now() > leewayMs) return;
    if (!isUserActive()) return;
    // A failed proactive refresh does not end the session here; the next real
    // call receives a 401 and runs the full refresh / session-expired flow.
    refreshSession().catch(() => {});
  };

  const intervalId = setInterval(tick, checkIntervalMs);
  const stop = () => {
    clearInterval(intervalId);
    stopCallbacks.delete(stop);
  };
  stopCallbacks.add(stop);
  return stop;
};

/** Test seam: reset module state (flag, in-flight refresh, schedulers, navigator). */
export const __resetAuthState = () => {
  sessionExpired = false;
  refreshPromise = null;
  stopCallbacks.forEach((stop) => stop());
  stopCallbacks.clear();
  navigate = defaultNavigate;
};

export default apiClient;
