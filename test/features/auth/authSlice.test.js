import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { store } from "../../../src/app/store";
import authReducer, {
  clearSession,
  selectAccessToken,
  selectExpiresAt,
  selectIsAuthenticated,
  selectRefreshToken,
  selectRole,
  setSession,
} from "../../../src/features/auth/authSlice";

const state = () => store.getState();

const seed = (payload) => store.dispatch(setSession(payload));

beforeEach(() => {
  store.dispatch(clearSession());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("authSlice (Redux, in-memory session)", () => {
  it("stores tokens with an expiry timestamp", () => {
    const before = Date.now();
    seed({ accessToken: "a", refreshToken: "r", expiresIn: 1800 });
    const after = Date.now();

    expect(selectAccessToken(state())).toBe("a");
    expect(selectRefreshToken(state())).toBe("r");
    const expiresAt = selectExpiresAt(state());
    expect(expiresAt).toBeGreaterThanOrEqual(before + 1800 * 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + 1800 * 1000);
    expect(selectIsAuthenticated(state())).toBe(true);
  });

  it("keeps a previous refresh token when none is supplied", () => {
    seed({ accessToken: "a1", refreshToken: "r1", expiresIn: 60 });
    seed({ accessToken: "a2" });

    expect(selectAccessToken(state())).toBe("a2");
    expect(selectRefreshToken(state())).toBe("r1");
  });

  it("ignores an empty access token", () => {
    seed({ accessToken: "", refreshToken: "r", expiresIn: 60 });

    expect(selectAccessToken(state())).toBeNull();
    expect(selectRefreshToken(state())).toBeNull();
    expect(selectIsAuthenticated(state())).toBe(false);
  });

  it("clears the whole session", () => {
    seed({
      accessToken: "a",
      refreshToken: "r",
      expiresIn: 60,
      role: "DOCTOR",
    });
    store.dispatch(clearSession());

    expect(selectAccessToken(state())).toBeNull();
    expect(selectRefreshToken(state())).toBeNull();
    expect(selectExpiresAt(state())).toBeNull();
    expect(selectRole(state())).toBeNull();
    expect(selectIsAuthenticated(state())).toBe(false);
  });

  it("stores role and redirectUrl from the login payload", () => {
    seed({
      accessToken: "a",
      refreshToken: "r",
      expiresIn: 1800,
      role: "SUPER_ADMIN",
      redirectUrl: "/superadmin/dashboard",
    });

    expect(selectRole(state())).toBe("SUPER_ADMIN");
    expect(state().auth.redirectUrl).toBe("/superadmin/dashboard");
  });

  it("treats a non-positive or invalid expiresIn as no expiry", () => {
    seed({ accessToken: "a", refreshToken: "r", expiresIn: 0 });
    expect(selectExpiresAt(state())).toBeNull();

    seed({ accessToken: "a", refreshToken: "r", expiresIn: "soon" });
    expect(selectExpiresAt(state())).toBeNull();
  });

  it("reduces through the auth slice key", () => {
    expect(state()).toHaveProperty("auth");
    expect(authReducer(undefined, { type: "@@INIT" })).toMatchObject({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });
  });

  it("keeps the session in memory only — nothing is written to storage", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    seed({
      accessToken: "a",
      refreshToken: "r",
      expiresIn: 1800,
      role: "ADMIN",
    });

    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
  });
});
