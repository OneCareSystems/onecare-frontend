import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import {
  selectExpiresAt,
  selectIsAuthenticated,
  selectRefreshToken,
  selectRole,
} from "../features/auth/authSlice";
import { dashboardPathForRole } from "../constants/roles";

/**
 * CFG-03 — role-based route guard (SDS §2.4.8, Table 9).
 * A UX layer only; the backend still authorises every request (403),
 * per Coding Standards §21.
 *
 * Check order:
 * 1. Unauthenticated or expired without refresh token → /login (AC3)
 * 2. Role not in allowedRoles[]                       → the user's own dashboard (AC2, AC4)
 * 3. Otherwise render the route                       (AC1)
 *
 * Usage (pathless layout route, so allowedRoles is per route/group):
 *   <Route element={<RequireAuth allowedRoles={ROUTE_ACCESS.admin} />}>
 *     <Route path="/admin" element={<AdminLayout />}>...</Route>
 *   </Route>
 */
const RequireAuth = ({ allowedRoles }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const expiresAt = useSelector(selectExpiresAt);
  const refreshToken = useSelector(selectRefreshToken);
  const role = useSelector(selectRole);
  const location = useLocation();
  const requiresExpiryCheck =
    isAuthenticated && Boolean(expiresAt) && !refreshToken;
  const [expiryCheck, setExpiryCheck] = useState({
    expiresAt: null,
    expired: false,
  });

  useEffect(() => {
    if (!requiresExpiryCheck) return undefined;

    const checkExpiry = () => {
      setExpiryCheck({
        expiresAt,
        expired: Date.now() >= expiresAt,
      });
    };

    checkExpiry();
    const timeoutId = setTimeout(
      checkExpiry,
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timeoutId);
  }, [expiresAt, requiresExpiryCheck]);

  const expiryCheckPending =
    requiresExpiryCheck && expiryCheck.expiresAt !== expiresAt;
  const isExpired =
    !isAuthenticated ||
    (requiresExpiryCheck && !expiryCheckPending && expiryCheck.expired);

  if (isExpired) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (expiryCheckPending) return null;

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
