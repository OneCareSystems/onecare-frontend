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

export const forgotPassword = async (email) => {
  const response = await apiClient.post(
    "/auth/forgot-password",
    { email },
    { skipAuth: true }
  );
  return response.data;
};

export const resetPassword = async (token, newPassword) => {
  const response = await apiClient.post(
    "/auth/reset-password",
    { token, newPassword },
    { skipAuth: true }
  );
  return response.data;
};

export const isAuthenticated = () => selectIsAuthenticated(store.getState());

const authService = {
  login,
  refresh,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  isAuthenticated,
};

export default authService;
