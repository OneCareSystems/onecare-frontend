import { afterEach, describe, expect, it } from "vitest";
import {
  adaptUserResponse,
  adaptUsersResponse,
  assignUserRole,
  createUser,
  deactivateUser,
  getUsers,
  resetUserPassword,
  unlockUser,
  updateUserEmail,
} from "../../src/services/userService";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { mswState, resetMswState } from "../msw/handlers";

afterEach(() => {
  store.dispatch(clearSession());
  resetMswState();
});

describe("userService — staff account directory", () => {
  it("adapts the paginated directory and derives account state", () => {
    expect(
      adaptUsersResponse({
        success: true,
        message: "Users retrieved successfully",
        data: { content: [
          {
            userId: 1,
            username: "superadmin",
            email: "superadmin@onecare.test",
            role: "DOCTOR",
            isActive: true,
          },
          {
            userId: 2,
            username: "disabled",
            role: "super_admin",
            isActive: false,
          },
        ], totalPages: 1, totalElements: 2 },
      }),
    ).toEqual([
      {
        userId: 1,
        fullName: "superadmin",
        username: "superadmin",
        email: "superadmin@onecare.test",
        role: "DOCTOR",
        status: "ACTIVE",
        lockedUntil: null,
      },
      {
        userId: 2,
        fullName: "disabled",
        username: "disabled",
        email: "",
        role: "SUPER_ADMIN",
        status: "INACTIVE",
        lockedUntil: null,
      },
    ]);

    expect(() =>
      adaptUsersResponse({ success: true, data: { items: [] } }),
    ).toThrow(/response format/i);
    expect(() =>
      adaptUsersResponse({ success: false, data: [] }),
    ).toThrow(/response format/i);
  });

  it("derives account state from isActive and the lock window", () => {
    expect(
      adaptUserResponse({
        success: true,
        data: {
          id: 7,
          username: "CHEN-8831",
          role: "PHARMACIST",
          dept: "Central Dispensary",
          isActive: false,
        },
      }),
    ).toEqual({
      userId: 7,
      fullName: "CHEN-8831",
      username: "CHEN-8831",
      email: "",
      role: "PHARMACIST",
      status: "INACTIVE",
      lockedUntil: null,
    });

    // AuthServiceImpl sets lockedUntil when the failed-login counter
    // trips (the API answers 423 until that moment).
    const lockedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(
      adaptUserResponse({
        success: true,
        data: {
          userId: 8,
          username: "VANCE-1102",
          role: "ADMIN",
          isActive: true,
          lockedUntil,
        },
      }),
    ).toMatchObject({ status: "LOCKED", lockedUntil });

    // An expired lock window reads as active again.
    expect(
      adaptUserResponse({
        success: true,
        data: {
          userId: 8,
          username: "VANCE-1102",
          role: "ADMIN",
          isActive: true,
          lockedUntil: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
      }),
    ).toMatchObject({ status: "ACTIVE", lockedUntil: null });

    expect(() =>
      adaptUserResponse({ success: true, data: { fullName: "No id" } }),
    ).toThrow(/response format/i);
  });

  it("fetches the directory through the authenticated client", async () => {
    store.dispatch(
      setSession({ accessToken: "u-access", role: "SUPER_ADMIN" }),
    );
    mswState.usersResponses = [
      { content: [
        {
          userId: 1,
          username: "VANCE-1102",
          role: "ADMIN",
          isActive: true,
        },
      ], totalPages: 1, totalElements: 1 },
    ];

    const users = await getUsers();

    expect(users).toEqual([
      {
        userId: 1,
        fullName: "VANCE-1102",
        username: "VANCE-1102",
        email: "",
        role: "ADMIN",
        status: "ACTIVE",
        lockedUntil: null,
      },
    ]);
    expect(new URL(mswState.usersHits[0].url).pathname).toMatch(
      /\/api\/users$/,
    );
    expect(mswState.usersHits[0].authorization).toBe("Bearer u-access");
  });

  it("provisions a new account with the normalised payload", async () => {
    store.dispatch(
      setSession({ accessToken: "u-access", role: "SUPER_ADMIN" }),
    );

    await createUser({
      fullName: "Dr. Arthur Pendelton",
      username: "PENDELTON-3312",
      email: "a.pendelton@onecare.clinic",
      role: "doctor",
    });

    expect(mswState.userCreateHits).toHaveLength(1);
    expect(mswState.userCreateHits[0].body).toMatchObject({
      fullName: "Dr. Arthur Pendelton",
      username: "PENDELTON-3312",
      email: "a.pendelton@onecare.clinic",
      role: "DOCTOR",
    });
    expect(mswState.userCreateHits[0].authorization).toBe(
      "Bearer u-access",
    );
  });

  it("triggers the admin password reset through the authenticated client", async () => {
    store.dispatch(
      setSession({ accessToken: "u-access", role: "SUPER_ADMIN" }),
    );

    await resetUserPassword(5);

    expect(mswState.userResetHits[0].id).toBe("5");
    expect(mswState.userResetHits[0].authorization).toBe(
      "Bearer u-access",
    );
  });

  it("updates email/role, unlocks and deactivates through the governance endpoints", async () => {
    store.dispatch(
      setSession({ accessToken: "u-access", role: "SUPER_ADMIN" }),
    );

    await updateUserEmail(9, "  new.email@onecare.clinic  ");
    expect(mswState.userEmailUpdateHits[0]).toMatchObject({
      id: "9",
      body: { email: "new.email@onecare.clinic" },
      authorization: "Bearer u-access",
    });

    await assignUserRole(9, "doctor");
    expect(mswState.userRoleUpdateHits[0].body).toEqual({ role: "DOCTOR" });

    await unlockUser(9);
    expect(mswState.userUnlockHits[0]).toMatchObject({
      id: "9",
      authorization: "Bearer u-access",
    });

    await deactivateUser(9);
    expect(mswState.userDeactivateHits[0]).toMatchObject({
      id: "9",
      authorization: "Bearer u-access",
    });
  });

  it("rejects an unknown role assignment with 400", async () => {
    const error = await assignUserRole(9, "PATIENT").catch((caught) => caught);

    expect(error.status).toBe(400);
    expect(mswState.userRoleUpdateHits[0].body).toEqual({ role: "PATIENT" });
  });

  it("propagates directory failures for callers to surface", async () => {
    mswState.usersErrorMode = "server-error";
    await expect(getUsers()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
