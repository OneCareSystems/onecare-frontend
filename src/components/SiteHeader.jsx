import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Logo from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";

const SiteHeader = () => {
  const { t } = useTranslation();

  const NAV_LINKS = [
    {
      to: "/home",
      label: t("publicLanding.home"),
    },
    {
      to: "/appointments",
      label: t("publicLanding.book"),
    },
    {
      to: "/login",
      label: t("publicLanding.staffLogin"),
    },
  ];

  return (
    <header className="border-b border-neutral-200 bg-neutral-50">
      <div className="page-container flex flex-wrap items-center justify-between gap-4 py-4">
        {/* Existing OneCare Logo */}
        <Link
          to="/home"
          className="rounded-2xl"
          aria-label={t("publicLanding.home")}
        >
          <Logo />
        </Link>

        {/* Public Navigation */}
        <nav aria-label={t("publicLanding.navigation")}>
          <ul className="flex flex-wrap items-center gap-2 sm:gap-3">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-primary-50 hover:text-primary-700 sm:text-base"
                >
                  {link.label}
                </Link>
              </li>
            ))}

            {/* Existing English / Tamil Language Switcher */}
            <li className="flex items-center">
              <LanguageSwitcher />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default SiteHeader;
