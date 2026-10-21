import { Outlet } from "react-router-dom";

import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import Breadcrumbs from "../components/Breadcrumbs";
import { useSelector } from "react-redux";
import { selectRole } from "../features/auth/authSlice";
import AdminLayout from "./AdminLayout";

/**
 * CFG-04 — staff layout shell (SDS §2.4.8): top bar (profile, logout),
 * role-driven sidebar, breadcrumbs, and the routed screen.
 * Built with CFG-01 tokens and CFG-04 components. Role layouts delegate
 * here so the chrome stays consistent across /admin, /doctor,
 * /pharmacist and /super-admin.
 *
 * CFG-07: `min-w-0` on <main> lets flex children shrink below their
 * intrinsic content width, so wide content (e.g. tables) scrolls inside
 * its own container instead of pushing a page-level horizontal scrollbar
 * at 360 px (AC1/AC3, NFRU-004).
 */
const StaffLayout = () => {
  const role = useSelector(selectRole);
  if (role === "ADMIN") return <AdminLayout />;
  return (
    <div className="flex min-h-screen flex-col bg-neutral-0">
      <TopBar />

      <div className="flex flex-1 flex-col lg:flex-row">
        <Sidebar />

        <main className="min-w-0 flex-1">
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
