const ACCESS_TOKEN_KEY = "oc_access_token";
const REFRESH_TOKEN_KEY = "oc_refresh_token";
const EXPIRES_AT_KEY = "oc_expires_at";

const hasStorage = () => typeof window !== "undefined" && window.localStorage;

const read = (key) => {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode/quota) — session stays in memory only */
  }
};

const remove = (key) => {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export const getAccessToken = () => read(ACCESS_TOKEN_KEY);

export const getRefreshToken = () => read(REFRESH_TOKEN_KEY);

export const getExpiresAt = () => {
  const raw = read(EXPIRES_AT_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

export const setTokens = ({ accessToken, refreshToken, expiresIn }) => {
  if (!accessToken) return;
  write(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) write(REFRESH_TOKEN_KEY, refreshToken);
  if (expiresIn != null) {
    write(EXPIRES_AT_KEY, String(Date.now() + Number(expiresIn) * 1000));
  }
};

export const clearTokens = () => {
  remove(ACCESS_TOKEN_KEY);
  remove(REFRESH_TOKEN_KEY);
  remove(EXPIRES_AT_KEY);
};

export const hasSession = () => Boolean(getAccessToken());
