import { useSelector } from "react-redux";
import { NavLink } from "react-router-dom";

import { selectRole } from "../features/auth/authSlice";
import { NAV_ITEMS } from "../constants/navigation";
import Icon from "./Icon";

// CFG-07: shared Icon registry (medical icon set, client feedback #4).
const ITEM_ICONS = {
  dashboard: "dashboard",
  queue: "list-checks",
};

/**
 * CFG-04 role-driven sidebar. Below `lg` it renders as a horizontal
 * strip; CFG-07 gives that strip `overflow-x-auto` so a long menu
 * scrolls inside the nav instead of forcing a page-level horizontal
 * scrollbar at 360 px (AC1/NFRU-004). Icons are decorative (AC2) —
 * the link text is the accessible name.
 */
const Sidebar = () => {
  const role = useSelector(selectRole);
  const items = NAV_ITEMS[role] ?? [];

  return (
    <nav
      aria-label="Main navigation"
      className="w-full shrink-0 border-b border-neutral-200 bg-neutral-50 lg:w-60 lg:border-b-0 lg:border-r"
    >
      <ul className="flex flex-row gap-1 overflow-x-auto p-3 lg:flex-col lg:overflow-x-visible">
        {items.map((item) => {
          const iconName = ITEM_ICONS[item.id];

          return (
            <li key={item.id} className="shrink-0">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
                  ].join(" ")
                }
              >
                {iconName && <Icon name={iconName} className="h-5 w-5" />}
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
