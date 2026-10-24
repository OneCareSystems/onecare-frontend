import PublicErrorBoundary from "../components/PublicErrorBoundary";
import "../styles/patient-public.css";
import { useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Footer from "../components/Footer";
import SiteHeader from "../components/SiteHeader";

const PublicLayout = () => {
  const { pathname, hash, key } = useLocation();
  const { t } = useTranslation();

  useLayoutEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname, hash, key]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800">
      {/* Lets keyboard users jump past the header */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-blue-800 focus:shadow-lg"
      >
        {t("publicLanding.skipToContent", "Skip to content")}
      </a>

      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <PublicErrorBoundary>
          <Outlet />
        </PublicErrorBoundary>
      </main>

      <Footer />
    </div>
  );
};

export default PublicLayout;