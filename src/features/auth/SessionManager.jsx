
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import {
  clearSession,
  selectIsAuthenticated,
} from "./authSlice";

import { store } from "../../app/store";
import { logout } from "../../services/authService";

import {
  startTokenRefreshScheduler,
  SESSION_EXPIRED_EVENT,
} from "../../services/apiClient";

// Session configuration
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_LOGOUT_MS = 2 * 60 * 1000;
const WARNING_AFTER_MS =
  SESSION_TIMEOUT_MS - WARNING_BEFORE_LOGOUT_MS;

// Refresh only when there was recent user activity.
const ACTIVE_USER_WINDOW_MS = 5 * 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "mousemove",
];

let lastActivityAt = Date.now();

export const isUserActive = () => {
  return Date.now() - lastActivityAt < ACTIVE_USER_WINDOW_MS;
};

const SessionManager = () => {
  const navigate = useNavigate();

  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(120);

  const warningTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  const resetTimersRef = useRef(null);
  const warningVisibleRef = useRef(false);
  const loggingOutRef = useRef(false);

  // Clear all session timers.
  const clearTimers = useCallback(() => {
    window.clearTimeout(warningTimerRef.current);
    window.clearTimeout(logoutTimerRef.current);
    window.clearInterval(countdownTimerRef.current);

    warningTimerRef.current = null;
    logoutTimerRef.current = null;
    countdownTimerRef.current = null;
  }, []);

  // End the session. Local state is cleared even if logout fails.
  const endSession = useCallback(
    async (reason = "session-expired") => {
      if (loggingOutRef.current) return;

      loggingOutRef.current = true;

      clearTimers();
      warningVisibleRef.current = false;
      setShowWarning(false);

      try {
        await logout();
      } catch {
        // Local logout must still happen if the API fails.
      } finally {
        store.dispatch(clearSession());

        navigate(`/login?reason=${reason}`, {
          replace: true,
        });

        loggingOutRef.current = false;
      }
    },
    [clearTimers, navigate],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      warningVisibleRef.current = false;
      setShowWarning(false);
      resetTimersRef.current = null;

      return undefined;
    }

    lastActivityAt = Date.now();
    loggingOutRef.current = false;

    // Start the warning and automatic logout timers.
    const resetTimers = () => {
      clearTimers();

      warningTimerRef.current = window.setTimeout(() => {
        warningVisibleRef.current = true;
        setShowWarning(true);
        setRemainingSeconds(
          WARNING_BEFORE_LOGOUT_MS / 1000,
        );

        countdownTimerRef.current = window.setInterval(() => {
          setRemainingSeconds((seconds) =>
            Math.max(0, seconds - 1),
          );
        }, 1000);
      }, WARNING_AFTER_MS);

      logoutTimerRef.current = window.setTimeout(() => {
        void endSession("session-expired");
      }, SESSION_TIMEOUT_MS);
    };

    resetTimersRef.current = resetTimers;

    // Reset the session whenever the user is active.
    const handleActivity = () => {
      if (loggingOutRef.current) return;

      lastActivityAt = Date.now();

      if (warningVisibleRef.current) {
        warningVisibleRef.current = false;
        setShowWarning(false);
      }

      resetTimers();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(
        eventName,
        handleActivity,
        { passive: true },
      );
    });

    resetTimers();

    // Use the existing CFG-02 token refresh scheduler.
    const stopScheduler = startTokenRefreshScheduler({
      isUserActive,
    });

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          handleActivity,
        );
      });

      clearTimers();
      stopScheduler();
      resetTimersRef.current = null;
    };
  }, [
    isAuthenticated,
    clearTimers,
    endSession,
  ]);

  // Handle session expiry reported by the API client.
  useEffect(() => {
    const handleSessionExpired = () => {
      warningVisibleRef.current = false;
      clearTimers();
      setShowWarning(false);

      // Avoid navigating to the login page repeatedly.
      if (window.location.pathname !== "/login") {
        navigate("/login?reason=session-expired", {
          replace: true,
        });
      }
    };

    window.addEventListener(
      SESSION_EXPIRED_EVENT,
      handleSessionExpired,
    );

    return () => {
      window.removeEventListener(
        SESSION_EXPIRED_EVENT,
        handleSessionExpired,
      );
    };
  }, [clearTimers, navigate]);

  // The user chooses to continue the session.
  const continueSession = () => {
    if (loggingOutRef.current) return;

    lastActivityAt = Date.now();

    warningVisibleRef.current = false;
    setShowWarning(false);

    // Reset BOTH the warning and logout timers.
    resetTimersRef.current?.();
  };

  // Do not show the dialog after logout.
  if (!isAuthenticated || !showWarning) {
    return null;
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = String(remainingSeconds % 60).padStart(
    2,
    "0",
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2
          id="session-warning-title"
          className="text-xl font-semibold text-gray-900"
        >
          Session expiring soon
        </h2>

        <p className="mt-3 text-gray-700">
          You will be logged out due to inactivity in{" "}
          <strong>
            {minutes}:{seconds}
          </strong>
          . Continue your session to stay signed in.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => void endSession("logout")}
            className="rounded-lg border border-gray-300 px-4 py-2"
          >
            Log out
          </button>

          <button
            type="button"
            onClick={continueSession}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionManager;