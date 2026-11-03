import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useState, useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import apiClient, {
  __resetAuthState,
  setNavigator,
  startTokenRefreshScheduler,
} from "../../src/services/apiClient";
import LoginPage from "../../src/pages/public/LoginPage";
import { clearTokens, getAccessToken, setTokens } from "../helpers/session";
import { mswState, resetMswState } from "../msw/handlers";

function ProtectedProbe({ path = "/patients/1" }) {
  const [state, setState] = useState({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(path)
      .then((response) => {
        if (!cancelled) setState({ phase: "ok", data: response.data.data });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            phase: "error",
            message: error.userMessage,
            status: error.status,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (state.phase === "loading") return <p>Loading…</p>;
  if (state.phase === "error") return <p role="alert">{state.message}</p>;
  return <p data-testid="result">{state.data?.name ?? "loaded"}</p>;
}

function Harness({ path }) {
  const navigate = useNavigate();

  useEffect(() => {
    setNavigator(navigate);
    return () => setNavigator(undefined);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/protected" element={<ProtectedProbe path={path} />} />
      <Route path="*" element={<ProtectedProbe path={path} />} />
    </Routes>
  );
}

const renderApp = (path = "/patients/1") =>
  render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Harness path={path} />
    </MemoryRouter>,
  );

const seedSession = () =>
  setTokens({
    accessToken: "access-1",
    refreshToken: "refresh-1",
    expiresIn: 1800,
  });

beforeEach(() => {
  __resetAuthState();
  clearTokens();
  resetMswState();
});

afterEach(() => {
  __resetAuthState();
  clearTokens();
  vi.restoreAllMocks();
});

describe("AC1 — MSW integration", () => {
  it("attaches the Bearer token once and renders the payload", async () => {
    seedSession();

    renderApp("/patients/1");

    expect(await screen.findByTestId("result")).toHaveTextContent("Jane Doe");
    expect(mswState.refreshCount).toBe(0);
    expect(mswState.protectedHits).toHaveLength(1);
    expect(mswState.protectedHits[0].authorization).toBe("Bearer access-1");
  });
});

describe("AC2 — MSW negative test (concurrent 401s)", () => {
  it("refreshes exactly once and retries every call", async () => {
    seedSession();
    mswState.tokenValid = false;

    const results = await Promise.all([
      apiClient.get("/patients/1"),
      apiClient.get("/patients/2"),
      apiClient.get("/patients/3"),
    ]);

    expect(results.map((response) => response.status)).toEqual([200, 200, 200]);
    expect(mswState.refreshCount).toBe(1);
    expect(mswState.refreshTokens).toEqual(["refresh-1"]);
    expect(mswState.protectedHits).toHaveLength(6);
    const retried = mswState.protectedHits.filter(
      (hit) => hit.authorization === "Bearer new-access",
    );
    expect(retried).toHaveLength(3);
    expect(getAccessToken()).toBe("new-access");
  });
});

describe("AC3 — MSW integration (failed refresh)", () => {
  it("redirects to /login with the session expired message", async () => {
    seedSession();
    mswState.tokenValid = false;
    mswState.refreshValid = false;

    renderApp("/patients/1");

    expect(
      await screen.findByText(
        "Your session has expired. Please sign in again.",
      ),
    ).toBeInTheDocument();
    expect(mswState.refreshCount).toBe(1);
    expect(getAccessToken()).toBeNull();
    expect(screen.queryByTestId("result")).not.toBeInTheDocument();
  });
});

describe("AC4 — MSW integration (proactive refresh)", () => {
  it("refreshes once before expiry while active, never while idle", async () => {
    seedSession();
    renderApp("/patients/1");
    await screen.findByTestId("result");

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let active = true;
    const base = Date.now();
    let clock = base;
    const stop = startTokenRefreshScheduler({
      isUserActive: () => active,
      checkIntervalMs: 5,
      now: () => clock,
    });

    clock = base + 10 * 60 * 1000;
    await sleep(50);
    expect(mswState.refreshCount).toBe(0);

    clock = base + 26 * 60 * 1000;
    await waitFor(() => expect(mswState.refreshCount).toBe(1));
    expect(getAccessToken()).toBe("new-access");

    active = false;
    clock = base + 7000 * 1000;
    await sleep(50);
    expect(mswState.refreshCount).toBe(1);
    expect(getAccessToken()).toBe("new-access");

    stop();
  });
});

describe("AC5 — MSW integration (403 / 429 / 500)", () => {
  it.each([
    ["/forbidden", "You do not have permission to view this resource"],
    ["/rate-limited", "Too many requests. Please slow down."],
    ["/server-error", "Internal server error"],
  ])(
    "surfaces the message for %s without logging out",
    async (path, message) => {
      seedSession();

      renderApp(path);

      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(getAccessToken()).toBe("access-1");
      expect(mswState.refreshCount).toBe(0);
      expect(
        screen.queryByText(/session has expired/i),
      ).not.toBeInTheDocument();
    },
  );
});
