import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import Button from "./Button";
import Icon from "./Icon";
import Logo from "./Logo";
import {
  clearSession,
  selectRole,
  selectUser,
} from "../features/auth/authSlice";
import { dashboardPathForRole } from "../constants/roles";
import { logout } from "../services/authService";

const TopBar = ({ showHome = true }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const role = useSelector(selectRole);

  const displayName =
    typeof user === "string"
      ? user
      : (user?.username ?? user?.name ?? user?.email ?? "Signed in as");

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Continue local logout even if the API fails.
    } finally {
      dispatch(clearSession());
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="border-b border-neutral-200 bg-neutral-0">
      <div
        className={`flex flex-wrap items-center gap-4 px-4 py-3 sm:px-6 ${showHome ? "justify-between" : "justify-end"}`}
      >
        {showHome && (
          <button
            type="button"
            onClick={() => navigate(dashboardPathForRole(role))}
            className="rounded-2xl"
            aria-label="Home"
          >
            <Logo size="sm" showWordmark={false} />
          </button>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {(role === "ADMIN" || role === "SUPER_ADMIN") && (
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-800 text-white"
              data-testid="admin-avatar"
              aria-hidden="true"
            >
              <Icon name="user" className="h-4 w-4" />
            </span>
          )}
          <span className="break-all text-sm text-neutral-600">
            {displayName}
          </span>

          <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
            <Icon name="log-out" className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
