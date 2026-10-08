import { Outlet } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

const PublicLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-0">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="page-container py-6 text-sm text-neutral-600">
          OneCare — accessible healthcare platform
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
