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

- Node.js (LTS)
- npm

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
VITE_API_BASE_URL=http://localhost:8080/api
```

`VITE_API_BASE_URL` is read once in `src/services/config.js` and consumed by the
central Axios client. Components must never contain hostnames or localhost
strings.

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

Pipeline currently performs:

- Install dependencies
- Colour contrast check (`npm run check:contrast`)
- Lint
- Tests with coverage
- Build validation
