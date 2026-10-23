import en from "../../locales/en.json";
import ta from "../../locales/ta.json";

const uiStrings = (copy) =>
  Object.fromEntries(Object.entries(copy).filter(([key]) => key !== "chips"));
export const STRINGS = { en: uiStrings(en.chatbot), ta: uiStrings(ta.chatbot) };

export function format(template, params = {}, lang = "en") {
  return String(template).replace(/\{(\w+)\}/g, (match, key) => {
    if (!(key in params)) return match;
    return typeof params[key] === "number"
      ? new Intl.NumberFormat(lang === "ta" ? "ta-LK" : "en-LK", {
          useGrouping: false,
        }).format(params[key])
      : String(params[key]);
  });
}
