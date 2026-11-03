import { cleanup, render, screen, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { HttpResponse } from "msw";

import { store } from "../../../src/app/store";
import { clearSession, setSession } from "../../../src/features/auth/authSlice";
import AppRoutes from "../../../src/routes/AppRoutes";

/**
 * REST case harness for the super-admin governance screens.
 *
 * Every case opens the real route table (RequireAuth + the real layout) so
 * the page runs behind the same role guard and talks to the same
 * authenticated Axios client the app ships with; the MSW backend answers.
 */
export const SA_TOKEN = "super-admin-rest-token";

/** Open `path` with a session already in the store (role: null = signed out). */
export const openPage = (
  path,
  { role = "SUPER_ADMIN", token = SA_TOKEN } = {},
) => {
  if (role) {
    store.dispatch(setSession({ accessToken: token, role, user: "REST Case" }));
  }
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  );
};

/** Unmount the tree and drop the session — call from afterEach. */
export const closePage = () => {
  cleanup();
  store.dispatch(clearSession());
};

/** Scope queries to the table row that renders `text`. */
export const rowFor = (text) => {
  const nodes = screen.getAllByText(text);
  const tr = nodes.map((node) => node.closest("tr")).find(Boolean);
  if (!tr) throw new Error(`no table row renders "${text}"`);
  return within(tr);
};

/** Envelope helper matching the API standards every service parses. */
export const ok = (data, message = "ok") =>
  HttpResponse.json({ success: true, message, data });

export const failWith = (status, message) =>
  HttpResponse.json({ success: false, message, data: null }, { status });
