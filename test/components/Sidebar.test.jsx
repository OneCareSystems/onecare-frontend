import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { ROLES } from "../../src/constants/roles";
import { NAV_ITEMS } from "../../src/constants/navigation";
import Sidebar from "../../src/components/Sidebar";

const renderSidebar = () =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/doctor/dashboard"]}>
        <Sidebar />
      </MemoryRouter>
    </Provider>,
  );

beforeEach(() => {
  store.dispatch(clearSession());
});

describe("Sidebar — CFG-04 role-driven navigation", () => {
  it("renders the signed-in role's menu entries as links", () => {
    store.dispatch(setSession({ accessToken: "a", role: ROLES.DOCTOR }));

    renderSidebar();

    const items = NAV_ITEMS[ROLES.DOCTOR];
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      items.find((item) => item.id === "dashboard").to,
    );
    expect(screen.getByRole("link", { name: /queue/i })).toHaveAttribute(
      "href",
      items.find((item) => item.id === "queue").to,
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
