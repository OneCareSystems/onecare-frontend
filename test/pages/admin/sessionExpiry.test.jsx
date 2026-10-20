import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { store } from "../../../src/app/store";
import {
  clearSession,
  selectIsAuthenticated,
} from "../../../src/features/auth/authSlice";
import {
  __resetAuthState,
  setNavigator,
} from "../../../src/services/apiClient";
import AppRoutes from "../../../src/routes/AppRoutes";

// Synthetic fixtures only. Assertions expose booleans/counts, never auth headers.
const access = "fixture-access";
const refreshedAccess = "fixture-refreshed-access";
const refresh = "fixture-refresh";
const envelope = (data) => ({ success: true, data });
const failure = (status) =>
  status === "network"
    ? HttpResponse.error()
    : HttpResponse.json(
        { success: false, message: "Request rejected", data: null },
        { status },
      );
const created = () =>
  HttpResponse.json(
    envelope({ patientId: 101, fullName: "Synthetic Patient" }),
    { status: 201 },
  );

function Routes() {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigator(navigate);
    return () => setNavigator();
  }, [navigate]);
  return <AppRoutes />;
}

beforeEach(() => {
  __resetAuthState();
  store.dispatch(clearSession());
});
afterEach(() => {
  cleanup();
  __resetAuthState();
  store.dispatch(clearSession());
});

async function signIn(role = "ADMIN") {
  server.use(
    http.post("*/api/auth/login", () =>
      HttpResponse.json(
        envelope({
          accessToken: access,
          refreshToken: refresh,
          role,
          expiresIn: 1800000,
          redirectUrl:
            role === "ADMIN" ? "/admin/dashboard" : "/super-admin/dashboard",
        }),
      ),
    ),
  );
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/admin/register-patient"]}>
        <Routes />
      </MemoryRouter>
    </Provider>,
  );
  fireEvent.change(screen.getByLabelText(/^username/i), {
    target: { value: "fixture-user" },
  });
  fireEvent.change(screen.getByLabelText(/^password/i), {
    target: { value: "fixture-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Sign in securely/i }));
  await screen.findByRole("heading", { name: "Register New Patient" });
  fireEvent.change(screen.getByLabelText(/Full Name/), {
    target: { value: "Synthetic Patient" },
  });
  fireEvent.change(screen.getByLabelText(/Phone Number/), {
    target: { value: "fixture-phone" },
  });
  fireEvent.change(screen.getByLabelText(/Date of Birth/), {
    target: { value: "1990-01-15" },
  });
}
const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Save Patient" }));
const assertRetained = () => {
  expect(selectIsAuthenticated(store.getState())).toBe(true);
  expect(screen.getByLabelText(/Full Name/).value === "Synthetic Patient").toBe(
    true,
  );
  expect(screen.getByLabelText(/Phone Number/).value === "fixture-phone").toBe(
    true,
  );
  expect(screen.getByLabelText(/Date of Birth/).value === "1990-01-15").toBe(
    true,
  );
  expect(screen.queryByText(/session has expired/i)).not.toBeInTheDocument();
};

describe("ADM-02 session and registration errors", () => {
  it.each(["ADMIN", "SUPER_ADMIN"])(
    "%s logs in and posts with the bearer token",
    async (role) => {
      let authorized = false;
      server.use(
        http.post("*/api/patients", ({ request }) => {
          authorized =
            request.headers.get("authorization") === `Bearer ${access}`;
          return created();
        }),
      );
      await signIn(role);
      save();
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Patient registered successfully",
      );
      expect(authorized).toBe(true);
      expect(store.getState().auth.role).toBe(role);
    },
  );

  it("refreshes an expired access token once and retries with the new bearer", async () => {
    let posts = 0,
      refreshes = 0,
      authorized = false,
      publicRefresh = false;
    server.use(
      http.post("*/api/patients", ({ request }) => {
        posts++;
        if (posts === 1) return failure(401);
        authorized =
          request.headers.get("authorization") === `Bearer ${refreshedAccess}`;
        return created();
      }),
      http.post("*/api/auth/refresh", async ({ request }) => {
        refreshes++;
        publicRefresh =
          !request.headers.has("authorization") &&
          (await request.json()).refreshToken === refresh;
        return HttpResponse.json(
          envelope({ accessToken: refreshedAccess, expiresIn: 1800000 }),
        );
      }),
    );
    await signIn();
    save();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Patient registered successfully",
    );
    expect([posts, refreshes, authorized, publicRefresh]).toEqual([
      2,
      1,
      true,
      true,
    ]);
    expect(store.getState().auth.role).toBe("ADMIN");
  });

  it.each([400, 403, 404, 409, 500, "network"])(
    "retains form/session on direct %s",
    async (status) => {
      server.use(http.post("*/api/patients", () => failure(status)));
      await signIn();
      save();
      await screen.findByRole("alert");
      assertRetained();
    },
  );

  it.each([400, 403, 404, 409, 500, "network"])(
    "retains form/session when retry after refresh returns %s",
    async (status) => {
      let posts = 0;
      server.use(
        http.post("*/api/patients", () =>
          ++posts === 1 ? failure(401) : failure(status),
        ),
        http.post("*/api/auth/refresh", () =>
          HttpResponse.json(
            envelope({ accessToken: refreshedAccess, expiresIn: 1800000 }),
          ),
        ),
      );
      await signIn();
      save();
      await screen.findByRole("alert");
      assertRetained();
      expect(posts).toBe(2);
    },
  );

  it.each([400, 403, 404, 429, 500, "network"])(
    "retains form/session when refresh fails with %s",
    async (status) => {
      let posts = 0;
      server.use(
        http.post("*/api/patients", () => {
          posts++;
          return failure(401);
        }),
        http.post("*/api/auth/refresh", () => failure(status)),
      );
      await signIn();
      save();
      await screen.findByRole("alert");
      assertRetained();
      expect(posts).toBe(1);
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to refresh your session. Please try again shortly.",
      );
    },
  );

  it.each(["invalid-refresh", "retry-unauthorized"])(
    "ends the session for %s without a retry loop",
    async (mode) => {
      let posts = 0,
        refreshes = 0;
      server.use(
        http.post("*/api/patients", () => {
          posts++;
          return failure(401);
        }),
        http.post("*/api/auth/refresh", () => {
          refreshes++;
          return mode === "invalid-refresh"
            ? failure(401)
            : HttpResponse.json(envelope({ accessToken: refreshedAccess }));
        }),
      );
      await signIn();
      save();
      await screen.findByRole("heading", { name: /Sign in to OneCare/i });
      expect(selectIsAuthenticated(store.getState())).toBe(false);
      expect([posts, refreshes]).toEqual([
        mode === "invalid-refresh" ? 1 : 2,
        1,
      ]);
    },
  );
});
