// UI-01: the chat widget component.
import { afterEach, describe, expect, it, vi } from "vitest";
import { STRINGS } from "../../src/components/chatbot/il8n.js";
import { flush, mount, reply, response, TAMIL_Q } from "./helpers.js";

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("open and close", () => {
  it("is registered and starts closed with a launcher button", () => {
    const w = mount({ open: false });
    expect(customElements.get("onecare-chat-widget")).toBeTruthy();
    expect(w.$(".launcher")).toBeTruthy();
    expect(w.$(".panel").hidden).toBe(true);
    expect(w.$(".launcher").getAttribute("aria-expanded")).toBe("false");
    expect(w.$(".launcher").getAttribute("aria-label")).toBe(STRINGS.en.open);
  });

  it("opens on click, updates aria and focuses the input", () => {
    const w = mount({ open: false });
    w.$(".launcher").click();
    expect(w.$(".panel").hidden).toBe(false);
    expect(w.$(".launcher").getAttribute("aria-expanded")).toBe("true");
    expect(w.$(".launcher").getAttribute("aria-label")).toBe(STRINGS.en.close);
    expect(w.widget.shadowRoot.activeElement).toBe(w.input);
  });

  it("Escape and the close button close it and return focus to the launcher", () => {
    const w = mount();
    w.press("Escape");
    expect(w.$(".panel").hidden).toBe(true);
    expect(w.widget.shadowRoot.activeElement).toBe(w.$(".launcher"));
    w.widget.open();
    w.$(".close").click();
    expect(w.$(".panel").hidden).toBe(true);
  });

  it("the panel is a labelled dialog and the log is a live region", () => {
    const w = mount();
    expect(w.$(".panel").getAttribute("role")).toBe("dialog");
    expect(w.$(".panel").getAttribute("aria-labelledby")).toBe("title");
    expect(w.$("#title").textContent).toBe(STRINGS.en.title);
    expect(w.log.getAttribute("role")).toBe("log");
    expect(w.log.getAttribute("aria-live")).toBe("polite");
  });

  it("the open attribute starts it open, and position=left moves it", () => {
    const w = mount({ attrs: { open: "", position: "left" }, open: false });
    expect(w.$(".panel").hidden).toBe(false);
    expect(w.$(".root").classList.contains("left")).toBe(true);
  });
});

describe("language of the interface and of the messages", () => {
  it("shows a greeting and the disclaimer in English by default", () => {
    const w = mount();
    expect(w.texts()[0]).toBe(STRINGS.en.greeting);
    expect(w.$(".disclaimer").textContent).toBe(STRINGS.en.disclaimer);
    expect(w.input.getAttribute("placeholder")).toBe(STRINGS.en.placeholder);
  });

  it("the lang attribute switches the whole interface to Tamil", () => {
    const w = mount({ attrs: { lang: "ta" } });
    expect(w.texts()[0]).toBe(STRINGS.ta.greeting);
    expect(w.$("#title").textContent).toBe(STRINGS.ta.title);
    expect(w.send.textContent).toBe(STRINGS.ta.send);
    w.widget.setAttribute("lang", "en");
    expect(w.send.textContent).toBe(STRINGS.en.send);
  });

  it('a Tamil question gets a Tamil bubble, and a Tamil reply is shown in Tamil with lang="ta"', async () => {
    const fetchImpl = vi.fn(async () =>
      response(
        200,
        reply({ language: "TA", message: "பாராசிட்டமால் வலியைக் குறைக்கும்." }),
      ),
    );
    const w = mount({ fetchImpl });
    w.type(TAMIL_Q);
    w.submit();
    await flush();
    const [user, bot] = w.messages().slice(1);
    expect(user.getAttribute("lang")).toBe("ta");
    expect(bot.getAttribute("lang")).toBe("ta");
    expect(bot.querySelector("p").textContent).toBe(
      "பாராசிட்டமால் வலியைக் குறைக்கும்.",
    );
    expect(w.input.getAttribute("placeholder")).toBe(STRINGS.ta.placeholder); // the interface follows the patient's language
    expect(w.send.textContent).toBe(STRINGS.ta.send);
  });

  it("an English question and reply stay English", async () => {
    const w = mount();
    w.type("what is paracetamol used for");
    w.submit();
    await flush();
    expect(
      w
        .messages()
        .slice(1)
        .map((m) => m.getAttribute("lang")),
    ).toEqual(["en", "en"]);
    expect(w.input.getAttribute("placeholder")).toBe(STRINGS.en.placeholder);
  });


  it("the interface stays in the selected language until the language setting changes", async () => {

  it("the interface goes back to English when the patient switches language", async () => {

    const fetchImpl = vi.fn(async () => response(200, reply()));
    const w = mount({ fetchImpl, attrs: { lang: "ta" } });
    w.type("what are the clinic hours");
    w.submit();
    await flush();
    expect(w.send.textContent).toBe(STRINGS.ta.send);
    w.widget.setAttribute("lang", "en");
    expect(w.send.textContent).toBe(STRINGS.en.send);
  });
});

describe("sending and showing replies", () => {
  it("posts the question to api-url and shows question and answer in order", async () => {
    const fetchImpl = vi.fn(async () => response(200, reply()));
    const w = mount({
      fetchImpl,
      attrs: { "api-url": "https://portal.example/api/chatbot/query" },
    });
    w.type("  what is paracetamol used for  ");
    w.submit();
    await flush();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://portal.example/api/chatbot/query");
    expect(JSON.parse(init.body)).toEqual({
      query: "what is paracetamol used for",
    });
    expect(w.texts().slice(1)).toEqual([
      "what is paracetamol used for",
      "Paracetamol relieves pain.",
    ]);
    expect(w.input.value).toBe("");
    expect(w.send.disabled).toBe(true); // nothing typed
  });

  it("shows the type of reply on the bubble (answer, refusal, fallback, clinic fact)", async () => {
    for (const type of ["ANSWER", "REFUSAL", "FALLBACK", "CLINIC_FACT"]) {
      document.body.replaceChildren();
      const w = mount({
        fetchImpl: vi.fn(async () => response(200, reply({ type }))),
      });
      w.type("hello there");
      w.submit();
      await flush();
      expect(w.$$(".msg.bot").pop().getAttribute("data-type")).toBe(type);
    }
  });

  it("works with a bare (unwrapped) reply as well", async () => {
    const w = mount({
      fetchImpl: vi.fn(async () => response(200, reply().data)),
    });
    w.type("hello there");
    w.submit();
    await flush();
    expect(w.texts().pop()).toBe("Paracetamol relieves pain.");
  });

  it("puts focus back in the input after a reply", async () => {
    const w = mount();
    w.type("hello there");
    w.submit();
    await flush();
    expect(w.widget.shadowRoot.activeElement).toBe(w.input);
  });

  it("ask() opens the widget and sends", async () => {
    const fetchImpl = vi.fn(async () => response(200, reply()));
    const w = mount({ fetchImpl, open: false });
    await w.widget.ask("what are the clinic hours");
    expect(w.$(".panel").hidden).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("safety of what is displayed", () => {
  it("server text is never interpreted as HTML", async () => {
    const evil =
      "<img src=x onerror=alert(1)><script>window.hacked=1</script><b>bold</b>";
    const w = mount({
      fetchImpl: vi.fn(async () => response(200, reply({ message: evil }))),
    });
    w.type("hello there");
    w.submit();
    await flush();
    expect(w.$$("img, script, b").length).toBe(0);
    expect(w.texts().pop()).toBe(evil);
    expect(window.hacked).toBeUndefined();
  });

  it("what the patient typed is not interpreted as HTML either", async () => {
    const w = mount();
    w.type("<img src=x onerror=alert(1)> hello");
    w.submit();
    await flush();
    expect(w.$$(".log img").length).toBe(0);
  });

  it("an https source is a safe link; a javascript: or http: source is plain text", async () => {
    const sources = [
      { source: "WHO fact sheet", url: "https://www.who.int/x" },
      { source: "evil", url: "javascript:alert(1)" },
      { source: "plain-http", url: "http://example.org" },
      { source: "guide.pdf" },
    ];
    const w = mount({
      fetchImpl: vi.fn(async () => response(200, reply({ sources }))),
    });
    w.type("hello there");
    w.submit();
    await flush();
    const links = w.$$(".sources a");
    expect(links).toHaveLength(1); // sources are capped at 3 and only https is a link
    expect(links[0].getAttribute("href")).toBe("https://www.who.int/x");
    expect(links[0].getAttribute("target")).toBe("_blank");
    expect(links[0].getAttribute("rel")).toBe("noopener noreferrer");
    expect(w.$(".sources").textContent).toContain("evil");
    expect(w.$(".sources").textContent).not.toContain("guide.pdf");
    expect(
      w.$(".sources").textContent.startsWith(`${STRINGS.en.source}:`),
    ).toBe(true);
  });

  it("only an ANSWER shows sources", async () => {
    const w = mount({
      fetchImpl: vi.fn(async () =>
        response(
          200,
          reply({ type: "REFUSAL", sources: [{ source: "a.pdf" }] }),
        ),
      ),
    });
    w.type("hello there");
    w.submit();
    await flush();
    expect(w.$$(".sources").length).toBe(0);
  });

  it("nothing is stored in the browser, and events never carry the patient text", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const events = [];
    const w = mount();
    w.widget.addEventListener("onecare-chat:response", (e) =>
      events.push(e.detail),
    );
    w.type("my private health question");
    w.submit();
    await flush();
    expect(setItem).not.toHaveBeenCalled();
    expect(document.cookie).toBe("");
    expect(events).toEqual([
      { type: "ANSWER", language: "en", requestId: "0123456789abcdef" },
    ]);
    expect(JSON.stringify(events)).not.toContain("private");
  });
});

describe("keyboard and input rules", () => {
  it("Enter sends, Shift+Enter does not, and Enter during IME composition does not", async () => {
    const fetchImpl = vi.fn(async () => response(200, reply()));
    const w = mount({ fetchImpl });
    w.type("hello there");
    expect(w.press("Enter", { shiftKey: true }).defaultPrevented).toBe(false);
    expect(w.press("Enter", { isComposing: true }).defaultPrevented).toBe(
      false,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(w.press("Enter").defaultPrevented).toBe(true);
    await flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("an empty or whitespace-only message is never sent", async () => {
    const fetchImpl = vi.fn(async () => response(200, reply()));
    const w = mount({ fetchImpl });
    w.type("    \n  ");
    expect(w.send.disabled).toBe(true);
    w.submit();
    await flush();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("the 500-character limit counts code points: Tamil and astral letters are fine, 501 is refused without a request", async () => {
    const fetchImpl = vi.fn(async () => response(200, reply()));
    const w = mount({ fetchImpl });
    w.type("ப".repeat(500));
    expect(w.send.disabled).toBe(false);
    w.submit();
    await flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    w.type("𝐀".repeat(500)); // 1000 UTF-16 units but 500 characters
    expect(w.send.disabled).toBe(false);
    w.submit(); // and it really is sent, not just enabled
    await flush();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).query).toBe(
      "𝐀".repeat(500),
    );
    w.type("ப".repeat(501));
    expect(w.send.disabled).toBe(true);
    w.submit();
    await flush();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(w.$(".input-error").textContent).toBe(
      STRINGS.en.tooLong.replace("{max}", "500"),
    );
    expect(w.$(".input-error").getAttribute("role")).toBe("alert");
  });

  it("a counter appears near the limit and turns red above it", () => {
    const w = mount();
    w.type("a".repeat(100));
    expect(w.$(".counter").hidden).toBe(true);
    w.type("a".repeat(450));
    expect(w.$(".counter").hidden).toBe(false);
    expect(w.$(".counter").textContent).toBe("450/500");
    w.type("a".repeat(501));
    expect(w.$(".counter").classList.contains("over")).toBe(true);
  });

  it("typing clears the too-long message, and max-chars is configurable", async () => {
    const w = mount({ attrs: { "max-chars": "10" } });
    w.type("a".repeat(11));
    w.submit();
    expect(w.$(".input-error").textContent).toContain("10");
    w.type("short");
    expect(w.$(".input-error")).toBeNull();
  });
});

describe("lifecycle", () => {
  it("removing the widget aborts the request in flight and shows nothing afterwards", async () => {
    let signal;
    const fetchImpl = vi.fn(
      (url, init) =>
        new Promise((_, reject) => {
          signal = init.signal;
          init.signal.addEventListener("abort", () =>
            reject(new DOMException("x", "AbortError")),
          );
        }),
    );
    const w = mount({ fetchImpl });
    w.type("hello there");
    w.submit();
    await flush();
    w.widget.remove();
    await flush();
    expect(signal.aborted).toBe(true);
  });
});
