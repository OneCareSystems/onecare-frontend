import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
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
