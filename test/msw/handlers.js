import { http, HttpResponse } from "msw";

import { ROLE_DASHBOARDS } from "../../src/constants/roles";

export const mswState = {
  tokenValid: true,
  refreshValid: true,
  refreshCount: 0,
  protectedHits: [],
  refreshTokens: [],
  loginValid: true,
  loginRole: "ADMIN",
  loginErrorMode: null,
  forgotPasswordHits: [],
  forgotPasswordErrorMode: null,
  resetPasswordHits: [],
  resetPasswordErrorMode: null,
  queueHits: [],
  queueErrorMode: null,
  queueResponses: [],
  queueCompleteHits: [],
  queueCompleteErrorMode: null,
  patientsHits: [],
  patientsResponses: [],
  patientsErrorMode: null,
};

export const resetMswState = () => {
  mswState.tokenValid = true;
  mswState.refreshValid = true;
  mswState.refreshCount = 0;
  mswState.protectedHits = [];
  mswState.refreshTokens = [];
  mswState.loginValid = true;
  mswState.loginRole = "ADMIN";
  mswState.loginErrorMode = null;
  mswState.forgotPasswordHits = [];
  mswState.forgotPasswordErrorMode = null;
  mswState.resetPasswordHits = [];
  mswState.resetPasswordErrorMode = null;
  mswState.queueHits = [];
  mswState.queueErrorMode = null;
  mswState.queueResponses = [];
  mswState.queueCompleteHits = [];
  mswState.queueCompleteErrorMode = null;
  mswState.patientsHits = [];
  mswState.patientsResponses = [];
  mswState.patientsErrorMode = null;
};

const ok = (data, message = "ok") =>
  HttpResponse.json({ success: true, message, data });

const fail = (status, message) =>
  HttpResponse.json({ success: false, message, data: null }, { status });

const protectedReply = ({ request, params }) => {
  mswState.protectedHits.push({
    id: params.id ?? params.path,
    authorization: request.headers.get("Authorization"),
  });
  if (!mswState.tokenValid) return fail(401, "Access token expired");
  return ok({ id: params.id ?? params.path, name: "Jane Doe" });
};

export const handlers = [
  http.post("*/auth/login", async ({ request }) => {
    const body = await request.json().catch(() => ({}));

    if (mswState.loginErrorMode === "rate-limit") {
      return fail(429, "Too many requests. Please slow down.");
    }

    if (mswState.loginErrorMode === "lockout") {
      return fail(
        423,
        "Account locked. Wait for timed unlock, contact Super Admin, or use Forgot Password.",
      );
    }

    if (!mswState.loginValid) {
      return fail(401, "Invalid credentials");
    }

    return ok({
      accessToken: "login-access",
      refreshToken: "login-refresh",
      expiresIn: 1800,
      role: mswState.loginRole,
      username: body?.username ?? "test-user",
      redirectUrl: ROLE_DASHBOARDS[mswState.loginRole],
      user: {
        name: "Test User",
        email: body?.username ?? "test@onecare.test",
      },
    });
  }),
  http.post("*/auth/forgot-password", async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    mswState.forgotPasswordHits.push(body);

    if (mswState.forgotPasswordErrorMode === "rate-limit") {
      return fail(429, "Too many requests. Please slow down.");
    }
    if (mswState.forgotPasswordErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.forgotPasswordErrorMode === "network-error") {
      return HttpResponse.error();
    }

    return ok(null, "Password reset instructions sent");
  }),
  http.post("*/auth/reset-password", async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    mswState.resetPasswordHits.push(body);

    if (mswState.resetPasswordErrorMode === "rate-limit") {
      return fail(429, "Too many requests. Please slow down.");
    }
    if (mswState.resetPasswordErrorMode === "invalid-token") {
      return fail(400, "Invalid or expired token");
    }
    if (mswState.resetPasswordErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }

    return ok(null, "Password has been reset successfully");
  }),
  http.get("*/queue/today", async ({ request }) => {
    mswState.queueHits.push({
      url: request.url,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.queueErrorMode === "network-error")
      return HttpResponse.error();
    if (mswState.queueErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.queueErrorMode === "delay") {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const data = mswState.queueResponses.shift() ?? [];
    return ok(data);
  }),
  // DOC-04 Complete action — verified backend contract:
  // PATCH /api/queue/{appointmentId}/status with { status: "COMPLETED" }.
  http.patch("*/queue/:id/status", async ({ request, params }) => {
    const body = await request.json().catch(() => ({}));
    mswState.queueCompleteHits.push({
      id: params.id,
      body,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.queueCompleteErrorMode === "conflict") {
      return fail(409, "Appointment status changed");
    }
    // The backend reports conflicting transitions as 400
    // (InvalidAppointmentStatusException), not 409.
    if (mswState.queueCompleteErrorMode === "bad-request") {
      return fail(400, "Invalid appointment status transition");
    }
    if (mswState.queueCompleteErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.queueCompleteErrorMode === "network-error") {
      return HttpResponse.error();
    }
    return ok({
      appointmentId: Number(params.id),
      status: body?.status ?? "COMPLETED",
    });
  }),
  // Patient directory (doctor holds PATIENT_READ) used only to label rows.
  http.get("*/patients", ({ request }) => {
    mswState.patientsHits.push({
      url: request.url,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.patientsErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.patientsErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    return ok(mswState.patientsResponses.shift() ?? []);
  }),
  http.get("*/patients/:id", protectedReply),
  http.get("*/reports/:id", protectedReply),
  http.get("*", ({ request }) => {
    const path = new URL(request.url).pathname;
    if (path.endsWith("/forbidden")) {
      return fail(403, "You do not have permission to view this resource");
    }
    if (path.endsWith("/rate-limited")) {
      return fail(429, "Too many requests. Please slow down.");
    }
    if (path.endsWith("/server-error")) {
      return fail(500, "Internal server error");
    }
    return HttpResponse.json(
      { success: false, message: "Not found" },
      { status: 404 },
    );
  }),
  http.post("*/auth/refresh", async ({ request }) => {
    mswState.refreshCount += 1;
    const body = await request.json().catch(() => ({}));
    mswState.refreshTokens.push(body?.refreshToken ?? null);
    if (!mswState.refreshValid) {
      return fail(401, "Refresh token invalid");
    }
    mswState.tokenValid = true;
    return ok({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresIn: 7200,
    });
  }),
];
