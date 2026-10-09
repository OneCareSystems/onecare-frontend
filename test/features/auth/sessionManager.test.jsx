import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";

import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
} from "@testing-library/react";

import { Provider } from "react-redux";
import { MemoryRouter, useLocation } from "react-router-dom";

import { store } from "../../../src/app/store";
import {
  setSession,
  clearSession,
} from "../../../src/features/auth/authSlice";

vi.mock("../../../src/services/authService", () => ({
  logout: vi.fn(),
}));

vi.mock("../../../src/services/apiClient", () => ({
  startTokenRefreshScheduler: vi.fn(() => vi.fn()),
  SESSION_EXPIRED_EVENT: "session-expired",
}));

import { logout } from "../../../src/services/authService";
import SessionManager from "../../../src/features/auth/SessionManager.jsx";

const LocationDisplay = () => {
  const location = useLocation();

  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
};

const renderSessionManager = () =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <SessionManager />
        <LocationDisplay />
      </MemoryRouter>
    </Provider>,
  );

const advanceTime = async (milliseconds) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
};

describe("SessionManager — CFG-05", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    store.dispatch(clearSession());

    store.dispatch(
      setSession({
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresIn: 3600,
        role: "DOCTOR",
      }),
    );

    logout.mockReset();
    logout.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    store.dispatch(clearSession());
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("AC1: logs out after 30 minutes and redirects to login", async () => {
    renderSessionManager();

    await advanceTime(30 * 60 * 1000);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(store.getState().auth.accessToken).toBeNull();

    expect(screen.getByTestId("location").textContent).toBe(
      "/login?reason=session-expired",
    );
  });

  it("AC2: clears the session even when logout API fails", async () => {
    logout.mockRejectedValueOnce(new Error("Logout API failed"));

    renderSessionManager();

    await advanceTime(30 * 60 * 1000);

    expect(store.getState().auth.accessToken).toBeNull();
    expect(store.getState().auth.refreshToken).toBeNull();

    expect(screen.getByTestId("location").textContent).toBe(
      "/login?reason=session-expired",
    );
  });

  it("AC3: shows a warning after 28 minutes and resets after activity", async () => {
    renderSessionManager();

    await advanceTime(28 * 60 * 1000);

    expect(
      screen.getByRole("dialog", {
        name: /session expiring soon/i,
      }),
    ).toBeTruthy();

    fireEvent.keyDown(window, { key: "a" });

    expect(screen.queryByRole("dialog")).toBeNull();

    await advanceTime(28 * 60 * 1000);

    expect(
      screen.getByRole("dialog", {
        name: /session expiring soon/i,
      }),
    ).toBeTruthy();

    expect(logout).not.toHaveBeenCalled();
  });

  it("allows the user to stay signed in when the warning appears", async () => {
    renderSessionManager();

    await advanceTime(28 * 60 * 1000);

    fireEvent.click(
      screen.getByRole("button", {
        name: /stay signed in/i,
      }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    expect(store.getState().auth.accessToken).toBe(
      "test-access-token",
    );

    await advanceTime(28 * 60 * 1000);

    expect(
      screen.getByRole("dialog", {
        name: /session expiring soon/i,
      }),
    ).toBeTruthy();

    expect(logout).not.toHaveBeenCalled();
  });
});