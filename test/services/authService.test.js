import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import apiClient, { __resetAuthState } from "../../src/services/apiClient";
import authService, {
  login,
  logout,
  refresh,
  getCurrentUser,
  isAuthenticated,
} from "../../src/services/authService";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from "../helpers/session";
import { store } from "../../src/app/store";
import { selectRole, selectUser } from "../../src/features/auth/authSlice";

const ok = (data, message = "ok") => ({ success: true, message, data });

const header = (config, name) => {
  const headers = config?.headers;
  if (!headers) return undefined;
  if (typeof headers.get === "function") return headers.get(name);
  return headers[name] ?? headers[name.toLowerCase()];
};

let mock;

beforeEach(() => {
  __resetAuthState();
  clearTokens();
  mock = new MockAdapter(apiClient);
});

afterEach(() => {
  mock.restore();
  __resetAuthState();
  clearTokens();
});

describe("authService", () => {
  it("login stores tokens and resets the expired-session flag", async () => {
    mock.onPost("/auth/login").reply(
      200,
      ok({
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresIn: 1800,
      }),
    );

    const payload = await login({ email: "a@b.c", password: "secret" });

    expect(payload.data.accessToken).toBe("access-1");
    expect(getAccessToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");
    expect(isAuthenticated()).toBe(true);
    expect(header(mock.history.post[0], "Authorization")).toBeUndefined();
  });

  it("login accepts camelCase payloads", async () => {
    mock
      .onPost("/auth/login")
      .reply(200, ok({ accessToken: "a", refreshToken: "r", expiresIn: 1800 }));

    await login({ email: "a@b.c", password: "secret" });

    expect(getAccessToken()).toBe("a");
  });

  it("login stores the role and username from the response for the route guard (AC1)", async () => {
    mock.onPost("/auth/login").reply(
      200,
      ok({
        accessToken: "a",
        refreshToken: "r",
        expiresIn: 1800,
        role: "DOCTOR",
        username: "dr.house",
      }),
    );

    await login({ email: "d@o.c", password: "x" });

    expect(selectRole(store.getState())).toBe("DOCTOR");
    expect(selectUser(store.getState())).toBe("dr.house");
  });

  it("login throws when the response carries no access token", async () => {
    mock.onPost("/auth/login").reply(200, ok({}));

    await expect(login({ email: "a@b.c", password: "x" })).rejects.toThrow(
      /access token/i,
    );
    expect(isAuthenticated()).toBe(false);
  });

  it("login failure surfaces the envelope and keeps no session", async () => {
    mock.onPost("/auth/login").reply(401, {
      success: false,
      message: "Invalid credentials",
      data: null,
    });

    const error = await login({ email: "a@b.c", password: "wrong" }).catch(
      (e) => e,
    );

    expect(error.userMessage).toBe("Invalid credentials");
    expect(isAuthenticated()).toBe(false);
  });

  it("refresh goes through the central client once", async () => {
    mock.onPost("/auth/login").reply(
      200,
      ok({
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresIn: 1800,
      }),
    );
    await login({ email: "a@b.c", password: "x" });
    mock.onPost("/auth/refresh").reply(
      200,
      ok({
        accessToken: "access-2",
        refreshToken: "refresh-2",
        expiresIn: 1800,
      }),
    );

    const token = await refresh();

    expect(token).toBe("access-2");
    expect(mock.history.post).toHaveLength(2);
    expect(header(mock.history.post[1], "Authorization")).toBeUndefined();
    expect(getRefreshToken()).toBe("refresh-2");
  });

  it("logout clears local state even when the API call fails", async () => {
    mock.onPost("/auth/login").reply(
      200,
      ok({
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresIn: 1800,
      }),
    );
    await login({ email: "a@b.c", password: "x" });
    mock.onPost("/auth/logout").reply(500, {
      success: false,
      message: "Internal server error",
      data: null,
    });

    await logout();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it("getCurrentUser sends the Bearer token", async () => {
    mock.onPost("/auth/login").reply(
      200,
      ok({
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresIn: 1800,
      }),
    );
    await login({ email: "a@b.c", password: "x" });
    mock.onGet("/auth/me").reply(200, ok({ id: 7 }));

    const response = await getCurrentUser();

    expect(response.data.data).toEqual({ id: 7 });
    expect(header(mock.history.get[0], "Authorization")).toBe(
      "Bearer access-1",
    );
  });

  it("isAuthenticated is false with a cleared store", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("exposes the service surface", () => {
    expect(Object.keys(authService).sort()).toEqual([
      "forgotPassword",
      "getCurrentUser",
      "isAuthenticated",
      "login",
      "logout",
      "refresh",
      "resetPassword",
    ]);
  });

  it("forgotPassword sends post to /auth/forgot-password with email and skipAuth", async () => {
    mock.onPost("/auth/forgot-password").reply(200, ok(null));

    const res = await authService.forgotPassword("user@example.com");

    expect(res.success).toBe(true);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      email: "user@example.com",
    });
    expect(header(mock.history.post[0], "Authorization")).toBeUndefined();
  });

  it("resetPassword sends post to /auth/reset-password with token, newPassword and skipAuth", async () => {
    mock.onPost("/auth/reset-password").reply(200, ok(null));

    const res = await authService.resetPassword("tok-123", "newPass12345");

    expect(res.success).toBe(true);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      token: "tok-123",
      newPassword: "newPass12345",
    });
    expect(header(mock.history.post[0], "Authorization")).toBeUndefined();
  });

  it("never logs the password it sends", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    mock
      .onPost("/auth/login")
      .reply(200, ok({ accessToken: "a", refreshToken: "r", expiresIn: 1800 }));

    await login({ email: "a@b.c", password: "super-secret" });

    const logged = spy.mock.calls.flat().map((value) => JSON.stringify(value));
    expect(logged.join("\n")).not.toContain("super-secret");
  });

  it("never logs reset credentials or token", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    mock.onPost("/auth/reset-password").reply(200, ok(null));
    await authService.resetPassword("secret-reset-token", "SecretPassword123!");
    const logged = spy.mock.calls.flat().map((value) => JSON.stringify(value));
    expect(logged.join("\n")).not.toContain("secret-reset-token");
    expect(logged.join("\n")).not.toContain("SecretPassword123!");
  });
});
