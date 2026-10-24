import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw/server";
import { resetMswState } from "./msw/handlers";
import "../src/i18n";

// jsdom's Blob implements arrayBuffer() but not stream(); undici's Response
// body extraction calls stream() when MSW resolves a responseType:"blob"
// request (report/backup file downloads).
if (typeof Blob !== "undefined" && typeof Blob.prototype.stream !== "function") {
  Blob.prototype.stream = function stream() {
    const blob = this;
    return new ReadableStream({
      start(controller) {
        blob
          .arrayBuffer()
          .then((buffer) => {
            controller.enqueue(new Uint8Array(buffer));
            controller.close();
          })
          .catch((error) => controller.error(error));
      },
    });
  };
}

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
