import { vi } from "vitest";
import "../../src/components/chatbot/onecare-chat-widget.js"; // register the custom element

export const TAMIL_Q = "பாராசிட்டமால் எதற்கு பயன்படுகிறது";

/** A fake fetch Response. */
export function response(status, body, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name) => headers[name] ?? headers[name?.toLowerCase()] ?? null,
    },
    json: async () => {
      if (body instanceof Error) throw body;
      return body;
    },
  };
}

export const reply = (over = {}) => ({
  success: true,
  data: {
    type: "ANSWER",
    language: "EN",
    message: "Paracetamol relieves pain.",
    sources: [],
    requestId: "0123456789abcdef",
    ...over,
  },
});

/** A fetch that never answers but rejects when aborted, like the real one. */
export const hangingFetch = () =>
  vi.fn(
    (url, init) =>
      new Promise((_, reject) => {
        const abort = () => reject(new DOMException("Aborted", "AbortError"));
        if (init.signal.aborted) abort();
        else init.signal.addEventListener("abort", abort);
      }),
  );

export function mount({ attrs = {}, fetchImpl, open = true } = {}) {
  const widget = document.createElement("onecare-chat-widget");
  for (const [k, v] of Object.entries(attrs)) widget.setAttribute(k, v);
  widget.fetchImpl = fetchImpl ?? vi.fn(async () => response(200, reply()));
  document.body.append(widget);
  if (open) widget.open();
  const $ = (selector) => widget.shadowRoot.querySelector(selector);
  const $$ = (selector) => [...widget.shadowRoot.querySelectorAll(selector)];
  return {
    widget,
    $,
    $$,
    input: $("textarea"),
    send: $(".send"),
    log: $(".log"),
    messages: () => $$(".log .msg"),
    texts: () => $$(".log .msg p").map((p) => p.textContent),
    type(text) {
      const i = $("textarea");
      i.value = text;
      i.dispatchEvent(new Event("input"));
    },
    press(key, init = {}) {
      const e = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      });
      $("textarea").dispatchEvent(e);
      return e;
    },
    submit() {
      $("form").dispatchEvent(new Event("submit", { cancelable: true }));
    },
  };
}

/** Let pending promises settle (fetch mocks resolve in microtasks). */
export const flush = async () => {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
};
