const ACTIVE_USER_WINDOW_MS = 5 * 60 * 1000;

let lastActivityAt = Date.now();

export const recordUserActivity = () => {
  lastActivityAt = Date.now();
};

export const isUserActive = () => {
  return Date.now() - lastActivityAt < ACTIVE_USER_WINDOW_MS;
};

/**
 * Whether the JWT may be extended right now.
 *
 * The inactivity logout above still uses `isUserActive` (mouse/keyboard), but
 * the *token* is refreshed whenever the document is visible. A clinician
 * reading a chart without touching the mouse must not be logged out by an
 * expiring JWT, so visibility — not pointer movement — is the gate here.
 *
 * A hidden tab is never refreshed: the browser throttles its timers anyway and
 * the user is presumed away. On returning, the next scheduler tick (at most
 * 60 s later) picks the session back up — and any call made in between is
 * covered by the reactive 401 refresh.
 */
export const isTabVisible = () => {
  if (typeof document === "undefined") return true;
  return document.visibilityState !== "hidden";
};
