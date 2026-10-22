import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import Icon from "../components/Icon";
import Breadcrumbs from "../components/Breadcrumbs";

const AdminLayout = () => (
  <div className="m-2 flex min-h-[calc(100vh-1rem)] flex-col overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-neutral-0 to-secondary-50 text-primary-950 shadow-sm lg:flex-row">
    <aside className="w-full shrink-0 lg:w-60 lg:border-r lg:border-primary-100 lg:pt-7">
      <div className="flex items-center gap-2 px-5 py-3 text-sm font-bold leading-tight text-primary-800 lg:mb-6 lg:py-0">
        <Icon name="stethoscope" size={30} />
        <span>
          One Care
          <small className="block text-[9px] tracking-wider">
            FAMILY CLINIC
          </small>
        </span>
      </div>
      <Sidebar />
    </aside>
    <div className="min-w-0 flex-1">
      <TopBar showHome={false} />
      <main className="min-w-0">
        <Breadcrumbs />
        <div className="px-3 pb-6 md:px-5">
          <Outlet />
        </div>
      </main>
    </div>
  </div>
);

export default AdminLayout;
