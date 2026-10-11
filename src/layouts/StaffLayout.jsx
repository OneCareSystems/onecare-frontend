import { Outlet } from "react-router-dom";

import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import Breadcrumbs from "../components/Breadcrumbs";

/**
 * CFG-04 — staff layout shell (SDS §2.4.8): top bar (profile, logout),
 * role-driven sidebar, breadcrumbs, and the routed screen.
 * Built with CFG-01 tokens and CFG-04 components. Role layouts delegate
 * here so the chrome stays consistent across /admin, /doctor,
 * /pharmacist and /super-admin.
 */
const StaffLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-0">
      <TopBar />

      <div className="flex flex-1 flex-col lg:flex-row">
        <Sidebar />

        <main className="flex-1">
          <Breadcrumbs />
          <div className="px-4 pb-8 sm:px-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;
