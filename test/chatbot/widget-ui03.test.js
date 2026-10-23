// UI-03: loading and error states, with bilingual copy.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STRINGS } from "../../src/components/chatbot/il8n.js";
import { hangingFetch, mount, reply, response, TAMIL_Q } from "./helpers.js";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const tick = (ms) => vi.advanceTimersByTimeAsync(ms);
const ask = async (w, text) => {
  w.type(text);
  w.submit();
  await tick(0);
};
const lastError = (w) => w.$$(".log .msg.error").pop();

describe("loading", () => {
  it("shows a typing indicator while waiting, blocks sending, and removes it after the reply", async () => {
    let release;
    const w = mount({
      fetchImpl: vi.fn(
        () =>
          new Promise((resolve) => {
            release = () => resolve(response(200, reply()));
          }),
      ),
    });
    await ask(w, "hello there");
    const typing = w.$(".typing");
    expect(typing).toBeTruthy();
    expect(typing.getAttribute("aria-label")).toBe(STRINGS.en.typing);
    expect(typing.getAttribute("role")).toBe("status");
    expect(w.input.getAttribute("aria-busy")).toBe("true");
    w.type("another");
    expect(w.send.disabled).toBe(true);
    release();
    await tick(0);
    expect(w.$(".typing")).toBeNull();
    expect(w.input.getAttribute("aria-busy")).toBe("false");
  });

  it("a double submit sends only one request", async () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const w = mount({ fetchImpl });
    w.type("hello there");
    w.submit();
    w.type("hello there");
    w.submit();
    await tick(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('after slow-after-ms a "taking longer" notice appears in the language of the question, and goes away after the reply', async () => {
    let release;
    const w = mount({
      fetchImpl: vi.fn(
        () =>
          new Promise((resolve) => {
            release = () =>
              resolve(
                response(200, reply({ language: "TA", message: "பதில்" })),
              );
          }),
      ),
    });
    await ask(w, TAMIL_Q);
    expect(w.$(".status").textContent).toBe("");
    await tick(7999);
    expect(w.$(".status").textContent).toBe("");
    await tick(2);
    expect(w.$(".status").textContent).toBe(STRINGS.ta.slow);
    release();
    await tick(0);
    expect(w.$(".status").textContent).toBe("");
  });

  it("the slow notice is English for an English question, and the delay is configurable", async () => {
    const w = mount({
      attrs: { "slow-after-ms": "1000" },
      fetchImpl: vi.fn(() => new Promise(() => {})),
    });
    await ask(w, "what is paracetamol used for");
    await tick(1001);
    expect(w.$(".status").textContent).toBe(STRINGS.en.slow);
  });
});

describe("timeout", () => {
  it("gives up after timeout-ms with a clear message and a Try again button", async () => {
    const w = mount({
      attrs: { "timeout-ms": "5000" },
      fetchImpl: hangingFetch(),
    });
    await ask(w, "what is paracetamol used for");
    await tick(5001);
    const error = lastError(w);
    expect(error.querySelector("p").textContent).toBe(
      STRINGS.en.errors.timeout,
    );
    expect(error.getAttribute("role")).toBe("alert");
    expect(error.querySelector(".retry").textContent).toBe(STRINGS.en.retry);
    expect(w.$(".typing")).toBeNull();
    expect(w.send.disabled).toBe(true); // input is empty, but the widget is usable again
    w.type("next");
    expect(w.send.disabled).toBe(false);
  });

  it("Try again re-sends the same question without duplicating it, and clears the error", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(() =>
        Promise.reject(new TypeError("Failed to fetch")),
      )
      .mockImplementationOnce(async () => response(200, reply()));
    const w = mount({ fetchImpl });
    await ask(w, "what is paracetamol used for");
    lastError(w).querySelector(".retry").click();
    await tick(0);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).query).toBe(
      "what is paracetamol used for",
    );
    expect(w.$$(".log .msg.user")).toHaveLength(1);
    expect(w.$$(".log .msg.error")).toHaveLength(0);
    expect(w.texts().pop()).toBe("Paracetamol relieves pain.");
  });
});

describe("API failures, in the language of the question", () => {
  const cases = [
    [
      "network failure",
      () => Promise.reject(new TypeError("Failed to fetch")),
      "network",
    ],
    ["HTTP 500", async () => response(500, {}), "server"],
    ["HTTP 502", async () => response(502, {}), "server"],
    ["HTTP 503", async () => response(503, {}), "server"],
    [
      "an unexpected reply shape",
      async () => response(200, { type: "HACKED", message: "x" }),
      "server",
    ],
    [
      "broken JSON",
      async () => response(200, new SyntaxError("bad")),
      "server",
    ],
    ["HTTP 404", async () => response(404, {}), "server"],
  ];
  for (const [name, impl, key] of cases) {
    it(`${name}: English question gets English copy, Tamil question gets Tamil copy, both with Try again`, async () => {
      const en = mount({ fetchImpl: vi.fn(impl) });
      await ask(en, "what is paracetamol used for");
      expect(lastError(en).querySelector("p").textContent).toBe(
        STRINGS.en.errors[key],
      );
      expect(lastError(en).getAttribute("lang")).toBe("en");
      expect(lastError(en).querySelector(".retry")).toBeTruthy();
      document.body.replaceChildren();
      const ta = mount({ fetchImpl: vi.fn(impl) });
      await ask(ta, TAMIL_Q);
      expect(lastError(ta).querySelector("p").textContent).toBe(
        STRINGS.ta.errors[key],
      );
      expect(lastError(ta).getAttribute("lang")).toBe("ta");
      expect(lastError(ta).querySelector(".retry").textContent).toBe(
        STRINGS.ta.retry,
      );
    });
  }

  it("the patient message stays visible after a failure", async () => {
    const w = mount({ fetchImpl: vi.fn(async () => response(500, {})) });
    await ask(w, "what is paracetamol used for");
    expect(w.texts()).toContain("what is paracetamol used for");
  });

  it("a failure emits an error event with the kind only", async () => {
    const events = [];
    const w = mount({ fetchImpl: vi.fn(async () => response(503, {})) });
    w.widget.addEventListener("onecare-chat:error", (e) =>
      events.push(e.detail),
    );
    await ask(w, "secret question");
    expect(events).toEqual([{ kind: "server" }]);
  });

  it("HTTP 400: asks the patient to change the message, restores the text, and offers no retry", async () => {
    const w = mount({
      fetchImpl: vi.fn(async () =>
        response(400, { message: "some English server text" }),
      ),
    });
    await ask(w, "what is paracetamol used for");
    const error = lastError(w);
    expect(error.querySelector("p").textContent).toBe(
      STRINGS.en.errors.badRequest,
    );
    expect(error.querySelector(".retry")).toBeNull();
    expect(w.input.value).toBe("what is paracetamol used for");
    expect(w.texts().join(" ")).not.toContain("some English server text"); // the server's own text is never shown
  });
});

describe("rate limit (HTTP 429)", () => {
  const limited = (headers) => vi.fn(async () => response(429, {}, headers));

  it("shows the wait time from Retry-After, disables sending, counts down, then re-enables", async () => {
    const w = mount({ fetchImpl: limited({ "Retry-After": "3" }) });
    await ask(w, "what is paracetamol used for");
    expect(lastError(w).querySelector("p").textContent).toBe(
      STRINGS.en.errors.rateLimit.replace("{seconds}", "3"),
    );
    expect(lastError(w).querySelector(".retry").disabled).toBe(true);
    expect(w.$(".cooldown").textContent).toBe(
      STRINGS.en.cooldown.replace("{seconds}", "3"),
    );
    w.type("next question");
    expect(w.send.disabled).toBe(true);
    expect(w.$$(".chip").every((b) => b.disabled)).toBe(true);
    await tick(1000);
    expect(w.$(".cooldown").textContent).toBe(
      STRINGS.en.cooldown.replace("{seconds}", "2"),
    );
    await tick(2100);
    expect(w.$(".cooldown")).toBeNull();
    expect(w.send.disabled).toBe(false);
    expect(w.$$(".chip").every((b) => !b.disabled)).toBe(true);
  });

  it("a message typed during the cooldown is not sent", async () => {
    const fetchImpl = limited({ "Retry-After": "10" });
    const w = mount({ fetchImpl });
    await ask(w, "what is paracetamol used for");
    w.type("try anyway");
    w.submit();
    await tick(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("works again after the wait", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(async () =>
        response(429, {}, { "Retry-After": "2" }),
      )
      .mockImplementation(async () => response(200, reply()));
    const w = mount({ fetchImpl });
    await ask(w, "what is paracetamol used for");
    await tick(2500);
    await ask(w, "what are the clinic hours");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(w.texts().pop()).toBe("Paracetamol relieves pain.");
  });

  it("a Tamil question gets Tamil rate-limit copy; a missing header means 30 seconds", async () => {
    const w = mount({ fetchImpl: limited({}) });
    await ask(w, TAMIL_Q);
    expect(lastError(w).querySelector("p").textContent).toBe(
      STRINGS.ta.errors.rateLimit.replace("{seconds}", "30"),
    );
    expect(w.$(".cooldown").textContent).toBe(
      STRINGS.ta.cooldown.replace("{seconds}", "30"),
    );
  });

  it("removing the widget stops the countdown timer", async () => {
    const w = mount({ fetchImpl: limited({ "Retry-After": "60" }) });
    await ask(w, "what is paracetamol used for");
    w.widget.remove();
    expect(vi.getTimerCount()).toBe(0);
  });
});
