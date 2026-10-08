import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import apiClient, {
  __resetAuthState,
  handleSessionExpired,
  refreshSession,
  setNavigator,
  startTokenRefreshScheduler,
  SESSION_EXPIRED_EVENT,
} from "../../src/services/apiClient";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "../../src/services/tokenStore";

const ok = (data, message = "ok") => ({ success: true, message, data });
const fail = (message) => ({ success: false, message, data: null });

const header = (config, name) => {
  const headers = config?.headers;
  if (!headers) return undefined;
  if (typeof headers.get === "function") {
    const value = headers.get(name);
    return value === undefined ? undefined : value;
  }
  return headers[name] ?? headers[name.toLowerCase()];
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let mock;
let navigate;

beforeEach(() => {
  __resetAuthState();
  clearTokens();
  navigate = vi.fn();
  setNavigator(navigate);
  mock = new MockAdapter(apiClient);
});

afterEach(() => {
  mock.restore();
  __resetAuthState();
  clearTokens();
  vi.restoreAllMocks();
});

describe("AC1 — request interceptor attaches the Bearer token", () => {
  it("attaches the token once to a protected call", async () => {
    setTokens({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 1800,
    });
    mock.onGet("/patients/42").reply(200, ok({ id: 42 }));

    const response = await apiClient.get("/patients/42");

    expect(response.status).toBe(200);
    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.post).toHaveLength(0);
    expect(header(mock.history.get[0], "Authorization")).toBe(
      "Bearer access-1",
    );
  });

  it("sends no Authorization header when there is no token", async () => {
    mock.onGet("/public/config").reply(200, ok({}));

    await apiClient.get("/public/config");

    expect(header(mock.history.get[0], "Authorization")).toBeUndefined();
  });

  it("does not attach a token to skipAuth requests", async () => {
    setTokens({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 1800,
    });
    mock.onPost("/auth/login").reply(200, ok({ accessToken: "fresh" }));

    await apiClient.post("/auth/login", { user: "a" }, { skipAuth: true });

    expect(header(mock.history.post[0], "Authorization")).toBeUndefined();
  });
});

describe("AC2 — 401 refreshes once and retries every call", () => {
  it("shares a single refresh across concurrent 401s and retries all", async () => {
    setTokens({
      accessToken: "expired-access",
      refreshToken: "refresh-1",
      expiresIn: 1800,
    });
    let tokenValid = false;

    mock
      .onGet(/\/reports\/.*/)
      .reply((config) =>
        tokenValid
          ? [200, ok({ id: config.url })]
          : [401, fail("Access token expired")],
      );
    mock.onPost("/auth/refresh").reply(() => {
      tokenValid = true;
      return [
        200,
        ok({
          accessToken: "new-access",
          refreshToken: "new-refresh",
          expiresIn: 1800,
        }),
      ];
    });

    const results = await Promise.all([
      apiClient.get("/reports/a"),
      apiClient.get("/reports/b"),
      apiClient.get("/reports/c"),
    ]);

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(mock.history.post).toHaveLength(1);
    expect(mock.history.get).toHaveLength(6);
    const retried = mock.history.get.filter(
      (entry) => header(entry, "Authorization") === "Bearer new-access",
    );
    expect(retried).toHaveLength(3);
    expect(getAccessToken()).toBe("new-access");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("refreshSession returns the same in-flight promise", async () => {
    setTokens({
      accessToken: "expired-access",
      refreshToken: "refresh-1",
      expiresIn: 1800,
    });
    mock.onPost("/auth/refresh").reply(
      200,
      ok({
        accessToken: "new-access",
        refreshToken: "new-refresh",
        expiresIn: 1800,
      }),
    );

    const [first, second] = await Promise.all([
      refreshSession(),
      refreshSession(),
    ]);

    expect(first).toBe("new-access");
    expect(second).toBe("new-access");
    expect(mock.history.post).toHaveLength(1);
  });
});

describe("AC3 — failed refresh ends the session exactly once", () => {
  it("rejects, does not retry, clears auth and redirects to /login", async () => {
    setTokens({
      accessToken: "expired-access",
      refreshToken: "bad-refresh",
      expiresIn: 1800,
    });
    mock.onGet("/reports/a").reply(401, fail("Access token expired"));
    mock.onPost("/auth/refresh").reply(401, fail("Refresh token invalid"));

    const received = await apiClient.get("/reports/a").then(
      () => null,
      (error) => error,
    );

    expect(received.status).toBe(401);
    expect(received.userMessage).toBe("Access token expired");
    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.post).toHaveLength(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login?reason=session-expired");
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("redirects only once for concurrent failures", async () => {
    setTokens({
      accessToken: "expired-access",
      refreshToken: "bad-refresh",
      expiresIn: 1800,
    });
    const events = [];
    const listener = () => events.push(SESSION_EXPIRED_EVENT);
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    mock.onGet(/\/reports\/.*/).reply(401, fail("Access token expired"));
    mock.onPost("/auth/refresh").reply(401, fail("Refresh token invalid"));

    await Promise.all([
      apiClient.get("/reports/a").catch(() => {}),
      apiClient.get("/reports/b").catch(() => {}),
    ]);

    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(events).toHaveLength(1);
    expect(mock.history.post).toHaveLength(1);
  });

  it("ends the session without calling refresh when no refresh token exists", async () => {
    setTokens({ accessToken: "expired-access", expiresIn: 1800 });
    mock.onGet("/reports/a").reply(401, fail("Access token expired"));

    await apiClient.get("/reports/a").catch(() => {});

    expect(mock.history.post).toHaveLength(0);
    expect(navigate).toHaveBeenCalledWith("/login?reason=session-expired");
    expect(getAccessToken()).toBeNull();
  });

  it("does not treat a 401 from a public (skipAuth) call as a session failure", async () => {
    mock.onPost("/auth/login").reply(401, fail("Invalid credentials"));

    const received = await apiClient
      .post("/auth/login", { email: "a@b.c" }, { skipAuth: true })
      .then(
        () => null,
        (error) => error,
      );

    expect(received.userMessage).toBe("Invalid credentials");
    expect(mock.history.post).toHaveLength(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not loop when the retry itself is a 401", async () => {
    setTokens({
      accessToken: "expired-access",
      refreshToken: "refresh-1",
      expiresIn: 1800,
    });
    mock.onGet("/reports/a").reply(401, fail("Access token expired"));
    mock.onPost("/auth/refresh").reply(
      200,
      ok({
        accessToken: "new-access",
        refreshToken: "new-refresh",
        expiresIn: 1800,
      }),
    );

    await apiClient.get("/reports/a").catch(() => {});

    expect(mock.history.get).toHaveLength(2);
    expect(mock.history.post).toHaveLength(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

describe("AC4 — proactive refresh honours activity", () => {
  it("refreshes once before expiry while the user is active", async () => {
    setTokens({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 1800,
    });
    mock.onPost("/auth/refresh").reply(
      200,
      ok({
        accessToken: "access-2",
        refreshToken: "refresh-2",
        expiresIn: 7200,
      }),
    );

    const base = Date.now();
    let clock = base;
    const stop = startTokenRefreshScheduler({
      isUserActive: () => true,
      checkIntervalMs: 5,
      now: () => clock,
    });

    clock = base + 10 * 60 * 1000;
    await wait(40);
    expect(mock.history.post).toHaveLength(0);

    clock = base + 26 * 60 * 1000;
    await wait(40);
    expect(mock.history.post).toHaveLength(1);
    expect(getAccessToken()).toBe("access-2");

    clock = base + 30 * 60 * 1000;
    await wait(40);
    expect(mock.history.post).toHaveLength(1);

    stop();
  });

  it("never refreshes proactively while the user is idle", async () => {
    setTokens({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 1800,
    });
    mock.onPost("/auth/refresh").reply(
      200,
      ok({
        accessToken: "access-2",
        refreshToken: "refresh-2",
        expiresIn: 7200,
      }),
    );

    const base = Date.now();
    let clock = base;
    const stop = startTokenRefreshScheduler({
      isUserActive: () => false,
      checkIntervalMs: 5,
      now: () => clock,
    });

    clock = base + 60 * 60 * 1000;
    await wait(40);
    expect(mock.history.post).toHaveLength(0);
    expect(getAccessToken()).toBe("access-1");

    stop();
    clock = base + 120 * 60 * 1000;
    await wait(40);
    expect(mock.history.post).toHaveLength(0);
  });

  it("does nothing without an expiry timestamp", async () => {
    const stop = startTokenRefreshScheduler({
      isUserActive: () => true,
      checkIntervalMs: 5,
    });
    await wait(30);
    expect(mock.history.post).toHaveLength(0);
    stop();
  });
});

describe("AC5 — 403 / 429 / 500 surface the envelope without logging out", () => {
  it.each([
    [403, "You do not have permission to view this resource"],
    [429, "Too many requests. Please slow down."],
    [500, "Internal server error"],
  ])(
    "surfaces the message for %i and keeps the session",
    async (status, message) => {
      setTokens({
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresIn: 1800,
      });
      mock.onGet("/reports/summary").reply(status, {
        success: false,
        message,
        data: { retryAfter: 30 },
      });

      const received = await apiClient.get("/reports/summary").then(
        () => null,
        (error) => error,
      );

      expect(received.status).toBe(status);
      expect(received.success).toBe(false);
      expect(received.message).toBe(message);
      expect(received.userMessage).toBe(message);
      expect(received.data).toEqual({ retryAfter: 30 });
      expect(getAccessToken()).toBe("access-1");
      expect(navigate).not.toHaveBeenCalled();
      expect(mock.history.post).toHaveLength(0);
    },
  );

  it("falls back to a generic message when the body is not the envelope", async () => {
    mock.onGet("/reports/summary").reply(500, "<html>boom</html>");

    const received = await apiClient.get("/reports/summary").then(
      () => null,
      (error) => error,
    );

    expect(received.status).toBe(500);
    expect(received.userMessage).toBe(
      "Something went wrong. Please try again.",
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("keeps the session on a network error", async () => {
    setTokens({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 1800,
    });
    mock.onGet("/reports/summary").networkError();

    const received = await apiClient.get("/reports/summary").then(
      () => null,
      (error) => error,
    );

    expect(received.status).toBeNull();
    expect(received.userMessage).toBe(
      "Unable to reach the server. Please try again.",
    );
    expect(getAccessToken()).toBe("access-1");
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("edge cases and seams", () => {
  it("falls back to window.location.assign when no navigator is injected", () => {
    setNavigator(undefined);

    expect(() => handleSessionExpired()).not.toThrow();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("rejects when the refresh payload carries no access token", async () => {
    setTokens({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 1800,
    });
    mock.onPost("/auth/refresh").reply(200, ok({}));

    await expect(refreshSession()).rejects.toThrow(/access token/i);
    expect(navigate).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("access-1");
  });

  it("skips scheduler ticks while a refresh is already in flight", async () => {
    setTokens({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 1800,
    });
    mock.onPost("/auth/refresh").reply(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve([
                200,
                ok({
                  accessToken: "access-2",
                  refreshToken: "refresh-2",
                  expiresIn: 7200,
                }),
              ]),
            60,
          ),
        ),
    );

    let active = true;
    const clock = Date.now() + 26 * 60 * 1000;
    const inFlight = refreshSession();
    const stop = startTokenRefreshScheduler({
      isUserActive: () => active,
      checkIntervalMs: 5,
      now: () => clock,
    });

    await wait(40);
    expect(mock.history.post).toHaveLength(1);

    active = false;
    await inFlight;
    stop();
    expect(mock.history.post).toHaveLength(1);
    expect(getAccessToken()).toBe("access-2");
  });

  it("is inactive-safe when no isUserActive callback is supplied", async () => {
    setTokens({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 60,
    });
    mock.onPost("/auth/refresh").reply(
      200,
      ok({
        accessToken: "access-2",
        refreshToken: "refresh-2",
        expiresIn: 7200,
      }),
    );

    const stop = startTokenRefreshScheduler({ checkIntervalMs: 5 });
    await wait(50);
    stop();

    expect(mock.history.post).toHaveLength(0);
    expect(getAccessToken()).toBe("access-1");
  });

  it("swallows a failed proactive refresh without ending the session", async () => {
    setTokens({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 60,
    });
    mock
      .onPost("/auth/refresh")
      .reply(500, { success: false, message: "boom", data: null });

    const stop = startTokenRefreshScheduler({
      isUserActive: () => true,
      checkIntervalMs: 5,
    });
    await wait(50);
    stop();

    expect(mock.history.post.length).toBeGreaterThan(0);
    expect(navigate).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("access-1");
  });

  it("__resetAuthState stops running schedulers", async () => {
    setTokens({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 60,
    });
    mock.onPost("/auth/refresh").reply(
      200,
      ok({
        accessToken: "access-2",
        refreshToken: "refresh-2",
        expiresIn: 7200,
      }),
    );

    startTokenRefreshScheduler({
      isUserActive: () => true,
      checkIntervalMs: 5,
    });
    __resetAuthState();

    await wait(50);
    expect(mock.history.post).toHaveLength(0);
  });
});
