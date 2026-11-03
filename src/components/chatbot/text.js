// Small text helpers. No DOM, no dependencies.

/** Length in Unicode code points. "😀" and "𝐀" count as 1 (string.length would say 2), Tamil letters count as 1 each. */
export function countCodePoints(text) {
  return Array.from(String(text ?? "")).length;
}

/** 'ta' when at least half of the letters are Tamil script, otherwise 'en'. The same rule as the server (CHAT-01). */
export function detectScriptLanguage(text) {
  let tamil = 0;
  let latin = 0;
  for (const ch of String(text ?? "")) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x0b80 && cp <= 0x0bff) tamil += 1;
    else if (cp < 0x250 && /\p{L}/u.test(ch)) latin += 1;
  }
  const total = tamil + latin;
  return total > 0 && tamil / total >= 0.5 ? "ta" : "en";
}

/** Returns the URL only if it is a plain https link without credentials. Anything else (javascript:, data:, http:) returns null. */
export function safeHttpsUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
