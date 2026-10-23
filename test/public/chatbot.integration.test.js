import { afterEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { waitFor } from "@testing-library/react";
import { mount } from "../chatbot/helpers";
import { STRINGS } from "../../src/components/chatbot/il8n";
import { DEFAULT_CHIPS } from "../../src/components/chatbot/chips";
import { parseRetryAfter } from "../../src/components/chatbot/api";

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});
it("sends a Tamil chip through the public API with both languages visible", async () => {
  const queries = [];
  server.use(
    http.post("*/api/chatbot/query", async ({ request }) => {
      queries.push(await request.json());
      return HttpResponse.json({
        type: "CLINIC_FACT",
        language: "TA",
        message: "பதில்",
      });
    }),
  );
  const w = mount({ attrs: { lang: "ta" } });
  w.widget.fetchImpl = fetch;
  w.$(".chip").click();
  await waitFor(() => expect(w.texts()).toContain("பதில்"));
  expect(queries).toEqual([{ query: DEFAULT_CHIPS.ta[0].query }]);
  expect(w.$$('.chip[lang="en"]')).toHaveLength(DEFAULT_CHIPS.en.length);
});
it("keeps Tamil errors for an English question and retries it once without duplication", async () => {
  let calls = 0;
  const queries = [];
  server.use(
    http.post("*/api/chatbot/query", async ({ request }) => {
      queries.push((await request.json()).query);
      return ++calls === 1
        ? new HttpResponse(null, { status: 503 })
        : HttpResponse.json({
            type: "ANSWER",
            language: "EN",
            message: "Recovered answer",
          });
    }),
  );
  const w = mount({ attrs: { lang: "ta" } });
  w.widget.fetchImpl = fetch;
  w.type("Clinic hours?");
  w.submit();
  await waitFor(() => expect(w.$(".retry")).toBeTruthy());
  expect(w.$(".error p").textContent).toBe(STRINGS.ta.errors.server);
  w.$(".retry").click();
  w.$(".retry")?.click();
  await waitFor(() => expect(w.texts()).toContain("Recovered answer"));
  expect(queries).toEqual(["Clinic hours?", "Clinic hours?"]);
  expect(w.$$(".msg.user")).toHaveLength(1);
  expect(w.send.textContent).toBe(STRINGS.ta.send);
});
it("delays retry after a 429 and resends the same question", async () => {
  let calls = 0;
  server.use(
    http.post("*/api/chatbot/query", () =>
      ++calls === 1
        ? new HttpResponse(null, {
            status: 429,
            headers: { "Retry-After": "1" },
          })
        : HttpResponse.json({
            type: "ANSWER",
            message: "Recovered",
            language: "EN",
          }),
    ),
  );
  const w = mount();
  w.widget.fetchImpl = fetch;
  w.type("Clinic hours?");
  w.submit();
  await waitFor(() => expect(w.$(".retry")).toBeTruthy());
  expect(w.$(".retry").disabled).toBe(true);
  w.$(".retry").click();
  expect(calls).toBe(1);
  await waitFor(() => expect(w.$(".retry").disabled).toBe(false), {
    timeout: 2500,
  });
  w.$(".retry").click();
  await waitFor(() => expect(w.texts()).toContain("Recovered"));
  expect(calls).toBe(2);
  expect(w.$$(".msg.user")).toHaveLength(1);
});
it("honours HTTP-date Retry-After", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-23T10:00:00Z"));
  expect(parseRetryAfter("Fri, 23 Oct 2026 10:00:07 GMT")).toBe(7);
});
it("an old retry button resends its own question", async () => {
  const sent = [];
  const w = mount({
    fetchImpl: async (url, options) => {
      sent.push(JSON.parse(options.body).query);
      return { status: 503, ok: false };
    },
  });
  await w.widget.ask("first question");
  await w.widget.ask("second question");
  w.$(".retry").click();
  await waitFor(() => expect(sent).toHaveLength(3));
  expect(sent).toEqual(["first question", "second question", "first question"]);
  expect(w.$$(".msg.user")).toHaveLength(2);
});

it("announces loading and blocks duplicate chip requests through MSW", async () => {
  let release;
  let calls = 0;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  server.use(
    http.post("*/api/chatbot/query", async () => {
      calls++;
      await gate;
      return HttpResponse.json({
        type: "ANSWER",
        language: "EN",
        message: "Done",
      });
    }),
  );
  const w = mount();
  w.widget.fetchImpl = fetch;
  w.$(".chip").click();
  await waitFor(() => expect(calls).toBe(1));
  expect(w.$(".typing").getAttribute("role")).toBe("status");
  expect(w.$$(".chip").every((chip) => chip.disabled)).toBe(true);
  w.$(".chip").click();
  expect(calls).toBe(1);
  release();
  await waitFor(() => expect(w.texts()).toContain("Done"));
  expect(w.$(".typing")).toBeNull();
});
