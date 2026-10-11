import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LuLogOut } from "react-icons/lu";

import Button from "./Button";
import Logo from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";
import {
  clearSession,
  selectRole,
  selectUser,
} from "../features/auth/authSlice";
import { dashboardPathForRole } from "../constants/roles";
import { logout } from "../services/authService";

const TopBar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const role = useSelector(selectRole);

  const displayName = user?.name ?? user?.email ?? "Signed in as";

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
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => navigate(dashboardPathForRole(role))}
          className="rounded-2xl"
          aria-label="Home"
        >
          <Logo size="sm" showWordmark={false} />
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <LanguageSwitcher />

          <span className="hidden text-sm text-neutral-600 sm:inline">
            {displayName}
          </span>

          <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
            <LuLogOut aria-hidden="true" className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
