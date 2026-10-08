import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  clearTokens,
  getAccessToken,
  getExpiresAt,
  getRefreshToken,
  hasSession,
  setTokens,
} from "../../src/services/tokenStore";

beforeEach(() => {
  clearTokens();
});

afterEach(() => {
  clearTokens();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("tokenStore (OD-1 interim localStorage adapter)", () => {
  it("stores and returns tokens with an expiry timestamp", () => {
    const before = Date.now();
    setTokens({ accessToken: "a", refreshToken: "r", expiresIn: 1800 });
    const after = Date.now();

    expect(getAccessToken()).toBe("a");
    expect(getRefreshToken()).toBe("r");
    const expiresAt = getExpiresAt();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 1800 * 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + 1800 * 1000);
    expect(hasSession()).toBe(true);
  });

  it("keeps a previous refresh token when none is supplied", () => {
    setTokens({ accessToken: "a1", refreshToken: "r1", expiresIn: 60 });
    setTokens({ accessToken: "a2" });

    expect(getAccessToken()).toBe("a2");
    expect(getRefreshToken()).toBe("r1");
  });

  it("ignores an empty access token", () => {
    setTokens({ accessToken: "", refreshToken: "r", expiresIn: 60 });

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("clears everything", () => {
    setTokens({ accessToken: "a", refreshToken: "r", expiresIn: 60 });
    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getExpiresAt()).toBeNull();
    expect(hasSession()).toBe(false);
  });

  it("returns null for a corrupt expiry value", () => {
    setTokens({ accessToken: "a", refreshToken: "r", expiresIn: 60 });
    window.localStorage.setItem("oc_expires_at", "not-a-number");

    expect(getExpiresAt()).toBeNull();
  });

  it("returns null when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(() =>
      setTokens({ accessToken: "a", refreshToken: "r", expiresIn: 60 }),
    ).not.toThrow();
    expect(getAccessToken()).toBeNull();
    expect(() => clearTokens()).not.toThrow();
  });

  it("stays inert when storage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);

    expect(() =>
      setTokens({ accessToken: "a", refreshToken: "r", expiresIn: 60 }),
    ).not.toThrow();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getExpiresAt()).toBeNull();
    expect(hasSession()).toBe(false);
    expect(() => clearTokens()).not.toThrow();
  });
});
