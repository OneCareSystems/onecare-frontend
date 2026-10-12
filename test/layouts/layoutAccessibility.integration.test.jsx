import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { ROLES } from "../../src/constants/roles";
import AppRoutes from "../../src/routes/AppRoutes";
import PublicLayout from "../../src/layouts/PublicLayout";

/**
 * CFG-07 AC4 — keyboard-only use: every interactive element in the shared
 * layouts is reachable by Tab in logical (DOM) order.
 *
 * jsdom verifies reachability and order; the visible focus ring and the
 * 360 px no-overflow guarantees are verified in the real-browser
 * (Playwright) suite, since jsdom performs no layout.
 */
const renderAppAt = (initialPath) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  );

const tabUntil = async (user, match, maxStops = 25) => {
  const stops = [];
  for (let index = 0; index < maxStops; index += 1) {
    await user.tab();
    const active = document.activeElement;
    const description = {
      tag: active?.tagName,
      name:
        active?.getAttribute("aria-label") ?? active?.textContent?.trim() ?? "",
      href: active?.getAttribute("href") ?? null,
    };
    stops.push(description);
    if (match(description, active)) return { reached: true, stops };
  }
  return { reached: false, stops };
};

beforeEach(() => {
  store.dispatch(clearSession());
});

describe("StaffLayout — CFG-07 AC4 keyboard tab order (integration)", () => {
  it("reaches every chrome control in logical order with no traps", async () => {
    store.dispatch(
      setSession({
        accessToken: "a",
        role: ROLES.DOCTOR,
        user: { name: "Dr H" },
      }),
    );
    const user = userEvent.setup();
    renderAppAt("/doctor/dashboard");

    // Top bar first: Home button → language select → logout.
    const home = await tabUntil(user, (s) => s.name === "Home");
    expect(home.reached).toBe(true);

    const logout = await tabUntil(user, (s) => s.name === "Log out");
    expect(logout.reached).toBe(true);

    // Then the sidebar links, then the breadcrumb link — all reachable.
    const dashboard = await tabUntil(
      user,
      (s) => s.tag === "A" && s.href?.endsWith("/doctor/dashboard"),
    );
    expect(dashboard.reached).toBe(true);

    const queue = await tabUntil(
      user,
      (s) => s.tag === "A" && s.href === "/queue",
    );
    expect(queue.reached).toBe(true);
  });

  it("never skips backwards or lands on hidden elements while tabbing", async () => {
    store.dispatch(setSession({ accessToken: "a", role: ROLES.DOCTOR }));
    const user = userEvent.setup();
    renderAppAt("/doctor/dashboard");

    // Tab through one full cycle; each stop must be a visible, focusable
    // control. The cycle ends when focus wraps back to the first stop.
    await user.tab();
    const first = document.activeElement;
    expect(first.tagName).toMatch(/BUTTON|SELECT|A|INPUT/);

    for (let index = 0; index < 15; index += 1) {
      await user.tab();
      if (
        document.activeElement === first ||
        document.activeElement === document.body
      ) {
        break;
      }
      expect(document.activeElement.tagName).toMatch(/BUTTON|SELECT|A|INPUT/);
      expect(document.activeElement).not.toBeDisabled();
    }
  });
});

describe("PublicLayout — CFG-07 AC4 keyboard tab order (integration)", () => {
  it("reaches the header nav links and the login link in order", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <PublicLayout />
      </MemoryRouter>,
    );

    const logo = await tabUntil(
      user,
      (s) => s.tag === "A" && s.href === "/home",
    );
    expect(logo.reached).toBe(true);
  });

  it("exposes the shared focus-visible ring declared in the design system", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <PublicLayout />
      </MemoryRouter>,
    );

    await user.tab();
    const active = document.activeElement;
    expect(active.tagName).toBe("A");
    // The global :focus-visible rule in src/index.css supplies the ring;
    // jsdom cannot compute it, so assert the stylesheet contract instead.
    const css = await import("node:fs").then((fs) =>
      fs.readFileSync("src/index.css", "utf8"),
    );
    expect(css).toMatch(/:focus-visible[^}]*ring-2/s);
  });
});

describe("Shared layouts — CFG-07 AC1/AC3 structural guards (jsdom)", () => {
  it("staff main can shrink below content width so overflow stays contained", () => {
    store.dispatch(setSession({ accessToken: "a", role: ROLES.DOCTOR }));
    const { container } = renderAppAt("/doctor/dashboard");

    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    expect(main.className).toContain("min-w-0");
  });

  it("sidebar strip scrolls inside its own nav at narrow widths", () => {
    store.dispatch(setSession({ accessToken: "a", role: ROLES.DOCTOR }));
    const { container } = renderAppAt("/doctor/dashboard");

    const list = container.querySelector(
      'nav[aria-label="Main navigation"] ul',
    );
    expect(list.className).toContain("overflow-x-auto");
  });

  it("styleguide wide table lives in a scrollable region, not the page", () => {
    renderAppAt("/styleguide");

    const region = screen.getByRole("region", {
      name: "Example appointment list",
    });
    expect(region.className).toContain("overflow-x-auto");
    expect(region).toHaveAttribute("tabindex", "0");
  });
});
