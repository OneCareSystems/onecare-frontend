import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { configDefaults } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Preserve /api: /api/auth/login -> <target>/api/auth/login.
      // Target is env-driven (DDP-#49 / DKR-04) so dev containers can point
      // at the backend service name; defaults to the local backend port.
      "/api": {
        target: process.env.VITE_DEV_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.js"],
    // e2e/ specs run in Playwright's real browser, not vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Gate per team DoD (DDP-#49 / DKR-05): fail below the agreed floor.
      // Baseline at time of writing: 85.7 / 78.6 / 80.5 / 88.0.
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
    include: ["test/**/*.{test,spec}.{js,jsx}"],
  },
});
