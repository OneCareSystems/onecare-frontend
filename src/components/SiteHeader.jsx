import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

const SiteHeader = () => {
  const { t } = useTranslation();

  const homeLabel = t("publicLanding.home");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand */}
        <Link
          to="/home"
          aria-label={homeLabel}
          className={`flex shrink-0 items-center gap-2.5 rounded-lg ${focusRing}`}
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 font-bold text-white"
          >
            +
          </span>
          <span className="text-lg font-bold text-slate-900">OneCare</span>
        </Link>

        {/* Public navigation */}
        <nav aria-label={t("publicLanding.navigation")}>
          <ul className="m-0 flex list-none items-center gap-1 p-0 sm:gap-2">
            {/* The logo already goes home, so this link only shows from sm up */}
            <li className="hidden sm:block">
              <NavLink
                to="/home"
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${focusRing} ${
                    isActive
                      ? "bg-blue-50 text-blue-800"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                {homeLabel}
              </NavLink>
            </li>

            {/* Main action */}
            <li>
              <NavLink
                to="/appointments"
                className={`inline-flex items-center rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 active:scale-95 ${focusRing}`}
              >
                {t("publicLanding.book")}
              </NavLink>
            </li>


            {/* English / Tamil switcher */}
            <li className="flex items-center border-l border-slate-200 pl-2 sm:pl-3">
              <LanguageSwitcher />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default SiteHeader;