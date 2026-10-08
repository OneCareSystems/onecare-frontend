const ACCESS_TOKEN_KEY = "oc_access_token";
const REFRESH_TOKEN_KEY = "oc_refresh_token";
const EXPIRES_AT_KEY = "oc_expires_at";

const hasLocalStorage = () =>
  typeof window !== "undefined" && window.localStorage;

const readStoredValue = (key) => {
  if (!hasLocalStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStoredValue = (key, value) => {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode/quota) - session stays in memory only */
  }
};

const removeStoredValue = (key) => {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export const getAccessToken = () => readStoredValue(ACCESS_TOKEN_KEY);

export const getRefreshToken = () => readStoredValue(REFRESH_TOKEN_KEY);

export const getExpiresAt = () => {
  const raw = readStoredValue(EXPIRES_AT_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

export const setTokens = ({ accessToken, refreshToken, expiresIn }) => {
  if (!accessToken) return;
  writeStoredValue(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) writeStoredValue(REFRESH_TOKEN_KEY, refreshToken);
  if (expiresIn != null) {
    writeStoredValue(
      EXPIRES_AT_KEY,
      String(Date.now() + Number(expiresIn) * 1000),
    );
  }
};

export const clearTokens = () => {
  removeStoredValue(ACCESS_TOKEN_KEY);
  removeStoredValue(REFRESH_TOKEN_KEY);
  removeStoredValue(EXPIRES_AT_KEY);
};

export const hasSession = () => Boolean(getAccessToken());
