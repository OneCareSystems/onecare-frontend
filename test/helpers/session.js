import { store } from "../../src/app/store";
import {
  clearSession,
  selectAccessToken,
  selectRefreshToken,
  setSession,
} from "../../src/features/auth/authSlice";

/**
 * Test helpers: auth state lives in the Redux store, so tests seed it by
 * dispatching and read it through selectors — never through storage.
 */
export const setTokens = (payload) => store.dispatch(setSession(payload));

export const clearTokens = () => store.dispatch(clearSession());

export const getAccessToken = () => selectAccessToken(store.getState());

export const getRefreshToken = () => selectRefreshToken(store.getState());
