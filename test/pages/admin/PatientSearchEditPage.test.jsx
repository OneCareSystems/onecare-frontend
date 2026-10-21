import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { store } from "../../../src/app/store";
import { clearSession, setSession } from "../../../src/features/auth/authSlice";
import {
  __resetAuthState,
  setNavigator,
} from "../../../src/services/apiClient";
import AppRoutes from "../../../src/routes/AppRoutes";
import PatientSearch from "../../../src/components/PatientSearch";
import PatientDemographicsEditor from "../../../src/components/PatientDemographicsEditor";

let patients, searches, loads, updates, failSearch, failLoad, failUpdate;
const envelope = (data) => HttpResponse.json({ success: true, data });
const failure = (status) =>
  status === "network"
    ? HttpResponse.error()
    : HttpResponse.json(
        {
          success: false,
          message: "CLINICAL_SECRET",
          data:
            status === 400
              ? [
                  { field: "email", message: "CLINICAL_SECRET" },
                  { field: "bloodGroup", message: "CLINICAL_SECRET" },
                ]
              : null,
        },
        { status },
      );
beforeEach(() => {
  patients = [101, 102].map((patientId) => ({
    patientId,
    fullName: `Example ${patientId}`,
    contactNo: "+94 771 234 567",
    dateOfBirth: "1990-01-15",
    address: "Example street",
    email: "patient@example.invalid",
    gender: "OTHER",
    isActive: true,
    bloodGroup: "A+",
    clinicalNotes: "CLINICAL_SECRET",
  }));
  searches = [];
  loads = [];
  updates = [];
  failSearch = null;
  failLoad = null;
  failUpdate = null;
  __resetAuthState();
  setNavigator(vi.fn());
  store.dispatch(
    setSession({
      accessToken: "fixture-token",
      refreshToken: "fixture-refresh",
      role: "ADMIN",
      user: "Example Admin",
    }),
  );
  server.use(
    http.get("*/patients", ({ request }) => {
      searches.push(new URL(request.url));
      return failSearch ? failure(failSearch) : envelope(patients);
    }),
    http.get("*/patients/:id", ({ params }) => {
      loads.push(params.id);
      return failLoad
        ? failure(failLoad)
        : envelope(
            patients.find((patient) => String(patient.patientId) === params.id),
          );
    }),
    http.put("*/patients/:id", async ({ params, request }) => {
      const body = await request.json();
      updates.push({ id: params.id, body });
      if (failUpdate) return failure(failUpdate);
      const patient = patients.find(
        (row) => String(row.patientId) === params.id,
      );
      for (const [key, value] of Object.entries(body))
        patient[key === "full_name" ? "fullName" : key] = value;
      return envelope(patient);
    }),
    http.post("*/auth/refresh", () => failure(401)),
  );
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  __resetAuthState();
  store.dispatch(clearSession());
});
const open = (role = "ADMIN") => {
  store.dispatch(
    setSession({ accessToken: "fixture-token", role, user: "Example Admin" }),
  );
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/admin/patient-search"]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  );
};
const search = async (text = "Example") => {
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: text } });
  await screen.findByRole("button", { name: "Edit patient 101" });
};
const select = async () => {
  await search();
  fireEvent.click(screen.getByRole("button", { name: "Edit patient 102" }));
  await screen.findByLabelText("Clinic ID (read-only)");
};
const changeName = (value = "Updated Example") =>
  fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value } });
const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Update Patient" }));

describe("ADM-03 search, selection and privacy", () => {
  it("offers exactly three modes with Name as default and filled Edit buttons", async () => {
    render(<PatientSearch onSelect={vi.fn()} debounceMs={0} />);
    expect(screen.getByLabelText("Search by")).toHaveValue("name");
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Name", "Phone number", "Clinic ID"]);
    await search();
    expect(
      screen.getByRole("button", { name: "Edit patient 101" }),
    ).toHaveClass("bg-primary-800", "text-white", "hover:bg-primary-900");
  });
  it.each([
    ["phone", "Sarah"],
    ["phone", "077abc1234"],
    ["id", "Sarah"],
    ["id", "0"],
    ["name", "1234"],
  ])(
    "never requests invalid %s input %s, even after submit",
    async (mode, text) => {
      vi.useFakeTimers();
      render(<PatientSearch onSelect={vi.fn()} />);
      fireEvent.change(screen.getByLabelText("Search by"), {
        target: { value: mode },
      });
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: text },
      });
      fireEvent.submit(screen.getByRole("search"));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(searches).toHaveLength(0);
      expect(screen.getByRole("searchbox")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(
        document.getElementById(
          screen.getByRole("searchbox").getAttribute("aria-describedby"),
        ),
      ).toHaveTextContent(screen.getByRole("alert").textContent);
      expect(
        screen.queryByText("No patient found matching the search criteria."),
      ).not.toBeInTheDocument();
    },
  );
  it("clears the old value, results and page when search mode changes", async () => {
    render(<PatientSearch pageSize={2} onSelect={vi.fn()} debounceMs={0} />);
    await search();
    fireEvent.click(screen.getByRole("button", { name: "Check next page" }));
    await screen.findByText("Page 2");
    fireEvent.change(screen.getByLabelText("Search by"), {
      target: { value: "phone" },
    });
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByText("Find a patient")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit patient 101" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Search result pages" }),
    ).not.toBeInTheDocument();
    fireEvent.submit(screen.getByRole("search"));
    await search("0771234567");
    expect(searches.at(-1).searchParams.get("search")).toBe("+94 771 234 567");
    expect(searches.at(-1).searchParams.get("page")).toBe("0");
  });
  it("ignores an in-flight search response after switching type", async () => {
    let release;
    server.use(
      http.get("*/patients", async ({ request }) => {
        searches.push(new URL(request.url));
        await new Promise((resolve) => {
          release = resolve;
        });
        return envelope(patients);
      }),
    );
    render(<PatientSearch onSelect={vi.fn()} debounceMs={0} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Example" },
    });
    await waitFor(() => expect(release).toBeTypeOf("function"));
    fireEvent.change(screen.getByLabelText("Search by"), {
      target: { value: "id" },
    });
    await act(async () => release());
    expect(screen.getByText("Find a patient")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit patient 101" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
  it.each(["ADMIN"])(
    "allows %s and uses a minimal result table with explicit selection",
    async (role) => {
      open(role);
      expect(screen.getByText("Find a patient")).toBeInTheDocument();
      expect(searches).toHaveLength(0);
      await select();
      expect(loads).toEqual(["102"]);
      expect(
        screen.getAllByRole("button", { name: /Edit patient/ }),
      ).toHaveLength(2);
      expect(screen.getByLabelText("Clinic ID (read-only)")).toHaveValue("102");
      expect(screen.getByLabelText("Clinic ID (read-only)")).toHaveAttribute(
        "readonly",
      );
      expect(
        screen.getByLabelText("Date of Birth (read-only)"),
      ).toHaveAttribute("readonly");
      expect(screen.queryByLabelText(/Blood/)).not.toBeInTheDocument();
      expect(screen.queryByText("CLINICAL_SECRET")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("columnheader", { name: "Address" }),
      ).not.toBeInTheDocument();
    },
  );
  it.each([
    ["name", "Example", "Example"],
    ["phone", "0771234567", "+94 771 234 567"],
    ["id", "101", "101"],
  ])("searches by %s with documented query", async (mode, text, expected) => {
    open();
    fireEvent.change(screen.getByLabelText("Search by"), {
      target: { value: mode },
    });
    await search(text);
    expect(searches[0].searchParams.get("search")).toBe(expected);
    expect(searches[0].searchParams.get("page")).toBe("0");
  });
  it("debounces typing, clears results on empty input, and submits immediately", async () => {
    render(<PatientSearch onSelect={vi.fn()} debounceMs={350} />);
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Ex" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Example" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(349);
    });
    expect(searches).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    vi.useRealTimers();
    await screen.findByRole("button", { name: "Edit patient 101" });
    expect(searches).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByText("Find a patient")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Different" },
    });
    fireEvent.submit(screen.getByRole("search"));
    await screen.findByRole("button", { name: "Edit patient 101" });
    expect(searches).toHaveLength(2);
  });
  it("disambiguates clinic IDs that look like phones", async () => {
    open();
    fireEvent.change(screen.getByLabelText("Search by"), {
      target: { value: "id" },
    });
    await search("771234567");
    expect(searches[0].searchParams.get("search")).toBe("771234567");
  });
  it("pages through all shared-phone matches without invented totals", async () => {
    server.use(
      http.get("*/patients", ({ request }) => {
        const url = new URL(request.url);
        searches.push(url);
        return envelope(url.searchParams.get("page") === "0" ? patients : []);
      }),
    );
    render(<PatientSearch pageSize={2} onSelect={vi.fn()} debounceMs={0} />);
    fireEvent.change(screen.getByLabelText("Search by"), {
      target: { value: "phone" },
    });
    await search("0771234567");
    fireEvent.click(screen.getByRole("button", { name: "Check next page" }));
    await screen.findByText("No more matches on this page.");
    expect(searches[1].searchParams.get("page")).toBe("1");
    expect(
      screen.queryByText("No patient found matching the search criteria."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Check next page" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await screen.findByRole("button", { name: "Edit patient 101" });
  });
  it("shows exact no-match text with functional registration shortcut", async () => {
    patients = [];
    open();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "missing" },
    });
    await screen.findByText("No patient found matching the search criteria.");
    fireEvent.click(screen.getByRole("button", { name: "Register Patient" }));
    expect(
      await screen.findByRole("heading", { name: "Register New Patient" }),
    ).toBeInTheDocument();
  });
  it.each([400, 403, 500, "network"])(
    "handles search %s as an error, not no-match",
    async (status) => {
      failSearch = status;
      open();
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "Example" },
      });
      await screen.findByRole("alert");
      expect(
        screen.queryByText("No patient found matching the search criteria."),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("searchbox")).toHaveValue("Example");
      expect(screen.queryByText("CLINICAL_SECRET")).not.toBeInTheDocument();
    },
  );
  it("rejects unauthorized roles", async () => {
    open("PHARMACIST");
    expect(
      await screen.findByRole("heading", { name: "PharmacistDashboardPage" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});

describe("ADM-03 demographic editing", () => {
  it("ignores the cancelled load from React Strict Mode effect replay", async () => {
    render(
      <StrictMode>
        <PatientDemographicsEditor patientId={101} onCancel={vi.fn()} />
      </StrictMode>,
    );
    await screen.findByLabelText("Clinic ID (read-only)");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("updates permitted changed fields, preserves blood group and refreshes results", async () => {
    open();
    await select();
    changeName();
    fireEvent.change(screen.getByLabelText("Address"), {
      target: { value: "New address" },
    });
    save();
    await screen.findByText("Patient updated successfully.");
    expect(updates).toEqual([
      {
        id: "102",
        body: { full_name: "Updated Example", address: "New address" },
      },
    ]);
    expect(patients[1].bloodGroup).toBe("A+");
    expect(screen.getByLabelText(/Full Name/)).toHaveValue("Updated Example");
    await waitFor(() => expect(searches.length).toBeGreaterThan(1));
    expect(
      await screen.findByRole("cell", { name: "Updated Example" }),
    ).toBeInTheDocument();
    save();
    await screen.findByText("No changes to save.");
    expect(updates).toHaveLength(1);
  });
  it("blocks invalid edits with inline errors, then supports correction and cancel", async () => {
    open();
    await select();
    changeName(" ");
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "invalid" },
    });
    save();
    expect(screen.getByText("Full name is required.")).toBeInTheDocument();
    expect(
      screen.getByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(updates).toHaveLength(0);
    expect(screen.getByLabelText(/Full Name/)).toHaveFocus();
    changeName();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new@example.invalid" },
    });
    save();
    await screen.findByText("Patient updated successfully.");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByLabelText("Clinic ID (read-only)"),
    ).not.toBeInTheDocument();
  });
  it.each([400, 403, 404, 409, 500, "network"])(
    "preserves input on update %s with safe errors",
    async (status) => {
      failUpdate = status;
      open();
      await select();
      changeName();
      save();
      await screen.findAllByRole("alert");
      expect(screen.getByLabelText(/Full Name/)).toHaveValue("Updated Example");
      expect(screen.queryByText("CLINICAL_SECRET")).not.toBeInTheDocument();
      if (status === 400)
        expect(screen.getByText("Review this value.")).toBeInTheDocument();
    },
  );
  it("retains genuine expired-session behavior for rejected refresh", async () => {
    failUpdate = 401;
    open();
    await select();
    changeName();
    save();
    expect(
      await screen.findByRole("heading", { name: /sign in to onecare/i }),
    ).toBeInTheDocument();
  });
  it.each([403, 404, "network"])(
    "handles unavailable detail %s and closes the panel",
    async (status) => {
      failLoad = status;
      open();
      await search();
      fireEvent.click(screen.getByRole("button", { name: "Edit patient 101" }));
      await screen.findByRole("alert");
      expect(screen.queryByLabelText(/Full Name/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(
        screen.queryByRole("region", { name: "Edit patient" }),
      ).not.toBeInTheDocument();
    },
  );
  it("ignores stale detail loads after unmount", async () => {
    let release;
    server.use(
      http.get("*/patients/101", async () => {
        await new Promise((resolve) => {
          release = resolve;
        });
        return envelope(patients[0]);
      }),
    );
    const view = render(
      <PatientDemographicsEditor patientId={101} onCancel={vi.fn()} />,
    );
    expect(
      screen.getByRole("status", { name: "Loading patient details" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(release).toBeTypeOf("function"));
    view.unmount();
    await act(async () => release());
  });
  it("prevents duplicate updates and disables controls while saving", async () => {
    let release;
    server.use(
      http.put("*/patients/:id", async () => {
        updates.push({});
        await new Promise((resolve) => {
          release = resolve;
        });
        return envelope(patients[1]);
      }),
    );
    open();
    await select();
    changeName();
    const button = screen.getByRole("button", { name: "Update Patient" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Updating…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await waitFor(() => expect(release).toBeTypeOf("function"));
    await act(async () => release());
    await screen.findByText("Patient updated successfully.");
    expect(updates).toHaveLength(1);
  });
});
