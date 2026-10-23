import PublicErrorBoundary from "../components/PublicErrorBoundary";
import "../styles/patient-public.css";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ClinicContact from "../components/ClinicContact";
import SiteHeader from "../components/SiteHeader";

const PublicLayout = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-neutral-0">
      <SiteHeader />
      <main className="flex-1">
        <PublicErrorBoundary>
          <Outlet />
        </PublicErrorBoundary>
      </main>
      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="page-container py-6 text-sm text-neutral-600">
          {t("publicCommon.footer")}
          <ClinicContact />
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
