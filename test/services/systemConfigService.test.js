import { describe, expect, it } from "vitest";

import apiClient from "../../src/services/apiClient";
import {
  DEFAULT_BASE_URL,
  applySessionBaseUrl,
  normalizeBaseUrl,
  testBackendHealth,
} from "../../src/services/systemConfigService";

/**
 * The probe logic is pure outcome-classification, so the tests inject
 * fetch stubs instead of hitting the network: mapping ok/status/throw/
 * abort to "healthy"/"responding"/"unreachable"/"timeout" is exactly
 * what the config screen's copy depends on.
 */
const fetchOk = async () => ({ ok: true, status: 200 });
const fetchNotFound = async () => ({ ok: false, status: 404 });
const fetchNetworkError = async () => {
  throw new TypeError("Failed to fetch");
};
const fetchHanging = (_url, { signal }) =>
  new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () =>
      reject(new DOMException("The operation was aborted.", "AbortError")),
    );
  });

describe("normalizeBaseUrl", () => {
  it("trims whitespace and drops trailing slashes", () => {
    expect(normalizeBaseUrl(" http://localhost:8080/api/ ")).toEqual({
      ok: true,
      url: "http://localhost:8080/api",
      error: "",
    });
    expect(normalizeBaseUrl("https://api.example.test/api///").url).toBe(
      "https://api.example.test/api",
    );
  });

  it("rejects URLs without an http(s) protocol", () => {
    expect(normalizeBaseUrl("localhost:8080/api").ok).toBe(false);
    expect(normalizeBaseUrl("ftp://files.example.test").ok).toBe(false);
    expect(normalizeBaseUrl("").ok).toBe(false);
    expect(normalizeBaseUrl(null).ok).toBe(false);
    expect(normalizeBaseUrl(undefined).error).toMatch(/http/i);
  });
});

describe("testBackendHealth", () => {
  it("classifies a 2xx answer as healthy", async () => {
    const result = await testBackendHealth("http://localhost:8080/api", {
      fetchImpl: fetchOk,
    });
    expect(result).toEqual({ outcome: "healthy", status: 200 });
  });

  it("classifies any other HTTP answer as responding — the server is up", async () => {
    const result = await testBackendHealth("http://localhost:8080/api", {
      fetchImpl: fetchNotFound,
    });
    expect(result).toEqual({ outcome: "responding", status: 404 });
  });

  it("classifies a transport failure as unreachable", async () => {
    const result = await testBackendHealth("http://localhost:8080/api", {
      fetchImpl: fetchNetworkError,
    });
    expect(result).toEqual({ outcome: "unreachable", status: null });
  });

  it("aborts a probe that exceeds the time budget", async () => {
    const result = await testBackendHealth("http://localhost:8080/api", {
      fetchImpl: fetchHanging,
      timeoutMs: 5,
    });
    expect(result).toEqual({ outcome: "timeout", status: null });
  });

  it("never sends a request for an invalid base URL", async () => {
    let called = false;
    const spy = async () => {
      called = true;
      return { ok: true, status: 200 };
    };

    const result = await testBackendHealth("not-a-url", { fetchImpl: spy });

    expect(result).toEqual({ outcome: "invalid", status: null });
    expect(called).toBe(false);
  });
});

describe("applySessionBaseUrl", () => {
  it("re-points the shared client for the session only", () => {
    const original = apiClient.defaults.baseURL;

    try {
      expect(applySessionBaseUrl("https://api.example.test/api")).toBe(
        "https://api.example.test/api",
      );
      expect(apiClient.defaults.baseURL).toBe("https://api.example.test/api");
    } finally {
      apiClient.defaults.baseURL = original;
    }

    expect(apiClient.defaults.baseURL).not.toBe("https://api.example.test/api");
  });

  it("rejects invalid URLs without touching the client", () => {
    const original = apiClient.defaults.baseURL;

    expect(() => applySessionBaseUrl("nope")).toThrow(/http/i);
    expect(apiClient.defaults.baseURL).toBe(original);
  });

  it("exposes the build-time environment default", () => {
    expect(typeof DEFAULT_BASE_URL).toBe("string");
  });
});
