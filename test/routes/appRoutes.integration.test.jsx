import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { Provider } from "react-redux";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { store } from "../../src/app/store";
import {
  clearSession,
  setSession,
} from "../../src/features/auth/authSlice";
import { ROLES } from "../../src/constants/roles";
import AppRoutes from "../../src/routes/AppRoutes";
import {
  mswState,
  resetMswState,
} from "../msw/handlers";

const LocationDisplay = () => {
  const location = useLocation();

  return (
    <div data-testid="location">
      {location.pathname}
    </div>
  );
};

const seed = (payload) => {
  store.dispatch(setSession(payload));
};

const renderAppAt = (initialPath) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="*" element={<AppRoutes />} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </Provider>,
  );

const expectLocation = (path) => {
  expect(screen.getByTestId("location")).toHaveTextContent(path);
};

beforeEach(() => {
  store.dispatch(clearSession());
  resetMswState();

  // Explicitly establish default mock state for every test.
  mswState.loginValid = true;
});

afterEach(() => {
  cleanup();
  resetMswState();
});

describe("AppRoutes — CFG-03 role-based routing (integration)", () => {
  it("AC1: a Doctor opening /doctor/dashboard sees the doctor dashboard", async () => {
    seed({
      accessToken: "a",
      role: ROLES.DOCTOR,
    });

    renderAppAt("/doctor/dashboard");

    expect(
      await screen.findByRole("heading", {
        name: /today.s appointments/i,
      }),
    ).toBeInTheDocument();

    expectLocation("/doctor/dashboard");
  });

  it("AC1: each role lands on its own dashboard", async () => {
    const cases = [
      {
        role: ROLES.ADMIN,
        path: "/admin/dashboard",
        heading: /AdminDashboardPage/i,
      },
      {
        role: ROLES.DOCTOR,
        path: "/doctor/dashboard",
        heading: /today.s appointments/i,
      },
      {
        role: ROLES.PHARMACIST,
        path: "/pharmacist/dashboard",
        heading: /PharmacistDashboardPage/i,
      },
      {
        role: ROLES.SUPER_ADMIN,
        path: "/super-admin/dashboard",
        heading: /SuperAdminDashboardPage/i,
      },
    ];

    for (const { role, path, heading } of cases) {
      store.dispatch(clearSession());
      seed({
        accessToken: "a",
        role,
      });

      const { unmount } = renderAppAt(path);

      try {
        expect(
          await screen.findByRole("heading", {
            name: heading,
          }),
        ).toBeInTheDocument();

        expectLocation(path);
      } finally {
        unmount();
      }
    }
  });

  it("AC2: a Pharmacist opening an admin route is redirected to their dashboard", async () => {
    seed({
      accessToken: "a",
      role: ROLES.PHARMACIST,
    });

    renderAppAt("/admin/dashboard");

    expect(
      await screen.findByRole("heading", {
        name: /PharmacistDashboardPage/i,
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expectLocation("/pharmacist/dashboard");
    });
  });

  it("AC3: an unauthenticated user opening a protected route is sent to /login", async () => {
    renderAppAt("/admin/dashboard");

    expect(
      await screen.findByRole("heading", {
        name: /sign in to onecare/i,
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expectLocation("/login");
    });
  });

  it("AC4: the shared Queue screen renders for every allowed role", async () => {
    const allowed = [
      ROLES.ADMIN,
      ROLES.DOCTOR,
      ROLES.SUPER_ADMIN,
    ];

    for (const role of allowed) {
      store.dispatch(clearSession());
      seed({
        accessToken: "a",
        role,
      });

      const { unmount } = renderAppAt("/queue");

      try {
        // Replace this with the actual visible queue heading
        // from your Queue page if its text differs.
        expect(
          await screen.findByRole("heading", {
            name: /queue/i,
          }),
        ).toBeInTheDocument();

        expectLocation("/queue");
      } finally {
        unmount();
      }
    }
  });

  it("AC4: a Pharmacist is redirected away from the shared Queue screen", async () => {
    seed({
      accessToken: "a",
      role: ROLES.PHARMACIST,
    });

    renderAppAt("/queue");

    expect(
      await screen.findByRole("heading", {
        name: /PharmacistDashboardPage/i,
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expectLocation("/pharmacist/dashboard");
    });
  });

  it("public routes stay reachable without a session", () => {
    renderAppAt("/home");

    expectLocation("/home");
  });

  it("the site root redirects to the public home page", async () => {
    renderAppAt("/");

    await waitFor(() => {
      expectLocation("/home");
    });
  });

  it("an unknown URL renders the public 404 page instead of a blank screen", async () => {
    renderAppAt("/no-such-page");

    expect(
      await screen.findByRole("heading", {
        name: /page not found/i,
      }),
    ).toBeInTheDocument();

    expectLocation("/no-such-page");
  });

  const signIn = async (username) => {
    await screen.findByRole("heading", {
      name: /sign in to onecare/i,
    });

    const usernameInput = screen.getByRole("textbox", {
      name: /username/i,
    });

    const passwordInput = screen.getByLabelText(/^password/i);

    fireEvent.change(usernameInput, {
      target: { value: username },
    });

    fireEvent.change(passwordInput, {
      target: { value: "secret" },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /sign in securely/i,
      }),
    );
  };

  it("AC1: a Doctor signs in and lands on /doctor/dashboard", async () => {
    mswState.loginRole = ROLES.DOCTOR;

    renderAppAt("/login");

    await signIn("doctor@onecare.test");

    expect(
      await screen.findByRole("heading", {
        name: /today.s appointments/i,
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expectLocation("/doctor/dashboard");
    });
  });

  it("AC1: after login the user returns to the originally requested protected route", async () => {
    mswState.loginRole = ROLES.ADMIN;

    renderAppAt("/queue");

    await screen.findByRole("heading", {
      name: /sign in to onecare/i,
    });

    await signIn("admin@onecare.test");

    expect(
      await screen.findByRole("heading", {
        name: /queue/i,
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expectLocation("/queue");
    });
  });

  it("rejected credentials keep the visitor on /login with an error", async () => {
    mswState.loginValid = false;

    renderAppAt("/login");

    await signIn("doctor@onecare.test");

    expect(
      await screen.findByText(
        "Invalid username or password.",
      ),
    ).toBeInTheDocument();

    expectLocation("/login");
  });
});
