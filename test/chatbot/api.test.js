import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ChatApiError,
  parseReply,
  parseRetryAfter,
  sendQuery,
} from "../../src/components/chatbot/api.js";
import { hangingFetch, reply, response } from "./helpers.js";

const kindOf = async (promise) => {
  try {
    await promise;
    return "no error";
  } catch (e) {
    return e instanceof ChatApiError ? e.kind : `other:${e}`;
  }
};

describe("parseReply", () => {
  it("accepts the ApiResponse wrapper and a bare object", () => {
    expect(parseReply(reply()).message).toBe("Paracetamol relieves pain.");
    expect(parseReply(reply().data).type).toBe("ANSWER");
  });
  it("maps TA/EN to ta/en and detects the language when it is missing", () => {
    expect(parseReply(reply({ language: "TA" })).language).toBe("ta");
    expect(parseReply(reply({ language: "EN" })).language).toBe("en");
    expect(
      parseReply(
        reply({
          language: undefined,
          message: "பாராசிட்டமால் வலியைக் குறைக்கும்",
        }),
      ).language,
    ).toBe("ta");
    expect(
      parseReply(reply({ language: "FR", message: "Bonjour" })).language,
    ).toBe("en");
  });
  it.each([
    null,
    undefined,
    5,
    "text",
    [],
    {},
    { data: {} },
    { type: "HACKED", message: "x" },
    { type: "ANSWER" },
    { type: "ANSWER", message: "  " },
    { type: "ANSWER", message: 5 },
  ])("an unexpected shape (%j) is an error", (body) =>
    expect(() => parseReply(body)).toThrow(ChatApiError),
  );
  it("keeps only safe sources, at most 3, and drops internal fields", () => {
    const sources = [
      { source: "a.pdf", url: "https://who.int/a", score: 0.9, documentId: 1 },
      { source: "b", url: "javascript:alert(1)" },
      { source: "c", url: "http://x.org" },
      { source: "d" },
      { source: "e" },
      {},
      null,
    ];
    const out = parseReply(reply({ sources })).sources;
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ source: "a.pdf", url: "https://who.int/a" });
    expect(out[1].url).toBeNull();
    expect(out[2].url).toBeNull();
  });
  it("a missing or oversized requestId is handled", () => {
    expect(parseReply(reply({ requestId: undefined })).requestId).toBeNull();
    expect(
      parseReply(reply({ requestId: "x".repeat(200) })).requestId,
    ).toHaveLength(64);
  });
});

describe("parseRetryAfter", () => {
  it.each([
    ["5", 5],
    ["  12 ", 12],
    ["3600", 3600],

    ["99999", 99999],
  ])("%s -> %s", (v, n) => expect(parseRetryAfter(v)).toBe(n));
  it.each([[null], [undefined], [""], ["abc"], ["0"], ["-4"]])(
    "%s falls back to 30",
    (v) => expect(parseRetryAfter(v)).toBe(30),
  );

  it("the fallback is configurable", () =>
    expect(parseRetryAfter(null, 10)).toBe(10));
});

describe("sendQuery", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("posts JSON with no cookies and returns the parsed reply", async () => {
    const fetchImpl = vi.fn(async () => response(200, reply()));
    const result = await sendQuery("/api/chatbot/query", "hello there", {
      fetchImpl,
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/chatbot/query");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("omit");
    expect(init.cache).toBe("no-store");
    expect(init.headers["Content-Type"]).toMatch(/application\/json/);
    expect(JSON.parse(init.body)).toEqual({ query: "hello there" });
    expect(result.type).toBe("ANSWER");
  });

  it("sends Tamil text intact", async () => {
    const fetchImpl = vi.fn(async () => response(200, reply()));
    await sendQuery("/q", "பாராசிட்டமால்", { fetchImpl });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).query).toBe(
      "பாராசிட்டமால்",
    );
  });

  it.each([
    [429, "rate_limit"],
    [400, "bad_request"],
    [413, "bad_request"],
    [415, "bad_request"],
    [422, "bad_request"],
    [500, "server"],
    [502, "server"],
    [503, "server"],
    [504, "server"],
    [408, "timeout"],
    [401, "unexpected"],
    [404, "unexpected"],
    [302, "unexpected"],
  ])("HTTP %s is %s", async (status, kind) => {
    const fetchImpl = vi.fn(async () => response(status, {}));
    expect(await kindOf(sendQuery("/q", "x y", { fetchImpl }))).toBe(kind);
  });

  it("429 carries Retry-After, with a default when the header is hidden by CORS", async () => {
    let error;
    try {
      await sendQuery("/q", "x", {
        fetchImpl: async () => response(429, {}, { "Retry-After": "17" }),
      });
    } catch (e) {
      error = e;
    }
    expect(error.retryAfter).toBe(17);
    try {
      await sendQuery("/q", "x", { fetchImpl: async () => response(429, {}) });
    } catch (e) {
      error = e;
    }
    expect(error.retryAfter).toBe(30);
  });

  it("a fetch failure is a network error", async () => {
    expect(
      await kindOf(
        sendQuery("/q", "x", {
          fetchImpl: async () => {
            throw new TypeError("Failed to fetch");
          },
        }),
      ),
    ).toBe("network");
  });

  it("bad JSON or a bad shape is unexpected", async () => {
    expect(
      await kindOf(
        sendQuery("/q", "x", {
          fetchImpl: async () => response(200, new SyntaxError("bad json")),
        }),
      ),
    ).toBe("unexpected");
    expect(
      await kindOf(
        sendQuery("/q", "x", {
          fetchImpl: async () =>
            response(200, { type: "HACKED", message: "x" }),
        }),
      ),
    ).toBe("unexpected");
  });

  it("times out after timeoutMs", async () => {
    const promise = kindOf(
      sendQuery("/q", "x", { fetchImpl: hangingFetch(), timeoutMs: 1000 }),
    );
    await vi.advanceTimersByTimeAsync(1001);
    expect(await promise).toBe("timeout");
  });

  it("does not time out when the answer arrives in time, and leaves no timer behind", async () => {
    await sendQuery("/q", "x", {
      fetchImpl: async () => response(200, reply()),
      timeoutMs: 1000,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("an outside abort is reported as aborted, not as an error to show", async () => {
    const controller = new AbortController();
    const promise = kindOf(
      sendQuery("/q", "x", {
        fetchImpl: hangingFetch(),
        signal: controller.signal,
        timeoutMs: 60000,
      }),
    );
    controller.abort();
    expect(await promise).toBe("aborted");
  });

  it("an already-aborted signal aborts at once", async () => {
    const controller = new AbortController();
    controller.abort();
    expect(
      await kindOf(
        sendQuery("/q", "x", {
          fetchImpl: hangingFetch(),
          signal: controller.signal,
        }),
      ),
    ).toBe("aborted");
  });
});
