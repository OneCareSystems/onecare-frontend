// UI-03: the one place that talks to the server. Every failure is turned into a ChatApiError with a `kind`,
// so the widget can show the right bilingual message. The server's own error text is never shown to the patient.
import { detectScriptLanguage, safeHttpsUrl } from "./text.js";

const TYPES = new Set(["ANSWER", "REFUSAL", "FALLBACK", "CLINIC_FACT"]);

/** kind: network | timeout | rate_limit | bad_request | server | unexpected | aborted */
export class ChatApiError extends Error {
  constructor(kind, detail = {}) {
    super(kind);
    this.name = "ChatApiError";
    this.kind = kind;
    this.status = detail.status ?? null;
    this.retryAfter = detail.retryAfter ?? null;
  }
}

/** Accept Retry-After as delta seconds or an HTTP date. */
export function parseRetryAfter(value, fallback = 30) {

  const raw = String(value ?? "").trim();
  const seconds = /^\d+$/.test(raw)
    ? Number(raw)
    : Math.ceil((Date.parse(raw) - Date.now()) / 1000);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : fallback;
  const seconds = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(seconds) || seconds < 1) return fallback;
  return Math.min(seconds, 3600);
}

/** Accepts both {data: {...}} (ApiResponse wrapper) and a bare object. Anything unexpected throws 'unexpected'. */
export function parseReply(json) {
  const payload =
    json && typeof json === "object"
      ? json.data && typeof json.data === "object"
        ? json.data
        : json
      : null;
  if (
    !payload ||
    !TYPES.has(payload.type) ||
    typeof payload.message !== "string" ||
    !payload.message.trim()
  ) {
    throw new ChatApiError("unexpected");
  }
  const language =
    payload.language === "TA"
      ? "ta"
      : payload.language === "EN"
        ? "en"
        : detectScriptLanguage(payload.message);
  const sources = Array.isArray(payload.sources)
    ? payload.sources
        .slice(0, 3)
        .map((s) => ({
          source: typeof s?.source === "string" ? s.source.slice(0, 200) : "",
          url: safeHttpsUrl(s?.url),
        }))
        .filter((s) => s.source || s.url)
    : [];
  return {
    action:
      payload.type === "CLINIC_FACT" && payload.action === "BOOK_APPOINTMENT"
        ? "BOOK_APPOINTMENT"
        : null,
    type: payload.type,
    language,
    message: payload.message,
    sources,
    requestId:
      typeof payload.requestId === "string"
        ? payload.requestId.slice(0, 64)
        : null,
  };
}

export async function sendQuery(
  url,
  text,
  { timeoutMs = 45000, fetchImpl, signal } = {},
) {
  const doFetch =
    fetchImpl ?? (typeof fetch === "function" ? fetch.bind(globalThis) : null);
  if (!doFetch) throw new ChatApiError("unexpected");
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", forwardAbort, { once: true });
  }
  const failed = () =>
    new ChatApiError(
      timedOut ? "timeout" : controller.signal.aborted ? "aborted" : "network",
    );
  try {
    if (controller.signal.aborted) throw failed(); // cancelled before we even started
    let response;
    try {
      response = await doFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json",
        },
        body: JSON.stringify({ query: text }),
        credentials: "omit", // a public endpoint: never send cookies
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      throw failed();
    }
    const status = response.status;
    if (status === 429)
      throw new ChatApiError("rate_limit", {
        status,
        retryAfter: parseRetryAfter(response.headers?.get?.("Retry-After")),
      });
    if (status === 408) throw new ChatApiError("timeout", { status });
    if ([400, 413, 415, 422].includes(status))
      throw new ChatApiError("bad_request", { status });
    if (status >= 500) throw new ChatApiError("server", { status });
    if (!response.ok) throw new ChatApiError("unexpected", { status });
    let json;
    try {
      json = await response.json();
    } catch {
      if (timedOut || controller.signal.aborted) throw failed();
      throw new ChatApiError("unexpected", { status });
    }
    return parseReply(json);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }
}
