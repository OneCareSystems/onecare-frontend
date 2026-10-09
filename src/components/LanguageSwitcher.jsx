import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = async (language) => {
    await i18n.changeLanguage(language);
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
  };

  return (
    <div>
      <label htmlFor="language-select">
        {i18n.t("common.language")}
      </label>

      <select
        id="language-select"
        value={i18n.resolvedLanguage?.startsWith("ta") ? "ta" : "en"}
        onChange={(event) => changeLanguage(event.target.value)}
      >
        <option value="en">English</option>
        <option value="ta">தமிழ்</option>
      </select>
    </div>
  );
}