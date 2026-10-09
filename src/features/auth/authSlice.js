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

  user: null,
  role: null,
  authStatus: "unauthenticated",
  mustChangePassword: false,
  redirectUrl: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action) {
      const {
        accessToken,
        refreshToken,
        expiresIn,
        user,
        role,
        redirectUrl,
        mustChangePassword,
      } = action.payload ?? {};

      // A payload without an access token is not a session — ignore it
      // entirely so we never store a refresh token (or role) with no access
      // token to use it with.
      if (!accessToken) {
        return;
      }

      state.accessToken = accessToken;

      if (refreshToken) {
        state.refreshToken = refreshToken;
      }

      if (expiresIn != null) {
        const seconds = Number(expiresIn);

        state.expiresAt =
          Number.isFinite(seconds) && seconds > 0
            ? Date.now() + seconds * 1000
            : null;
      }

      if (user !== undefined) {
        state.user = user;
      }

      if (role) {
        state.role = role;
      }

      if (redirectUrl) {
        state.redirectUrl = redirectUrl;
      }

      if (mustChangePassword !== undefined) {
        state.mustChangePassword = Boolean(mustChangePassword);
      }

      state.authStatus = "authenticated";
    },

    setMustChangePassword(state, action) {
      state.mustChangePassword = Boolean(action.payload);
    },

    clearSession(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.expiresAt = null;
      state.user = null;
      state.role = null;
      state.authStatus = "unauthenticated";
      state.mustChangePassword = false;
      state.redirectUrl = null;
    },
  },
});

export const { setSession, setMustChangePassword, clearSession } =
  authSlice.actions;

export const selectAccessToken = (state) => state.auth.accessToken;

export const selectRefreshToken = (state) => state.auth.refreshToken;

export const selectExpiresAt = (state) => state.auth.expiresAt;

export const selectRole = (state) => state.auth.role;

export const selectUser = (state) => state.auth.user;

export const selectAuthStatus = (state) => state.auth.authStatus;

export const selectMustChangePassword = (state) =>
  state.auth.mustChangePassword;

export const selectRedirectUrl = (state) => state.auth.redirectUrl;

export const selectIsAuthenticated = (state) =>
  state.auth.authStatus === "authenticated" && Boolean(state.auth.accessToken);

export default authSlice.reducer;
