import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import usePatientOptions from "../../src/hooks/usePatientOptions";
import * as patientService from "../../src/services/patientService";
const base = { open: true, query: "", mode: "name", page: 0, debounceMs: 30 };
const patient = (name) => ({
  patientId: 101,
  fullName: name,
  contactNo: "shared-phone",
  clinicalNotes: "CLINICAL_SECRET",
});
const ok = (rows) => HttpResponse.json({ success: true, data: rows });
beforeEach(() =>
  store.dispatch(setSession({ accessToken: "fixture-token", role: "ADMIN" })),
);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  store.dispatch(clearSession());
});

describe("paged, cancellable patient dropdown search", () => {
  it("lists only a first page when opened and reuses normalized phone/id search without fetching the entire database", async () => {
    const requests = [];
    server.use(
      http.get("*/patients", ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return ok([patient("Example")]);
      }),
    );
    const { result, rerender } = renderHook(
      (props) => usePatientOptions(props),
      { initialProps: { ...base, open: false } },
    );
    expect(result.current.loading).toBe(false);
    expect(requests).toHaveLength(0);
    rerender(base);
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(requests[0].has("search")).toBe(false);
    expect(requests[0].get("size")).toBe("10");
    expect(result.current.rows[0]).not.toHaveProperty("clinicalNotes");
    rerender({ ...base, query: "0771234567", mode: "phone" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(requests.at(-1).get("search")).toBe("+94 771 234 567");
    rerender({ ...base, query: "101", mode: "id", page: 1 });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(requests.at(-1).get("search")).toBe("101");
    expect(requests.at(-1).get("page")).toBe("1");
  });
  it("debounces typing, aborts earlier requests and never exposes stale results", async () => {
    let release;
    const calls = vi.spyOn(patientService, "searchPatients");
    const requests = [];
    server.use(
      http.get("*/patients", async ({ request }) => {
        const query = new URL(request.url).searchParams.get("search");
        requests.push(query);
        if (query === "Slow") {
          await new Promise((resolve) => {
            release = resolve;
          });
        }
        return ok([patient(query || "Initial")]);
      }),
    );
    const { result, rerender } = renderHook(
      (props) => usePatientOptions(props),
      { initialProps: base },
    );
    await waitFor(() =>
      expect(result.current.rows[0]?.fullName).toBe("Initial"),
    );
    rerender({ ...base, query: "S" });
    rerender({ ...base, query: "Slow" });
    expect(result.current.rows).toEqual([]);
    await waitFor(() => expect(requests).toContain("Slow"));
    rerender({ ...base, query: "Fast" });
    await waitFor(() => expect(result.current.rows[0]?.fullName).toBe("Fast"));
    expect(
      calls.mock.calls.find(([params]) => params.search === "Slow")[0].signal
        .aborted,
    ).toBe(true);
    await act(async () => {
      release();
    });
    expect(result.current.rows[0].fullName).toBe("Fast");
    expect(requests).not.toContain("S");
  });
  it("blocks invalid search, shows safe API errors and supports retry", async () => {
    let requests = 0;
    server.use(
      http.get("*/patients", () => {
        requests++;
        return new HttpResponse(null, { status: 403 });
      }),
    );
    const { result, rerender } = renderHook(
      (props) => usePatientOptions(props),
      { initialProps: { ...base, mode: "id", query: "0" } },
    );
    expect(result.current.error).toMatch(/positive numeric/);
    expect(requests).toBe(0);
    rerender(base);
    await waitFor(() => expect(result.current.error).toMatch(/permission/));
    server.use(http.get("*/patients", () => ok([])));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("");
    expect(result.current.rows).toEqual([]);
  });

  it("searches names, phones and long numeric clinic IDs through one field without an ID/phone ambiguity", async () => {
    const searches = [];
    server.use(
      http.get("*/patients", ({ request }) => {
        searches.push(new URL(request.url).searchParams.get("search"));
        return ok([patient("Sample")]);
      }),
    );
    const { result, rerender } = renderHook(
      (props) => usePatientOptions(props),
      { initialProps: { open: true, query: "S", page: 0, debounceMs: 10 } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(searches.at(-1)).toBe("S");
    rerender({ open: true, query: "0771234567", page: 0, debounceMs: 10 });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(searches.at(-1)).toBe("+94 771 234 567");
    rerender({ open: true, query: "771234567", page: 0, debounceMs: 10 });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(searches.at(-1)).toBe("771234567");
  });
});
