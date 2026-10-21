import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { store } from "../../../src/app/store";
import { clearSession, setSession } from "../../../src/features/auth/authSlice";
import AppRoutes from "../../../src/routes/AppRoutes";

afterEach(() => {
  cleanup();
  store.dispatch(clearSession());
});

function open(role = "ADMIN", path = "/admin/register-patient") {
  if (role)
    store.dispatch(
      setSession({
        accessToken: "registration-token",
        role,
        user: "Test Admin",
      }),
    );
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  );
}
function fill(name = "Example Patient") {
  fireEvent.change(screen.getByLabelText(/Full Name/), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText(/Phone Number/), {
    target: { value: "example-phone" },
  });
  fireEvent.change(screen.getByLabelText(/Date of Birth/), {
    target: { value: "2090-01-15" },
  });
}
const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Save Patient" }));
const success = (duplicateSuspected = false) =>
  HttpResponse.json(
    {
      success: true,
      data: {
        patientId: 101,
        fullName: "Example Patient",
        duplicateSuspected,
        bloodGroup: "CLINICAL_SECRET",
      },
    },
    { status: 201 },
  );

describe("ADM-02 registration through real routing and authenticated HTTP client", () => {
  it.each(["ADMIN"])("allows %s", (role) => {
    open(role, role === "ADMIN" ? "/admin/register-patient" : "");
    expect(
      screen.getByRole("heading", { name: "Register New Patient" }),
    ).toBeInTheDocument();
  });
  it.each([
    [null, /sign in to onecare/i],
    ["DOCTOR", /today.s appointments/i],
    ["PHARMACIST", /PharmacistDashboardPage/],
  ])("blocks %s", async (role, heading) => {
    open(role);
    expect(
      await screen.findByRole("heading", { name: heading }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Full Name/)).not.toBeInTheDocument();
  });
  it("validates required fields, focuses the first error and retains data", () => {
    open();
    fireEvent.change(screen.getByLabelText(/Full Name/), {
      target: { value: "  " },
    });
    save();
    expect(screen.getByText("Full name is required.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/)).toHaveFocus();
    expect(screen.getByLabelText(/Full Name/)).toHaveValue("  ");
  });
  it("sends exact fields and bearer auth; permits future DOB and raw shared phone; hides clinical data", async () => {
    const requests = [];
    server.use(
      http.post("*/patients", async ({ request }) => {
        requests.push({
          body: await request.json(),
          auth: request.headers.get("authorization"),
        });
        return success();
      }),
    );
    open();
    fill(" Example  Patient ");
    save();
    expect(await screen.findByText("101")).toBeInTheDocument();
    expect(requests[0]).toEqual({
      auth: "Bearer registration-token",
      body: {
        full_name: " Example  Patient ",
        dateOfBirth: "2090-01-15",
        contactNo: "example-phone",
        address: null,
        email: null,
        gender: null,
      },
    });
    expect(screen.queryByText("CLINICAL_SECRET")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save Patient" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Register another patient" }),
    );
    fill("Different Name");
    save();
    await screen.findByText("101");
    expect(requests).toHaveLength(2);
  });
  it("treats suspected duplicates as saved and prevents repeat submission", async () => {
    let hits = 0;
    server.use(
      http.post("*/patients", () => {
        hits++;
        return success(true);
      }),
    );
    open();
    fill();
    save();
    expect(
      await screen.findByText(/probable duplicate was detected/),
    ).toHaveTextContent(/already been saved/);
    expect(hits).toBe(1);
    expect(
      screen.queryByRole("button", { name: "Save Patient" }),
    ).not.toBeInTheDocument();
  });
  it("keeps values on backend field validation and allows correction", async () => {
    server.use(
      http.post("*/patients", () =>
        HttpResponse.json(
          {
            success: false,
            message: "Request validation failed",
            data: [
              { field: "contactNo", message: "Phone is required by server" },
            ],
          },
          { status: 400 },
        ),
      ),
    );
    open();
    fill();
    save();
    expect(
      await screen.findByText("Phone is required by server"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/)).toHaveValue("Example Patient");
    expect(screen.getByLabelText(/Phone Number/)).toHaveValue("example-phone");
    server.use(http.post("*/patients", () => success()));
    fireEvent.change(screen.getByLabelText(/Phone Number/), {
      target: { value: "shared-phone" },
    });
    save();
    expect(await screen.findByText("101")).toBeInTheDocument();
  });
  it.each([403, 500, "network"])(
    "handles %s without losing values or exposing raw errors",
    async (status) => {
      server.use(
        http.post("*/patients", () =>
          status === "network"
            ? HttpResponse.error()
            : HttpResponse.json({ message: "CLINICAL_SECRET" }, { status }),
        ),
      );
      open();
      fill();
      save();
      expect(await screen.findByRole("alert")).toHaveTextContent(
        status === 403 ? /permission/ : /could not be confirmed/,
      );
      expect(screen.getByLabelText(/Full Name/)).toHaveValue("Example Patient");
      expect(screen.queryByText("CLINICAL_SECRET")).not.toBeInTheDocument();
    },
  );
  it("disables save/reset and fields while submitting, with one request", async () => {
    let release;
    let hits = 0;
    server.use(
      http.post("*/patients", async () => {
        hits++;
        await new Promise((resolve) => {
          release = resolve;
        });
        return success();
      }),
    );
    open();
    fill();
    const saveButton = screen.getByRole("button", { name: "Save Patient" });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);
    expect(
      await screen.findByRole("button", { name: /Saving patient/ }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
    expect(screen.getByLabelText(/Full Name/)).toBeDisabled();
    // Wait for the intercepted request before releasing it.
    const { waitFor } = await import("@testing-library/react");
    await waitFor(() => expect(release).toBeTypeOf("function"));
    release();
    await screen.findByText("101");
    expect(hits).toBe(1);
  });
  it("resets values and validation", () => {
    open();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText(/Full Name/)).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
