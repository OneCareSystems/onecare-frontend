# OneCare Frontend

## Overview

This repository contains the frontend application for the OneCare system.

Built using:

- React
- Vite
- Tailwind CSS
- ESLint
- Prettier
- GitHub Actions

## Prerequisites

Install:

- Node.js 22 (see `.nvmrc`; `engines` requires >= 22)
- npm

For the container workflow: Docker with Compose v2.

## Installation

Clone repository:

```bash
git clone https://github.com/OneCareSystems/onecare-frontend
cd onecare-frontend
```

Install dependencies:

```bash
npm install
```

## Running Development Server

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

## Preview Build

```bash
npm run preview
```

## Linting

Run lint:

```bash
npm run lint
```

Run formatter:

```bash
npm run format
```

Check formatting:

```bash
npm run format:check
```

## Tests

Run the suite:

```bash
npm run test
```

Run with coverage:

```bash
npm run test:coverage
```

Tests live in the top-level `test/` directory, which mirrors `src/`
(for example `src/services/apiClient.js` → `test/services/apiClient.test.js`).
Shared test infrastructure (`setup.js`, MSW handlers/server) is in `test/` as
well. No test files are kept inside `src/`.

## Theming & Accessibility (CFG-01)

Colour, font and spacing tokens are declared once in:

```text
src/theme/tokens.js
```

They are consumed by `tailwind.config.js`, the contrast gate and the
colour/type reference page at:

```text
/styleguide
```

Components must use token classes (for example `bg-primary-600`) and never
contain raw hex values.

Check token contrast (WCAG 2.1, minimum 4.5:1):

```bash
npm run check:contrast
```

The same command runs in CI and fails the pipeline when a declared
text/background pair drops below 4.5:1.

## Environment Variables

Create:

```env
.env
```

Copy the template:

```bash
cp .env.example .env
```

Example (`.env.example`):

```env
# Base URL of the backend API, including the /api prefix.
VITE_API_BASE_URL=/api
```

`VITE_API_BASE_URL` is read once in `src/services/config.js` and consumed by the
central Axios client. Components must never contain hostnames or localhost
strings.

If the variable is missing or blank, the client defaults to `/api`. In development,
Vite proxies `/api` to `http://localhost:8080` without rewriting the path, so login
goes from `/api/auth/login` to `http://localhost:8080/api/auth/login`. Service paths
such as `/auth/login` must not add another `/api` prefix. Restart Vite after changing
environment variables or proxy configuration.

The proxy target itself is env-driven (`VITE_DEV_PROXY_TARGET`, default
`http://localhost:8080`) so Compose dev mode can point it at the `backend`
service name.

For direct backend requests, set `VITE_API_BASE_URL=http://localhost:8080/api`
and allow the frontend origin in the backend CORS configuration.

### Runtime configuration (DDP-#49 / DKR-03)

`VITE_*` variables are **baked into the bundle at build time**, so the image
must never carry an environment-specific URL. The production container writes
a small runtime file at start:

```text
/config.json   →   { "apiBaseUrl": "/api" }   (public settings only, no secrets)
```

`src/services/config.js` (CFG-02) resolves the API base URL in this order:

1. runtime `/config.json` value (`apiBaseUrl`)
2. build-time `VITE_API_BASE_URL`
3. default `/api` (same origin — nginx or Vite proxies it)

A missing, partial or broken runtime file never crashes the app: it silently
falls back to the build-time defaults. This is what lets **one image run in
staging and production without a rebuild** (parent AC3). Nothing secret may
ever appear in `/config.json` or any `VITE_*` variable — CI scans the shipped
bundle with gitleaks and fails on a finding.

## Docker (DDP-#49)

### Production image

`Dockerfile.prod` is a two-stage build:

1. **build** — pinned `node:<version>-alpine`, `npm ci`, `vite build` with
   `VITE_API_BASE_URL=/api` (same-origin; no hostname in the bundle)
2. **serve** — pinned `nginxinc/nginx-unprivileged` on port **8080** as the
   non-root `nginx` user (uid 101); only `dist/` ships — no Node, no source,
   no `.env`, no secrets in any layer

```bash
docker build -f Dockerfile.prod -t onecare-frontend .
docker run --rm -p 8080:8080 -e BACKEND_URL=http://host.docker.internal:8080 onecare-frontend
```

Image size: **~26 MB** (recorded at DKR-01, `docker image inspect`).

Container start (`docker/entrypoint.sh`) exports nginx template defaults and
writes `/config.json` from `RUNTIME_API_BASE_URL` (default `/api`).

Base images are pinned; `hadolint` runs in CI and fails on unpinned or
`latest` tags (`.hadolint.yaml`).

### nginx behaviour (DKR-02)

`nginx/default.conf.template` (rendered at container start):

- `location /` — SPA fallback: unknown paths return `index.html` so React
  Router deep links survive a hard refresh
- `location /api` — proxied to `${BACKEND_URL}` with `X-Forwarded-For`,
  `X-Real-IP`, `X-Forwarded-Proto`; `Authorization` and `Cookie` pass
  through. Unknown `/api` paths return the backend's real 404/502, never
  the SPA shell. The upstream is resolved at request time (Docker DNS), so
  nginx starts before the backend is healthy
- `location ^~ /assets/` — hashed bundles: `Cache-Control: immutable`;
  missing files are real 404s
- `index.html` and `/config.json` — `Cache-Control: no-store`
- `location = /healthz` — served by nginx itself for container/Compose
  health checks
- security headers on every response (nosniff, deny framing, referrer
  policy, CSP — `nginx/security-headers.conf`); `server_tokens off`; gzip
  on; body size (`CLIENT_MAX_BODY_SIZE`, default `25m`) and proxy timeouts
  (`PROXY_READ_TIMEOUT`, default `300s`) match the backend limits

**TLS at the edge:** HTTPS with TLS 1.2+ and HSTS are terminated at the
production edge/ingress (SDS §2.5.3), not inside this container. The
container serves plain HTTP on the internal network; do not fake TLS here.

### Compose

The full stack (frontend, backend, MySQL, Redis, chatbot) lives in the
`onecare-infra` repository — see its README for dev and prod-like modes.

---

## API Client & Interceptors (CFG-02)

All HTTP calls go through one central Axios instance:

```text
src/services/apiClient.js
```

```js
import apiClient from "../services/apiClient";

const { data } = await apiClient.get("/patients/1");
```

Behaviour (API Standards §7, §14–15, §38, §44, §49–50):

- **Request interceptor** — attaches `Authorization: Bearer <token>` in one
  place only; pass `{ skipAuth: true }` for public endpoints.
- **401** — one shared refresh (`POST /api/auth/refresh`, single-flight, all
  concurrent callers wait on it), then the original calls are retried
  transparently.
- **Failed refresh** (including a 401 from the refresh endpoint, or a second
  401 after retry) — auth state is cleared, `onecare:session-expired` is
  dispatched, and the user is sent to `/login?reason=session-expired`. No retry
  loop.
- **403 / 429 / 500** — the standard `{success, message, data}` envelope is
  surfaced on the rejected error (`error.userMessage`, `error.status`,
  `error.data`); the user is never logged out.
- **Proactive refresh** — `startTokenRefreshScheduler({ isUserActive })` fires
  ~5 minutes before expiry (`expiresIn` 1800 s) and only while the user is
  active, so an idle session is never extended (FR008, SDS §2.5.1). The
  callback is supplied by CFG-05 and defaults to inactive-safe until wired.

Tokens, passwords and request bodies are never logged.

### Module services

```text
src/services/authService.js   login / refresh / logout / getCurrentUser (CFG-02)
```

The remaining module services (`patientService`, `appointmentService`,
`medicineService`, `prescriptionService`, …) are added by their feature
tickets and must call the central client above.

### Session state — Redux (in-memory)

**Decision:** auth state lives in Redux only; there is no storage adapter.

Tokens are held by the `auth` feature slice in `src/features/auth/authSlice.js`
(`accessToken`, `refreshToken`, `expiresAt`, `role`, `redirectUrl`):

- **store** — the single store lives in `src/app/store.js`; register new
  feature reducers there
- **write** — `store.dispatch(setSession(payload))` / `clearSession()`
- **read** — selectors (`selectAccessToken`, `selectIsAuthenticated`, …) via
  `store.getState()` in services, `useSelector` in components
- the app is wrapped in `<Provider store={store}>` in `src/main.jsx` (inside
  `StrictMode`, around the existing router in `App.jsx`)

Nothing is written to `localStorage` or `sessionStorage`, so a page reload ends
the session and the user signs in again (the login ticket owns re-auth and the
role-based redirect).

POST/PUT/PATCH/DELETE, still in one place. Components and services are
unaffected either way.

---

## CI Pipeline

CI workflow location:

```text
.github/workflows/ci.yml
```

Pipeline (DDP-#49 / DKR-05):

**Job `build-test`** — install → colour contrast check → lint → tests with
coverage thresholds (80% statements/lines/functions, 70% branches, enforced
in `vite.config.js`) → `npm audit` (production deps) → build.

**Job `docker`** (needs `build-test`) — hadolint → Docker image build →
bundle secret scan (gitleaks over the image's `dist/`) → image
vulnerability scan (trivy, fails on fixable HIGH/CRITICAL) → push.

Pull requests build and scan but never push. Merges to `develop`/`main`
push the image to GHCR tagged `sha-<commit>`; no `latest` tag is ever
pushed, and deployments promote the same SHA from staging to production.
