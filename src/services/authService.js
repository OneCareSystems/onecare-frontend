import apiClient, {
  extractTokens,
  refreshSession,
  resetAuthState,
} from "./apiClient";
import { store } from "../app/store";
import {
  clearSession,
  selectIsAuthenticated,
  setSession,
} from "../features/auth/authSlice";

/**
 * CFG-02 — auth service (API Standards §7: /auth endpoints).
 * All calls go through the central client so interceptors apply.
 */

export const login = async (credentials) => {
  const response = await apiClient.post("/auth/login", credentials, {
    skipAuth: true,
  });
  const tokens = extractTokens(response.data);
  if (!tokens.accessToken) {
    throw new Error("Login response did not include an access token");
  }
  store.dispatch(setSession(tokens));
  resetAuthState();
  return response.data;
};

export const refresh = () => refreshSession();

export const logout = async () => {
  try {
    await apiClient.post("/auth/logout");
  } catch {
    /* best effort — local state is cleared regardless */
  } finally {
    store.dispatch(clearSession());
    resetAuthState();
  }
};

export const getCurrentUser = () => apiClient.get("/auth/me");

export const isAuthenticated = () => selectIsAuthenticated(store.getState());

const authService = { login, refresh, logout, getCurrentUser, isAuthenticated };

export default authService;
