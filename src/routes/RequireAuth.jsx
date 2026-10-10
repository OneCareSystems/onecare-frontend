import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import {
  selectIsAuthenticated,
  selectMustChangePassword,
  selectRole,
} from "../features/auth/authSlice";
import { dashboardPathForRole } from "../constants/roles";
import { CHANGE_PASSWORD_PATH } from "../constants/routeAccess";

/**
 * CFG-03 — role-based route guard (SDS §2.4.8, Table 9).
 * A UX layer only; the backend still authorises every request (403),
 * per Coding Standards §21.
 *
 * Check order:
 * 1. Unauthenticated           → /login                     (AC3)
 * 2. mustChangePassword flag    → /change-password           (AC5)
 * 3. Role not in allowedRoles[] → the user's own dashboard   (AC2, AC4)
 * 4. Otherwise render the route                             (AC1)
 *
 * Usage (pathless layout route, so allowedRoles is per route/group):
 *   <Route element={<RequireAuth allowedRoles={ROUTE_ACCESS.admin} />}>
 *     <Route path="/admin" element={<AdminLayout />}>...</Route>
 *   </Route>
 */
const RequireAuth = ({ allowedRoles }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectRole);
  const mustChangePassword = useSelector(selectMustChangePassword);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }

  const roleAllowed =
    !Array.isArray(allowedRoles) ||
    allowedRoles.length === 0 ||
    allowedRoles.includes(role);

  if (!roleAllowed) {
    return <Navigate to={dashboardPathForRole(role)} replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
