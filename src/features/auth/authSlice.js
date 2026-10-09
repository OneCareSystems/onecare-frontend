import { createSlice } from "@reduxjs/toolkit";

/**
 * CFG-02 auth feature — pure Redux (in-memory), no persistence layer.
 * The session therefore ends on a page reload; the login ticket owns
 * re-authentication. Tokens are never written to storage or logged.
 */
const initialState = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  role: null,
  redirectUrl: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action) {
      const { accessToken, refreshToken, expiresIn, role, redirectUrl } =
        action.payload ?? {};
      if (!accessToken) return;
      state.accessToken = accessToken;
      if (refreshToken) state.refreshToken = refreshToken;
      if (expiresIn != null) {
        const seconds = Number(expiresIn);
        state.expiresAt =
          Number.isFinite(seconds) && seconds > 0
            ? Date.now() + seconds * 1000
            : null;
      }
      if (role) state.role = role;
      if (redirectUrl) state.redirectUrl = redirectUrl;
    },
    clearSession(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.expiresAt = null;
      state.role = null;
      state.redirectUrl = null;
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;

export const selectAccessToken = (state) => state.auth.accessToken;
export const selectRefreshToken = (state) => state.auth.refreshToken;
export const selectExpiresAt = (state) => state.auth.expiresAt;
export const selectRole = (state) => state.auth.role;
export const selectRedirectUrl = (state) => state.auth.redirectUrl;
export const selectIsAuthenticated = (state) => Boolean(state.auth.accessToken);

export default authSlice.reducer;
