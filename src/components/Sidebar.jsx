import { useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import { LuLayoutDashboard, LuListChecks } from "react-icons/lu";

import { selectRole } from "../features/auth/authSlice";
import { NAV_ITEMS } from "../constants/navigation";

const ITEM_ICONS = {
  dashboard: LuLayoutDashboard,
  queue: LuListChecks,
};

const Sidebar = () => {
  const role = useSelector(selectRole);
  const items = NAV_ITEMS[role] ?? [];

  return (
    <nav
      aria-label="Main navigation"
      className="w-full shrink-0 border-b border-neutral-200 bg-neutral-50 lg:w-60 lg:border-b-0 lg:border-r"
    >
      <ul className="flex flex-row gap-1 p-3 lg:flex-col">
        {items.map((item) => {
          const Icon = ITEM_ICONS[item.id];

          return (
            <li key={item.id}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
                  ].join(" ")
                }
              >
                {Icon && <Icon aria-hidden="true" className="h-5 w-5" />}
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Sidebar;
