import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function LanguageDocumentSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const language = i18n.resolvedLanguage?.startsWith("ta")
      ? "ta"
      : "en";

    document.documentElement.lang = language;
  }, [i18n.resolvedLanguage]);

  return null;
}