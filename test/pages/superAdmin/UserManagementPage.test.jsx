import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";

import { server } from "../../msw/server";
import { mswState } from "../../msw/handlers";
import { closePage, failWith, ok, openPage, rowFor } from "./superAdminHarness";

const PATH = "/super-admin/user-management";

afterEach(closePage);

const account = (userId, username, role, overrides = {}) => ({
  userId,
  username,
  email: `${username.toLowerCase()}@onecare.test`,
  role,
  isActive: true,
  ...overrides,
});

/** Queue the directory response the GET /users mock will answer with. */
const seedDirectory = (extra = []) => {
  mswState.usersResponses = [
    [
      account(1, "SA-ROOT", "SUPER_ADMIN"),
      account(2, "VANCE-1102", "ADMIN"),
      account(3, "KAPIOR-4410", "DOCTOR"),
      account(4, "ODENI-5520", "DOCTOR"),
      account(5, "REYES-6621", "PHARMACIST"),
      account(6, "CHEN-8831", "ADMIN", { isActive: false }),
      account(7, "LOCKE-9902", "DOCTOR", {
        lockedUntil: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      }),
      ...extra,
    ],
  ];
};

const directoryReady = () =>
  screen.findByRole("region", { name: "Staff Directory Table" });

/** Open the kebab menu rendered inside `username`'s row. */
const openMenuFor = (username) => {
  const button = rowFor(username).getByRole("button");
  fireEvent.click(button);
  expect(screen.getByRole("menu")).toBeInTheDocument();
};

describe("super-admin user management — REST cases", () => {
  it("loads the staff directory through the authenticated client and derives account state", async () => {
    seedDirectory();
    openPage(PATH);

    const table = await directoryReady();
    expect(within(table).getByText("VANCE-1102")).toBeInTheDocument();
    expect(screen.getByText("7 accounts")).toBeInTheDocument();

    expect(mswState.usersHits).toHaveLength(1);
    expect(new URL(mswState.usersHits[0].url).pathname).toBe("/api/users");
    expect(mswState.usersHits[0].authorization).toBe(
      "Bearer super-admin-rest-token",
    );

    // status is derived from isActive + the failed-login lock window
    expect(rowFor("CHEN-8831").getByText("Inactive")).toBeInTheDocument();
    expect(rowFor("LOCKE-9902").getByText("Locked")).toBeInTheDocument();
    expect(rowFor("LOCKE-9902").getByText(/Unlocks in ~/)).toBeInTheDocument();
  });

  it("holds a loading skeleton until the directory responds", async () => {
    let release;
    server.use(
      http.get(
        "*/users",
        () =>
          new Promise((resolve) => {
            release = () => resolve(ok([account(1, "LATE-1000", "DOCTOR")]));
          }),
      ),
    );

    openPage(PATH);

    expect(
      screen.getByRole("status", { name: "Loading staff accounts" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Staff Directory Table" }),
    ).not.toBeInTheDocument();

    await waitFor(() => expect(release).toBeTypeOf("function"));
    release();
    await directoryReady();
    expect(screen.getByText("LATE-1000")).toBeInTheDocument();
  });

  it("pages the directory client-side", async () => {
    seedDirectory([
      ...Array.from({ length: 5 }, (_, i) =>
        account(20 + i, `EXTRA-${i}`, "DOCTOR"),
      ),
    ]);
    openPage(PATH);
    await directoryReady();

    expect(
      screen.getByRole("navigation", { name: "Page 1 of 2" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(
      screen.getByRole("navigation", { name: "Page 2 of 2" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("VANCE-1102")).not.toBeInTheDocument();
    expect(screen.getByText("EXTRA-4")).toBeInTheDocument();
    // pagination is client-side: no extra GET /users
    expect(mswState.usersHits).toHaveLength(1);
  });

  it("filters client-side by search and status, then clears back to the full list", async () => {
    seedDirectory();
    openPage(PATH);
    await directoryReady();

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "kapior" },
    });
    await waitFor(() =>
      expect(screen.getByText("1 of 7 shown")).toBeInTheDocument(),
    );
    expect(screen.queryByText("VANCE-1102")).not.toBeInTheDocument();
    expect(screen.getByText("KAPIOR-4410")).toBeInTheDocument();

    fireEvent.change(document.getElementById("status-filter"), {
      target: { value: "LOCKED" },
    });
    await waitFor(() =>
      expect(
        screen.getByText(
          "No staff accounts match the specified filter conditions.",
        ),
      ).toBeInTheDocument(),
    );

    // two "Clear" controls exist: the SearchBar reset and the filter-bar reset
    const clears = screen.getAllByRole("button", { name: "Clear" });
    expect(clears).toHaveLength(2);
    fireEvent.click(clears[0]);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() =>
      expect(screen.getByText("7 accounts")).toBeInTheDocument(),
    );
    expect(screen.getByText("LOCKE-9902")).toBeInTheDocument();
    // filters never re-hit the API
    expect(mswState.usersHits).toHaveLength(1);
  });

  it("surfaces a directory failure and retries the same endpoint", async () => {
    seedDirectory();
    mswState.usersErrorMode = "server-error";
    openPage(PATH);

    expect(
      await screen.findByText("Unable to load staff directory"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "We encountered an issue connecting to the identity provider.",
      ),
    ).toBeInTheDocument();

    mswState.usersErrorMode = null;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await directoryReady();
    expect(mswState.usersHits).toHaveLength(2);
    expect(mswState.usersHits[1].authorization).toBe(
      "Bearer super-admin-rest-token",
    );
  });

  it("provisions an account with the exact payload and bearer auth", async () => {
    seedDirectory();
    openPage(PATH);
    await directoryReady();

    fireEvent.click(screen.getByRole("button", { name: "Create User" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Create New User" }),
    ).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/Staff ID/), {
      target: { value: "PENDELTON-3312" },
    });
    fireEvent.change(within(dialog).getByLabelText(/Clinic Email/), {
      target: { value: "a.pendelton@onecare.clinic" },
    });
    fireEvent.change(within(dialog).getByLabelText(/Password/), {
      target: { value: "Temp-Passw0rd" },
    });
    fireEvent.change(within(dialog).getByLabelText(/Role Clearance/), {
      target: { value: "DOCTOR" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create Account" }),
    );

    await waitFor(() => expect(mswState.userCreateHits).toHaveLength(1));
    expect(mswState.userCreateHits[0].body).toEqual({
      password: "Temp-Passw0rd",
      username: "PENDELTON-3312",
      email: "a.pendelton@onecare.clinic",
      role: "DOCTOR",
    });
    expect(mswState.userCreateHits[0].authorization).toBe(
      "Bearer super-admin-rest-token",
    );

    expect(
      await screen.findByText(
        "Account for PENDELTON-3312 provisioned. Onboarding email dispatched.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("PENDELTON-3312")).toBeInTheDocument();
    // the POST answer is prepended, so the directory is not fetched again
    expect(mswState.usersHits).toHaveLength(1);
  });

  it("never sends an account-provisioning request for an invalid email", async () => {
    seedDirectory();
    openPage(PATH);
    await directoryReady();

    fireEvent.click(screen.getByRole("button", { name: "Create User" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Staff ID/), {
      target: { value: "BAD-EMAIL-1" },
    });
    fireEvent.change(within(dialog).getByLabelText(/Clinic Email/), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(within(dialog).getByLabelText(/Password/), {
      target: { value: "Temp-Passw0rd" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create Account" }),
    );

    expect(mswState.userCreateHits).toHaveLength(0);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("BAD-EMAIL-1")).toBeInTheDocument();
  });

  it("keeps the modal open and shows the backend message when provisioning fails", async () => {
    seedDirectory();
    mswState.userCreateErrorMode = "server-error";
    openPage(PATH);
    await directoryReady();

    fireEvent.click(screen.getByRole("button", { name: "Create User" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Staff ID/), {
      target: { value: "FAIL-1000" },
    });
    fireEvent.change(within(dialog).getByLabelText(/Clinic Email/), {
      target: { value: "fail@onecare.clinic" },
    });
    fireEvent.change(within(dialog).getByLabelText(/Password/), {
      target: { value: "Temp-Passw0rd" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create Account" }),
    );

    expect(await screen.findByText("Creation Failed")).toBeInTheDocument();
    expect(screen.getByText("Internal server error")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText("FAIL-1000", { selector: "td" })).toBeNull();
  });

  it("deactivates an account optimistically after the confirm step", async () => {
    seedDirectory();
    openPage(PATH);
    await directoryReady();

    openMenuFor("VANCE-1102");
    fireEvent.click(screen.getByRole("button", { name: "Deactivate account" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Deactivate account?" }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Deactivate Account" }),
    );

    expect(
      await screen.findByText("VANCE-1102 has been deactivated."),
    ).toBeInTheDocument();
    expect(rowFor("VANCE-1102").getByText("Inactive")).toBeInTheDocument();
    expect(mswState.userDeactivateHits).toHaveLength(1);
    expect(mswState.userDeactivateHits[0]).toMatchObject({
      id: "2",
      authorization: "Bearer super-admin-rest-token",
    });
  });

  it("rolls the row back when the backend refuses the deactivation", async () => {
    seedDirectory();
    openPage(PATH);
    await directoryReady();

    server.use(
      http.delete("*/users/:id", () =>
        failWith(403, "Deactivation blocked by policy"),
      ),
    );

    openMenuFor("VANCE-1102");
    fireEvent.click(screen.getByRole("button", { name: "Deactivate account" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Deactivate Account" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Deactivation blocked by policy");
    expect(rowFor("VANCE-1102").getByText("Active")).toBeInTheDocument();
  });

  it("clears the sign-in lockout through the unlock endpoint", async () => {
    seedDirectory();
    openPage(PATH);
    await directoryReady();

    openMenuFor("LOCKE-9902");
    fireEvent.click(screen.getByRole("button", { name: "Unlock account" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Clear sign-in lockout?" }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Unlock Account" }),
    );

    expect(
      await screen.findByText("Lockout cleared for LOCKE-9902."),
    ).toBeInTheDocument();
    expect(mswState.userUnlockHits[0]).toMatchObject({
      id: "7",
      authorization: "Bearer super-admin-rest-token",
    });
    expect(rowFor("LOCKE-9902").getByText("Active")).toBeInTheDocument();
  });

  it("assigns a new role through PUT /users/{id}/role", async () => {
    seedDirectory();
    openPage(PATH);
    await directoryReady();

    openMenuFor("VANCE-1102");
    fireEvent.click(screen.getByRole("button", { name: "Edit account" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Edit — VANCE-1102" }),
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Role Clearance/), {
      target: { value: "PHARMACIST" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save Changes" }),
    );

    expect(
      await screen.findByText("Account settings for VANCE-1102 updated."),
    ).toBeInTheDocument();
    expect(mswState.userRoleUpdateHits[0]).toMatchObject({
      id: "2",
      body: { role: "PHARMACIST" },
      authorization: "Bearer super-admin-rest-token",
    });
    // email was untouched, so no PUT /users/{id} went out
    expect(mswState.userEmailUpdateHits).toHaveLength(0);
    expect(rowFor("VANCE-1102").getByText("PHARMACIST")).toBeInTheDocument();
  });

  it("blocks every other role from the governance screen", async () => {
    seedDirectory();
    openPage(PATH, { role: "DOCTOR" });

    expect(
      await screen.findByRole("heading", { name: /today.s appointments/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("User Management")).not.toBeInTheDocument();
    expect(mswState.usersHits).toHaveLength(0);
  });

  it("sends a signed-out visitor to the sign-in screen", async () => {
    openPage(PATH, { role: null });

    expect(
      await screen.findByRole("heading", { name: /sign in to onecare/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("User Management")).not.toBeInTheDocument();
    expect(mswState.usersHits).toHaveLength(0);
  });
});
