import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { configDefaults } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test : {
  environment: "jsdom",
  globals: true,
  exclude:[...configDefaults.exclude],
  coverage:{
    provider:'v8',
    reporter:['text','html'],
  }
  },
});
