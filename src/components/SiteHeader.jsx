
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

const SiteHeader = ({ style }) => {
  const { t } = useTranslation();
  const location = useLocation();

  // Controls the mobile navigation menu
  const [menuOpen, setMenuOpen] = useState(false);

  const homeLabel = t("publicLanding.home");

  // Close the mobile menu when a navigation link is clicked
  const closeMenu = () => setMenuOpen(false);

  // Also close the menu when the route changes
  const [previousPath, setPreviousPath] = useState(location.pathname);

  if (previousPath !== location.pathname) {
    setPreviousPath(location.pathname);
    setMenuOpen(false);
  }

  return (
    <header
      style={style}
      className="relative z-40 border-b border-slate-200 bg-white/90 backdrop-blur"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* Header: Logo and Navigation */}
        <div className="flex h-16 items-center justify-between gap-3">

          {/* Brand */}
          <Link
            to="/home"
            aria-label={homeLabel}
            onClick={closeMenu}
            className={`flex shrink-0 items-center gap-2.5 rounded-lg ${focusRing}`}
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 font-bold text-white"
            >
              +
            </span>

            <span className="text-lg font-bold text-slate-900">
              OneCare
            </span>
          </Link>

          {/* DESKTOP NAVIGATION */}
          {/* Hidden on mobile, visible on large screens */}
          <nav
            aria-label={t("publicLanding.navigation")}
            className="hidden lg:block"
          >
            <ul className="m-0 flex list-none items-center gap-1 p-0 sm:gap-2">

              {/* Home */}
              <li>
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

              {/* Book Appointment */}
              <li>
                <NavLink
                  to="/appointments"
                  className={`inline-flex items-center rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 active:scale-95 ${focusRing}`}
                >
                  {t("publicLanding.book")}
                </NavLink>
              </li>

              {/* English / Tamil Switcher */}
              <li className="flex items-center border-l border-slate-200 pl-2 sm:pl-3">
                <LanguageSwitcher />
              </li>

              {/* Staff Login */}
              <li>
                <NavLink
                  to="/login"
                  className={`inline-flex items-center rounded-lg border border-blue-700 bg-white px-3.5 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 ${focusRing}`}
                >
                  {t("publicLanding.staffLogin")}
                </NavLink>
              </li>
            </ul>
          </nav>

          {/* MOBILE HAMBURGER BUTTON */}
          {/* Visible on mobile, hidden on large screens */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className={`flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-100 lg:hidden ${focusRing}`}
          >
            {menuOpen ? (
              // Close icon (X)
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              // Hamburger icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* MOBILE NAVIGATION MENU */}
        {/* Appears only when hamburger button is clicked */}
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          hidden={!menuOpen}
          className={`${
            menuOpen ? "block" : "hidden"
          } border-t border-slate-200 py-4 lg:hidden`}
        >
          <ul className="flex flex-col gap-3">

            {/* Mobile Home */}
            <li>
              <NavLink
                to="/home"
                onClick={closeMenu}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-3 text-sm font-medium ${focusRing} ${
                    isActive
                      ? "bg-blue-50 text-blue-800"
                      : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                {homeLabel}
              </NavLink>
            </li>

            {/* Mobile Book Appointment */}
            <li>
              <NavLink
                to="/appointments"
                onClick={closeMenu}
                className={`block rounded-lg bg-blue-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-800 ${focusRing}`}
              >
                {t("publicLanding.book")}
              </NavLink>
            </li>

            {/* Mobile Staff Login */}
            <li>
              <NavLink
                to="/login"
                onClick={closeMenu}
                className={`block rounded-lg border border-blue-700 bg-white px-4 py-3 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50 ${focusRing}`}
              >
                {t("publicLanding.staffLogin")}
              </NavLink>
            </li>

            {/* Mobile Language Switcher */}
            <li className="border-t border-slate-200 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-3 px-2">
                <span className="text-sm font-medium text-slate-700">
                  {t("publicLanding.language", "Language")}
                </span>
                <LanguageSwitcher />
              </div>
            </li>

          </ul>
        </nav>
      </div>
    </header>
  );
};

export default SiteHeader;




// import { Link, NavLink } from "react-router-dom";
// import { useTranslation } from "react-i18next";
// import LanguageSwitcher from "./LanguageSwitcher";

// const focusRing =
//   "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

// const SiteHeader = ({ style }) => {
//   const { t } = useTranslation();

//   const homeLabel = t("publicLanding.home");

//   return (
//     <header
//       style={style}
//       className="static border-b border-slate-200 bg-white/90 backdrop-blur"
//     >
//       <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
//         {/* Brand */}
//         <Link
//           to="/home"
//           aria-label={homeLabel}
//           className={`flex shrink-0 items-center gap-2.5 rounded-lg ${focusRing}`}
//         >
//           <span
//             aria-hidden="true"
//             className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 font-bold text-white"
//           >
//             +
//           </span>
//           <span className="text-lg font-bold text-slate-900">OneCare</span>
//         </Link>

//         {/* Public navigation */}
//         <nav aria-label={t("publicLanding.navigation")}>
//           <ul className="m-0 flex list-none items-center gap-1 p-0 sm:gap-2">
//             {/* The logo already goes home, so this link only shows from sm up */}
//             <li className="hidden sm:block">
//               <NavLink
//                 to="/home"
//                 className={({ isActive }) =>
//                   `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${focusRing} ${
//                     isActive
//                       ? "bg-blue-50 text-blue-800"
//                       : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
//                   }`
//                 }
//               >
//                 {homeLabel}
//               </NavLink>
//             </li>

//             {/* Main action */}
//             <li>
//               <NavLink
//                 to="/appointments"
//                 className={`inline-flex items-center rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 active:scale-95 ${focusRing}`}
//               >
//                 {t("publicLanding.book")}
//               </NavLink>
//             </li>

//             {/* English / Tamil switcher */}
//             <li className="flex items-center border-l border-slate-200 pl-2 sm:pl-3">
//               <LanguageSwitcher />
//             </li>
//           </ul>
//         </nav>
//       </div>
//     </header>
//   );
// };

// export default SiteHeader;
