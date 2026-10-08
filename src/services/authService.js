import apiClient, {
  extractTokens,
  refreshSession,
  resetAuthState,
} from "./apiClient";
import { clearTokens, hasSession, setTokens } from "./tokenStore";

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
  setTokens(tokens);
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
    clearTokens();
    resetAuthState();
  }
};

export const getCurrentUser = () => apiClient.get("/auth/me");

export const isAuthenticated = () => hasSession();

const authService = { login, refresh, logout, getCurrentUser, isAuthenticated };
export default authService;
