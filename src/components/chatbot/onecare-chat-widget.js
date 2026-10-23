import { ChatApiError, sendQuery } from "./api.js";
import { DEFAULT_CHIPS } from "./chips.js";
import { STRINGS, format } from "./il8n.js";
import { STYLES } from "./styles.js";
import { countCodePoints, detectScriptLanguage, safeHttpsUrl } from "./text.js";

const ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg>';

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text")
      node.textContent = value; // textContent only: server text is never interpreted as HTML
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

export class OneCareChatWidget extends HTMLElement {
  static get observedAttributes() {
    return ["lang", "position"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.fetchImpl = null; // lets tests and special transports replace fetch
    this._chips = DEFAULT_CHIPS;
    this._messages = [];
    this._status = "idle"; // idle | loading | slow
    this._uiLang = "en";
    this._slowTimer = null;
    this._cooldownTimer = null;
    this._cooldownUntil = 0;
    this._abort = null;
    this._lastText = null;
    this._inputError = "";
    this._nextId = 1;
    this._built = false;
    this._isOpen = false;
  }

  // ---------- configuration ----------
  get apiUrl() {
    return this.getAttribute("api-url") || "/api/chatbot/query";
  }
  get timeoutMs() {
    return Number(this.getAttribute("timeout-ms")) || 45000;
  }
  get slowAfterMs() {
    return Number(this.getAttribute("slow-after-ms")) || 8000;
  }
  get maxChars() {
    return Number(this.getAttribute("max-chars")) || 500;
  }
  get chips() {
    return this._chips;
  }
  set chips(value) {
    const clean = {};
    for (const lang of ["en", "ta"]) {
      clean[lang] = Array.isArray(value?.[lang])
        ? value[lang].filter(
            (c) =>
              c &&
              typeof c.label === "string" &&
              typeof c.query === "string" &&
              c.label.trim() &&
              c.query.trim(),
          )
        : [];
    }
    this._chips = clean;
    if (this._built) this._renderChips();
  }

  // ---------- lifecycle ----------
  connectedCallback() {
    if (!this._built) this._build();
    this._uiLang = this._initialLang();
    this._applyPosition();
    this._renderAll();
    if (this.hasAttribute("open")) this.open();
  }

  disconnectedCallback() {
    this._abort?.abort();
    clearTimeout(this._slowTimer);
    clearInterval(this._cooldownTimer);
    this._slowTimer = this._cooldownTimer = null;
  }

  attributeChangedCallback(name) {
    if (!this._built) return;
    if (name === "position") this._applyPosition();
    if (name === "lang") {
      this._uiLang = this._initialLang();
      this._renderAll();
    }
  }

  _initialLang() {
    const attr = (
      this.getAttribute("lang") ||
      (typeof navigator !== "undefined" ? navigator.language : "") ||
      "en"
    ).toLowerCase();
    return attr.startsWith("ta") ? "ta" : "en";
  }

  _applyPosition() {
    const left = this.getAttribute("position") === "left";
    this._root.classList.toggle("left", left);
    this._root.classList.toggle("right", !left);
  }

  get _S() {
    return STRINGS[this._uiLang];
  }

  // ---------- DOM skeleton, built once ----------
  _build() {
    this._built = true;
    const root = this.shadowRoot;
    root.append(el("style", { text: STYLES }));
    this._root = el("div", { class: "root right" });
    this._launcher = el("button", {
      class: "launcher",
      type: "button",
      "aria-expanded": "false",
      "aria-controls": "panel",
    });
    this._launcher.innerHTML = ICON; // static icon only, no external data
    this._panel = el("section", {
      class: "panel",
      id: "panel",
      role: "dialog",
      "aria-labelledby": "title",
      hidden: true,
    });
    this._title = el("h2", { id: "title" });
    this._closeBtn = el("button", { class: "close", type: "button" }, "×");
    this._disclaimer = el("p", { class: "disclaimer" });
    this._log = el("div", {
      class: "log",
      role: "log",
      "aria-live": "polite",
      "aria-relevant": "additions",
    });
    this._chipsBox = el("details", { class: "chips" });
    this._chipsSummary = el("summary");
    this._chipsBody = el("div");
    this._chipsBox.append(this._chipsSummary, this._chipsBody);
    this._statusBox = el("div", { class: "status", "aria-live": "polite" });
    this._form = el("form", { novalidate: true });
    this._input = el("textarea", {
      rows: 1,
      autocomplete: "off",
      enterkeyhint: "send",
    });
    this._counter = el("span", { class: "counter", hidden: true });
    this._sendBtn = el("button", { class: "send", type: "submit" });
    this._form.append(this._counter, this._input, this._sendBtn);
    this._panel.append(
      el("header", {}, this._title, this._closeBtn),
      this._disclaimer,
      this._log,
      this._chipsBox,
      this._statusBox,
      this._form,
    );
    this._root.append(this._panel, this._launcher);
    root.append(this._root);

    this._launcher.addEventListener("click", () =>
      this._isOpen ? this.close() : this.open(),
    );
    this._closeBtn.addEventListener("click", () => this.close());
    this._panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        this.close();
      }
    });
    this._form.addEventListener("submit", (e) => {
      e.preventDefault();
      this._submit(this._input.value);
    });
    this._input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey || e.isComposing || e.keyCode === 229)
        return; // Tamil IMEs use Enter to confirm a word
      e.preventDefault();
      this._submit(this._input.value);
    });
    this._input.addEventListener("input", () => {
      this._clearInputError();
      this._autoGrow();
      this._updateControls();
    });
  }

  // ---------- public API ----------
  open() {
    this._isOpen = true;
    this._panel.hidden = false;
    this._launcher.setAttribute("aria-expanded", "true");
    this._renderLauncher();
    this._input.focus();
    this._emit("open");
  }

  close() {
    this._isOpen = false;
    this._panel.hidden = true;
    this._launcher.setAttribute("aria-expanded", "false");
    this._renderLauncher();
    this._launcher.focus();
    this._emit("close");
  }

  /** Sends a question programmatically, for example from a "Ask about this" button in the portal. */
  ask(text) {
    if (!this._isOpen) this.open();
    return this._submit(text);
  }

  // ---------- sending ----------
  _inCooldown() {
    return Date.now() < this._cooldownUntil;
  }
  _busy() {
    return this._status === "loading" || this._status === "slow";
  }

  async _submit(rawText, { isRetry = false } = {}) {
    const text = String(rawText ?? "").trim();
    if (!text || this._busy() || this._inCooldown()) return;
    if (countCodePoints(text) > this.maxChars) {
      this._inputError = format(
        this._S.tooLong,
        { max: this.maxChars },
        this._uiLang,
      );
      this._renderStatus();
      this._updateControls();
      return;
    }
    this._clearInputError();
    const lang = this.hasAttribute("lang")
      ? this._initialLang()
      : detectScriptLanguage(text);
    if (isRetry) {

      this._messages = this._messages.filter(
        (m) => !(m.role === "error" && m.question === text),
      );

      this._messages = this._messages.filter((m) => m.role !== "error");

    } else {
      this._push({ role: "user", text, lang });
      this._input.value = "";
      this._autoGrow();
    }
    this._uiLang = lang;
    this._lastText = text;
    this._status = "loading";
    clearTimeout(this._slowTimer);
    this._slowTimer = setTimeout(() => {
      if (this._status === "loading") {
        this._status = "slow";
        this._renderAll();
      }
    }, this.slowAfterMs);
    this._renderAll();

    const controller = new AbortController();
    this._abort = controller;
    try {
      const reply = await sendQuery(this.apiUrl, text, {
        timeoutMs: this.timeoutMs,
        fetchImpl: this.fetchImpl ?? undefined,
        signal: controller.signal,
      });
      if (!this.isConnected) return;
      if (!this.hasAttribute("lang")) this._uiLang = reply.language;

      this._uiLang = reply.language;
      this._push({
        role: "bot",
        text: reply.message,
        lang: reply.language,
        type: reply.type,
        booking: reply.action === "BOOK_APPOINTMENT",
        sources: reply.type === "ANSWER" ? reply.sources : [],
      });
      this._emit("response", {
        type: reply.type,
        language: reply.language,
        requestId: reply.requestId,
      });
    } catch (err) {
      if (!this.isConnected) return;
      this._handleError(err, this._uiLang);
    } finally {
      clearTimeout(this._slowTimer);
      this._abort = null;
      this._status = "idle";
      this._renderAll();
      if (this._isOpen && !this._inCooldown()) this._input.focus();
    }
  }

  _handleError(err, lang) {
    const kind = err instanceof ChatApiError ? err.kind : "unexpected";
    if (kind === "aborted") return;
    const E = STRINGS[lang].errors;
    if (kind === "rate_limit") {
      const seconds = err.retryAfter ?? 30;
      this._push({
        role: "error",
        lang,
        text: format(E.rateLimit, { seconds }, lang),
        kind,
        retryable: true,
        question: this._lastText,

        text: format(E.rateLimit, { seconds }),
        kind,

      });
      this._startCooldown(seconds);
    } else if (kind === "bad_request") {
      this._push({ role: "error", lang, text: E.badRequest, kind });
      this._input.value = this._lastText ?? ""; // the patient's words are not lost: they can edit and resend
      this._autoGrow();
    } else if (kind === "network") {
      this._push({
        role: "error",
        lang,
        text: E.network,
        kind,
        retryable: true,

        question: this._lastText,
      });
    } else if (kind === "timeout") {
      this._push({
        role: "error",
        lang,
        text: E.timeout,
        kind,
        retryable: true,
        question: this._lastText,
      });
    } else {
      this._push({
        role: "error",
        lang,
        text: E.server,
        kind: "server",
        retryable: true,

        question: this._lastText,
      });
    }
    this._emit("error", { kind });
  }

  _startCooldown(seconds) {
    clearInterval(this._cooldownTimer);
    this._cooldownUntil = Date.now() + seconds * 1000;
    this._cooldownTimer = setInterval(() => {
      if (!this._inCooldown()) {
        clearInterval(this._cooldownTimer);
        this._cooldownTimer = null;
      }
      this._renderStatus();
      this._updateControls();
    }, 1000);
  }

  _retry(question) {
    return this._submit(question, { isRetry: true });

  _retry() {
    return this._submit(this._lastText, { isRetry: true });
  }
  _clearInputError() {
    if (this._inputError) {
      this._inputError = "";
      this._renderStatus();
    }
  }
  _push(message) {
    this._messages.push({ id: this._nextId++, ...message });
  }
  _emit(name, detail = {}) {
    this.dispatchEvent(
      new CustomEvent(`onecare-chat:${name}`, {
        detail,
        bubbles: true,
        composed: true,
      }),
    ); // never contains the patient's text
  }

  // ---------- rendering ----------
  _renderAll() {
    this._renderChrome();
    this._renderMessages();
    this._renderChips();
    this._renderStatus();
    this._updateControls();
  }

  _renderLauncher() {
    this._launcher.setAttribute(
      "aria-label",
      this._isOpen ? this._S.close : this._S.open,
    );
  }

  _renderChrome() {
    const S = this._S;
    this._renderLauncher();
    this._title.textContent = S.title;
    this._closeBtn.setAttribute("aria-label", S.close);
    this._disclaimer.textContent = S.disclaimer;
    this._input.setAttribute("placeholder", S.placeholder);
    this._input.setAttribute("aria-label", S.placeholder);
    this._sendBtn.textContent = S.send;
    this._panel.setAttribute("lang", this._uiLang);
    this._log.setAttribute("aria-label", S.title);
  }

  _renderMessages() {
    const S = this._S;
    const nodes = [];
    nodes.push(
      el(
        "div",
        { class: "msg bot", lang: this._uiLang },
        el("p", { text: S.greeting }),
      ),
    );
    for (const m of this._messages) {
      const who = m.role === "user" ? S.you : S.assistant;
      const node = el(
        "div",
        {
          class: `msg ${m.role}`,
          lang: m.role === "error" ? this._uiLang : m.lang,

          lang: m.lang,

          "data-type": m.type,
          role: m.role === "error" ? "alert" : null,
        },
        el("span", { class: "who", text: `${who}: ` }),

        el("p", { text: m.role === "error" ? this._errorText(m) : m.text }),
      );
      if (m.role === "bot" && m.sources?.length)
        node.append(this._renderSources(m.sources, this._uiLang));

        el("p", { text: m.text }),
      );
      if (m.role === "bot" && m.sources?.length)
        node.append(this._renderSources(m.sources, m.lang));

      if (m.booking) {
        const booking = el("button", {
          class: "booking-link",
          type: "button",
          text: m.lang === "ta" ? "நேரம் முன்பதிவு செய்க" : "Book Appointment",
        });
        booking.addEventListener("click", () => this._emit("book-appointment"));
        node.append(booking);
      }
      if (m.retryable) {
        const retry = el("button", {
          class: "retry",
          type: "button",

          text: S.retry,
        });
        retry.disabled = this._busy() || this._inCooldown();
        retry.addEventListener("click", () => this._retry(m.question));

          text: STRINGS[m.lang].retry,
        });
        retry.addEventListener("click", () => this._retry());

        node.append(retry);
      }
      nodes.push(node);
    }
    if (this._busy()) {
      nodes.push(
        el(
          "div",
          { class: "msg bot typing", role: "status", "aria-label": S.typing },
          el("i"),
          el("i"),
          el("i"),
        ),
      );
    }
    this._log.replaceChildren(...nodes);
    this._log.scrollTop = this._log.scrollHeight;
  }

  _errorText(message) {
    const errors = this._S.errors;
    if (message.kind === "rate_limit")
      return format(
        errors.rateLimit,
        {
          seconds: Math.max(
            0,
            Math.ceil((this._cooldownUntil - Date.now()) / 1000),
          ),
        },
        this._uiLang,
      );
    return (
      errors[message.kind === "bad_request" ? "badRequest" : message.kind] ||
      errors.server
    );
  }

  _renderSources(sources, lang) {
    const box = el("p", { class: "sources" }, `${STRINGS[lang].source}: `);
    sources.forEach((s, i) => {
      if (i > 0) box.append(", ");
      const safe = safeHttpsUrl(s.url);
      if (safe)
        box.append(
          el("a", {
            href: safe,
            target: "_blank",
            rel: "noopener noreferrer",
            text: s.source || new URL(safe).hostname,
          }),
        );
      else box.append(s.source);
    });
    return box;
  }

  _renderChips() {
    const S = this._S;
    this._chipsSummary.textContent = S.chipsLabel;
    const groups = [];

    for (const lang of [this._uiLang]) {

    for (const lang of ["en", "ta"]) {

      const list = this._chips[lang] || [];
      if (!list.length) continue;
      const group = el("div", { class: "chip-group", lang, role: "group" });
      for (const chip of list) {
        const btn = el("button", {
          class: "chip",
          type: "button",
          lang,
          "data-chip": chip.id,
          text: chip.label,
        });
        btn.disabled = this._busy() || this._inCooldown();
        btn.addEventListener("click", () => this._submit(chip.query));
        group.append(btn);
      }
      groups.push(group);
    }
    this._chipsBody.replaceChildren(...groups);
    this._chipsBox.hidden = groups.length === 0;
    this._chipsBox.open = !this._messages.some((m) => m.role === "user"); // open for a new conversation, folded afterwards
  }

  _renderStatus() {
    const S = this._S;
    const lines = [];
    if (this._status === "slow")
      lines.push(el("p", { role: "status", text: S.slow }));
    if (this._inCooldown()) {
      const seconds = Math.max(
        1,
        Math.ceil((this._cooldownUntil - Date.now()) / 1000),
      );
      lines.push(
        el("p", {
          role: "status",
          class: "cooldown",

          text: format(S.cooldown, { seconds }, this._uiLang),

          text: format(S.cooldown, { seconds }),

        }),
      );
    }
    if (this._inputError)
      lines.push(
        el("p", {
          class: "input-error",
          role: "alert",
          text: this._inputError,
        }),
      );
    this._statusBox.replaceChildren(...lines);
  }

  _updateControls() {
    const value = this._input.value;
    const count = countCodePoints(value);
    const max = this.maxChars;
    const over = count > max;
    this._counter.hidden = count < max * 0.8;
    this._counter.textContent = `${count}/${max}`;
    this._counter.classList.toggle("over", over);
    const blocked = this._busy() || this._inCooldown();
    this._sendBtn.disabled = blocked || over || !value.trim();
    for (const chip of this._chipsBody.querySelectorAll(".chip"))
      chip.disabled = blocked;

    for (const retry of this._log.querySelectorAll(".retry"))
      retry.disabled = blocked;

    this._input.setAttribute("aria-busy", String(this._busy()));
  }

  _autoGrow() {
    this._input.style.height = "auto";
    this._input.style.height = `${Math.min(this._input.scrollHeight || 40, 120)}px`;
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("onecare-chat-widget")
) {
  customElements.define("onecare-chat-widget", OneCareChatWidget);
}
