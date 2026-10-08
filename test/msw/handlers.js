import { http, HttpResponse } from "msw";

export const mswState = {
  tokenValid: true,
  refreshValid: true,
  refreshCount: 0,
  protectedHits: [],
  refreshTokens: [],
};

export const resetMswState = () => {
  mswState.tokenValid = true;
  mswState.refreshValid = true;
  mswState.refreshCount = 0;
  mswState.protectedHits = [];
  mswState.refreshTokens = [];
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
