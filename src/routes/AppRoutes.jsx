import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/public/LoginPage";
import ForgotPasswordPage from "../pages/public/ForgotPasswordPage";
import ResetPasswordPage from "../pages/public/ResetPasswordPage";
import AdminLayout from "../layouts/AdminLayout";
import DoctorLayout from "../layouts/DoctorLayout";
import PharmacistLayout from "../layouts/PharmacistLayout";
import SuperAdminLayout from "../layouts/SuperAdminLayout";
import PublicLayout from "../layouts/PublicLayout";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import SuperAdminDashboardPage from "../pages/superAdmin/SuperAdminDashboardPage";
import PharmacistDashboardPage from "../pages/pharmacist/PharmacistDashboardPage";
import DoctorDashboardPage from "../pages/doctor/DoctorDashboardPage";
import TodaySchedulePage from "../pages/doctor/TodaySchedulePage";
import ConsultationPage from "../pages/doctor/ConsultationPage";
import HomePage from "../pages/public/HomePage";
import NotFoundPage from "../pages/public/NotFoundPage";
import ThemeReferencePage from "../pages/styleguide/ThemeReferencePage";
import ChangePasswordPage from "../pages/auth/ChangePasswordPage";
import QueuePage from "../pages/shared/QueuePage";
import StaffLayout from "../layouts/StaffLayout";
import RequireAuth from "./RequireAuth";
import { CHANGE_PASSWORD_PATH, ROUTE_ACCESS } from "../constants/routeAccess";
import PatientRecordsPage from "../pages/doctor/PatientRecordsPage";
import PatientDetails from "../pages/doctor/PatientDetails";
import KnowledgeBasePage from "../pages/doctor/KnowledgeBasePage";
import UserManagementPage from "../pages/superAdmin/UserManagementPage";
import AccessControlPage from "../pages/superAdmin/AccessControlPage";
import ClinicConfigPage from "../pages/superAdmin/ClinicConfigPage";
import SystemMaintenancePage from "../pages/superAdmin/SystemMaintenancePage";
import AuditLogsPage from "../pages/superAdmin/AuditLogsPage";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Site root always lands on the public home page. */}
      <Route path="/" element={<Navigate to="/home" replace />} />

      {/* Auth & Recovery pages are full-screen, no PublicLayout */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<PublicLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/styleguide" element={<ThemeReferencePage />} />
        {/* Unknown URLs render the public 404 instead of a blank page. */}
        <Route path="*" element={<NotFoundPage />} />
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
          <Route path="today-schedule" element={<TodaySchedulePage />} />
          <Route
            path="consultation/:appointmentId"
            element={<ConsultationPage />}
          />
          {/* Directory first, then the record opened from it. */}
          <Route path="patient-records" element={<PatientRecordsPage />} />
          <Route
            path="patient-records/:patientId"
            element={<PatientDetails />}
          />
          <Route
            path="/doctor/knowledge-base"
            element={<KnowledgeBasePage />}
          />
        </Route>
      </Route>

      {/* PHARMACIST AREA */}
      <Route element={<RequireAuth allowedRoles={ROUTE_ACCESS.pharmacist} />}>
        <Route path="/pharmacist" element={<PharmacistLayout />}>
          <Route path="dashboard" element={<PharmacistDashboardPage />} />
        </Route>
      </Route>

      {/* SUPER ADMIN AREA */}
      <Route
        element={<RequireAuth allowedRoles={ROUTE_ACCESS["super-admin"]} />}
      >
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route path="dashboard" element={<SuperAdminDashboardPage />} />
          <Route path="user-management" element={<UserManagementPage />} />
          <Route path="access-control" element={<AccessControlPage />} />
          <Route path="clinic-configuration" element={<ClinicConfigPage />} />
          <Route
            path="system-maintenance"
            element={<SystemMaintenancePage />}
          />
          <Route path="audits-reports" element={<AuditLogsPage />} />
        </Route>
      </Route>

      {/* SHARED SCREENS (AC4) — several roles, one route */}
      <Route element={<RequireAuth allowedRoles={ROUTE_ACCESS.queue} />}>
        <Route path="/queue" element={<StaffLayout />}>
          <Route index element={<QueuePage />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRoutes;
