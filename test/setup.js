import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw/server";
import { resetMswState } from "./msw/handlers";
import "../src/i18n";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  server.resetHandlers();
  resetMswState();
});

afterAll(() => {
  server.close();
});
