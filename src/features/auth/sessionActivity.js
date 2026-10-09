
const ACTIVE_USER_WINDOW_MS = 5 * 60 * 1000;

let lastActivityAt = Date.now();

export const recordUserActivity = () => {
  lastActivityAt = Date.now();
};

export const isUserActive = () => {
  return Date.now() - lastActivityAt < ACTIVE_USER_WINDOW_MS;
};