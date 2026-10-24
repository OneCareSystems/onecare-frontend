import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const current = i18n.resolvedLanguage?.startsWith("ta") ? "ta" : "en";

  const changeLanguage = async (language) => {
    await i18n.changeLanguage(language);
    try {
      localStorage.setItem("language", language);
    } catch {
      // Storage can be blocked (private mode); the language still changes for this visit.
    }
    document.documentElement.lang = language;
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Label stays for screen readers; the globe icon shows the purpose visually */}
      <label htmlFor="language-select" className="sr-only">
        {t("common.language")}
      </label>

      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute left-2.5 text-slate-500"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20z" />
      </svg>

      <select
        id="language-select"
        value={current}
        onChange={(event) => changeLanguage(event.target.value)}
        className="cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-7 text-sm font-medium text-slate-700 transition hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        <option value="en">{t("publicCommon.english")}</option>
        <option value="ta">{t("publicCommon.tamil")}</option>
      </select>

      <svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-2.5 text-slate-500"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}