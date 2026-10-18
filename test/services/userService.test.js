import { afterEach, describe, expect, it } from "vitest";

import {
  adaptUserResponse,
  adaptUsersResponse,
  createUser,
  getUsers,
  resetUserPassword,
  updateUserStatus,
} from "../../src/services/userService";
import { store } from "../../src/app/store";
import { clearSession, setSession } from "../../src/features/auth/authSlice";
import { mswState, resetMswState } from "../msw/handlers";

afterEach(() => {
  store.dispatch(clearSession());
  resetMswState();
});

describe("userService — staff account directory", () => {
  it("adapts the paginated directory and maps isActive", () => {
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
      },
      {
        userId: 2,
        fullName: "disabled",
        username: "disabled",
        email: "",
        role: "SUPER_ADMIN",
        status: "SUSPENDED",
      },
    ]);

    expect(() =>
      adaptUsersResponse({ success: true, data: { items: [] } }),
    ).toThrow(/response format/i);
    expect(() =>
      adaptUsersResponse({ success: false, data: [] }),
    ).toThrow(/response format/i);
  });

  it("adapts a single account and rejects unusable payloads", () => {
    expect(
      adaptUserResponse({
        success: true,
        data: {
          id: 7,
          username: "CHEN-8831",
          role: "PHARMACIST",
          dept: "Central Dispensary",
          twoFactor: false,
          status: "SUSPENDED",
        },
      }),
    ).toEqual({
      userId: 7,
      fullName: "CHEN-8831",
      username: "CHEN-8831",
      email: "",
      role: "PHARMACIST",
      status: "SUSPENDED",
    });

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

  it("toggles account status and triggers the reset-key email", async () => {
    store.dispatch(
      setSession({ accessToken: "u-access", role: "SUPER_ADMIN" }),
    );

    const suspended = await updateUserStatus(5, "suspended");
    expect(suspended.status).toBe("SUSPENDED");
    expect(mswState.userStatusHits[0].id).toBe("5");
    expect(mswState.userStatusHits[0].body).toEqual({
      status: "SUSPENDED",
    });

    await resetUserPassword(5);
    expect(mswState.userResetHits[0].id).toBe("5");
    expect(mswState.userResetHits[0].authorization).toBe(
      "Bearer u-access",
    );
  });

  it("propagates directory failures for callers to surface", async () => {
    mswState.usersErrorMode = "server-error";
    await expect(getUsers()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
