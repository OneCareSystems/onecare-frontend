import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("API base URL", () => {
  it.each([undefined, "", "   ", "/api", "/api/"])(
    "resolves login through /api for %s",
    async (value) => {
      vi.stubEnv("VITE_API_BASE_URL", value);
      vi.resetModules();
      const { API_BASE_URL } = await import("../../src/services/config");
      const client = axios.create({ baseURL: API_BASE_URL });

      expect(client.getUri({ url: "/auth/login" })).toBe("/api/auth/login");
    },
  );

  it("keeps a direct backend base with exactly one /api prefix", async () => {
    vi.stubEnv("VITE_API_BASE_URL", " http://localhost:8080/api/ ");
    vi.resetModules();
    const { API_BASE_URL } = await import("../../src/services/config");
    const client = axios.create({ baseURL: API_BASE_URL });

    expect(client.getUri({ url: "/auth/login" })).toBe(
      "http://localhost:8080/api/auth/login",
    );
  });
});

describe("runtime configuration (DKR-03)", () => {
  const importConfig = () => import("../../src/services/config");

  const stubFetch = (payload, { ok = true, throws = false } = {}) => {
    const fetchMock = throws
      ? vi.fn().mockRejectedValue(new Error("network down"))
      : vi.fn().mockResolvedValue({
          ok,
          status: ok ? 200 : 404,
          json: async () => payload,
        });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("runtime apiBaseUrl overrides the build-time value (AC1)", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "/api");
    const { loadRuntimeConfig, resolveApiBaseUrl } = await importConfig();
    stubFetch({ apiBaseUrl: "https://staging.example/api/" });

    await loadRuntimeConfig();

    expect(resolveApiBaseUrl()).toBe("https://staging.example/api");
  });

  it("falls back to build-time defaults when the file is missing (AC3)", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "/api");
    const { loadRuntimeConfig, resolveApiBaseUrl, getRuntimeConfig } =
      await importConfig();
    stubFetch(null, { ok: false, status: 404 });

    await loadRuntimeConfig();

    expect(resolveApiBaseUrl()).toBe("/api");
    expect(getRuntimeConfig()).toEqual({});
  });

  it("falls back when the fetch itself fails (AC3)", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    const { loadRuntimeConfig, resolveApiBaseUrl } = await importConfig();
    stubFetch(null, { throws: true });

    await expect(loadRuntimeConfig()).resolves.toEqual({});
    expect(resolveApiBaseUrl()).toBe("/api");
  });

  it("ignores invalid JSON payloads without crashing (AC3)", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "/api");
    const { loadRuntimeConfig, resolveApiBaseUrl } = await importConfig();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON");
        },
      }),
    );

    await expect(loadRuntimeConfig()).resolves.toEqual({});
    expect(resolveApiBaseUrl()).toBe("/api");
  });

  it("ignores a partial runtime file but keeps known values (AC3)", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    const { loadRuntimeConfig, resolveApiBaseUrl, getRuntimeConfig } =
      await importConfig();
    stubFetch({ featureFlag: true });

    await loadRuntimeConfig();

    // apiBaseUrl absent → same-origin default; other keys are preserved.
    expect(resolveApiBaseUrl()).toBe("/api");
    expect(getRuntimeConfig()).toEqual({ featureFlag: true });
  });

  it("ignores non-object payloads", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "/api");
    const { applyRuntimeConfig, getRuntimeConfig } = await importConfig();

    applyRuntimeConfig(null);
    applyRuntimeConfig([1, 2]);
    applyRuntimeConfig("nope");

    expect(getRuntimeConfig()).toEqual({});
  });

  it("normalizeBaseUrl trims, strips slashes and rejects non-strings", async () => {
    const { normalizeBaseUrl } = await importConfig();

    expect(normalizeBaseUrl(" https://x.example/api/// ")).toBe(
      "https://x.example/api",
    );
    expect(normalizeBaseUrl("   ")).toBeNull();
    expect(normalizeBaseUrl(42)).toBeNull();
    expect(normalizeBaseUrl(undefined)).toBeNull();
  });
});
