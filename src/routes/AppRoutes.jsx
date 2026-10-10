import { Route, Routes } from "react-router-dom";
import LoginPage from "../pages/public/LoginPage";
import AdminLayout from "../layouts/AdminLayout";
import DoctorLayout from "../layouts/DoctorLayout";
import PharmacistLayout from "../layouts/PharmacistLayout";
import SuperAdminLayout from "../layouts/SuperAdminLayout";
import PublicLayout from "../layouts/PublicLayout";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import SuperAdminDashboardPage from "../pages/superAdmin/SuperAdminDashboardPage";
import PharmacistDashboardPage from "../pages/pharmacist/PharmacistDashboardPage";
import DoctorDashboardPage from "../pages/doctor/DoctorDashboardPage";
import HomePage from "../pages/public/HomePage";
import ThemeReferencePage from "../pages/styleguide/ThemeReferencePage";
import ChangePasswordPage from "../pages/auth/ChangePasswordPage";
import QueuePage from "../pages/shared/QueuePage";
import RequireAuth from "./RequireAuth";
import {
  CHANGE_PASSWORD_PATH,
  ROUTE_ACCESS,
} from "../constants/routeAccess";

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/styleguide" element={<ThemeReferencePage />} />
      </Route>

      {/* Any authenticated staff member changing their password (AC5) */}
      <Route element={<RequireAuth />}>
        <Route path={CHANGE_PASSWORD_PATH} element={<ChangePasswordPage />} />
      </Route>

      {/* ADMIN AREA */}
      <Route element={<RequireAuth allowedRoles={ROUTE_ACCESS.admin} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboardPage />} />
        </Route>
      </Route>

      {/* DOCTOR AREA */}
      <Route element={<RequireAuth allowedRoles={ROUTE_ACCESS.doctor} />}>
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route path="dashboard" element={<DoctorDashboardPage />} />
        </Route>
      </Route>

      {/* PHARMACIST AREA */}
      <Route element={<RequireAuth allowedRoles={ROUTE_ACCESS.pharmacist} />}>
        <Route path="/pharmacist" element={<PharmacistLayout />}>
          <Route path="dashboard" element={<PharmacistDashboardPage />} />
        </Route>
      </Route>

      {/* SUPER ADMIN AREA */}
      <Route element={<RequireAuth allowedRoles={ROUTE_ACCESS.superadmin} />}>
        <Route path="/superadmin" element={<SuperAdminLayout />}>
          <Route path="dashboard" element={<SuperAdminDashboardPage />} />
        </Route>
      </Route>

      {/* SHARED SCREENS (AC4) — several roles, one route */}
      <Route element={<RequireAuth allowedRoles={ROUTE_ACCESS.queue} />}>
        <Route path="/queue" element={<QueuePage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
