import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { ROLES } from "../../src/constants/roles";
import { NAV_ITEMS } from "../../src/constants/navigation";
import Sidebar from "../../src/components/Sidebar";

const renderSidebar = (path = "/doctor/dashboard") =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Sidebar />
      </MemoryRouter>
    </Provider>,
  );

beforeEach(() => {
  store.dispatch(clearSession());
});

describe("Sidebar — CFG-04 role-driven navigation", () => {
  it.each(Object.values(ROLES))(
    "shares active gradient and typography for %s",
    (role) => {
      store.dispatch(setSession({ accessToken: "a", role }));
      const dashboard = NAV_ITEMS[role].find((item) => item.id === "dashboard");
      renderSidebar(dashboard.to);
      const active = screen.getByRole("link", { name: "Dashboard" });
      expect(active).toHaveClass(
        "bg-gradient-to-r",
        "from-primary-800",
        "to-primary-600",
        "text-white",
        "shadow-sm",
      );
      for (const link of screen.getAllByRole("link")) {
        expect(link).toHaveClass("text-sm", "gap-2");
        if (link !== active) expect(link).not.toHaveClass("bg-gradient-to-r");
      }
    },
  );
  it("renders the signed-in role's menu entries as links", () => {
    store.dispatch(setSession({ accessToken: "a", role: ROLES.DOCTOR }));

    renderSidebar();

    // Data-driven over whatever entries the role currently has enabled.
    const items = NAV_ITEMS[ROLES.DOCTOR];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(screen.getByRole("link", { name: item.label })).toHaveAttribute(
        "href",
        item.to,
      );
    }
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      items.find((item) => item.id === "dashboard").to,
    );
  });

  it("hides screens the role may not use", () => {
    store.dispatch(setSession({ accessToken: "a", role: ROLES.PHARMACIST }));

    renderSidebar();

    expect(
      screen.queryByRole("link", { name: /queue/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(
      NAV_ITEMS[ROLES.PHARMACIST].length,
    );
  });

  it("renders nothing for an unknown role", () => {
    store.dispatch(setSession({ accessToken: "a", role: "PATIENT" }));

    renderSidebar();

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
