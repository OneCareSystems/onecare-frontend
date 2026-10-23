import PublicErrorBoundary from "../components/PublicErrorBoundary";
import "../styles/patient-public.css";
import { useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "../components/Footer";
import SiteHeader from "../components/SiteHeader";

const PublicLayout = () => {
  const { pathname, hash, key } = useLocation();

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
    <div className="flex min-h-screen flex-col bg-neutral-0">
      <SiteHeader />
      <main className="flex-1">
        <PublicErrorBoundary>
          <Outlet />
        </PublicErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
