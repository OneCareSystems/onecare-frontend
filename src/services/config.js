// Services supply paths such as /auth/login; this base owns the /api prefix.
// With no env override, use the same-origin API (proxied by Vite in dev).
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") || "/api";
