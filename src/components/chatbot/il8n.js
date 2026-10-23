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

export const STRINGS = {
  en: {
    open: "Open chat",
    close: "Close chat",
    title: "Clinic assistant",
    placeholder: "Type your question…",
    send: "Send",
    you: "You",
    assistant: "Assistant",
    disclaimer:
      "I share general clinic information. I cannot give medical advice, diagnoses or prescriptions.",
    greeting: "Hello! Ask me about clinic hours, doctors or appointments.",
    typing: "The assistant is typing",
    slow: "This is taking longer than usual. Please wait…",
    retry: "Try again",
    source: "Source",
    chipsLabel: "Suggested questions",
    cooldown: "You can send another message in {seconds} s.",
    tooLong: "Your message is too long (maximum {max} characters).",
    errors: {
      network:
        "Could not connect. Please check your internet connection and try again.",
      server:
        "The assistant is temporarily unavailable. Please try again shortly, or contact the clinic.",
      timeout: "The reply is taking too long. Please try again.",
      rateLimit:
        "Too many requests. Please wait {seconds} seconds and try again.",
      badRequest:
        "Your message could not be sent. Please change it and try again.",
    },
  },
  ta: {
    open: "உரையாடலைத் திறக்கவும்",
    close: "உரையாடலை மூடவும்",
    title: "கிளினிக் உதவியாளர்",
    placeholder: "உங்கள் கேள்வியை உள்ளிடவும்…",
    send: "அனுப்பு",
    you: "நீங்கள்",
    assistant: "உதவியாளர்",
    disclaimer:
      "நான் பொதுவான கிளினிக் தகவல்களை வழங்குகிறேன். மருத்துவ ஆலோசனை, நோயறிதல் அல்லது மருந்துச்சீட்டு வழங்க இயலாது.",
    greeting:
      "வணக்கம்! கிளினிக் நேரம், மருத்துவர்கள் அல்லது முன்பதிவு பற்றிக் கேளுங்கள்.",
    typing: "உதவியாளர் பதிலளிக்கிறார்",
    slow: "வழக்கத்தை விட அதிக நேரம் ஆகிறது. சற்று காத்திருக்கவும்…",
    retry: "மீண்டும் முயற்சிக்கவும்",
    source: "மூலம்",
    chipsLabel: "பரிந்துரைக்கப்பட்ட கேள்விகள்",
    cooldown: "இன்னும் {seconds} வினாடிகளில் மீண்டும் அனுப்பலாம்.",
    tooLong: "உங்கள் செய்தி மிக நீளமாக உள்ளது (அதிகபட்சம் {max} எழுத்துகள்).",
    errors: {
      network:
        "இணைக்க முடியவில்லை. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
      server:
        "உதவியாளர் தற்காலிகமாகக் கிடைக்கவில்லை. சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும் அல்லது கிளினிக்கைத் தொடர்புகொள்ளவும்.",
      timeout: "பதில் வர அதிக நேரம் ஆகிறது. மீண்டும் முயற்சிக்கவும்.",
      rateLimit:
        "மிக அதிகமான கோரிக்கைகள். {seconds} வினாடிகள் காத்திருந்து மீண்டும் முயற்சிக்கவும்.",
      badRequest:
        "உங்கள் செய்தியை அனுப்ப முடியவில்லை. செய்தியை மாற்றி மீண்டும் முயற்சிக்கவும்.",
    },
  },
};

export function format(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    key in params ? String(params[key]) : match,

}
