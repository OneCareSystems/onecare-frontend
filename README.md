# OneCare Frontend
[![CI](https://github.com/OneCareSystems/onecare-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/OneCareSystems/onecare-frontend/actions/workflows/ci.yml) [![License](https://img.shields.io/github/license/OneCareSystems/onecare-frontend)](https://github.com/OneCareSystems/onecare-frontend) [![Last Commit](https://img.shields.io/github/last-commit/OneCareSystems/onecare-frontend)](https://github.com/OneCareSystems/onecare-frontend/commits/main) [![Issues](https://img.shields.io/github/issues/OneCareSystems/onecare-frontend)](https://github.com/OneCareSystems/onecare-frontend/issues) [![Pull Requests](https://img.shields.io/github/issues-pr/OneCareSystems/onecare-frontend)](https://github.com/OneCareSystems/onecare-frontend/pulls) [![Contributors](https://img.shields.io/github/contributors/OneCareSystems/onecare-frontend)](https://github.com/OneCareSystems/onecare-frontend/graphs/contributors) [![Code Size](https://img.shields.io/github/languages/code-size/OneCareSystems/onecare-frontend)](https://github.com/OneCareSystems/onecare-frontend) [![Node.js](https://img.shields.io/badge/Node.js-22-green?logo=nodedotjs)](https://nodejs.org/) [![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black)](https://react.dev/) [![Vite](https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white)](https://vite.dev/) [![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker&logoColor=white)](https://www.docker.com/) [![Security](https://img.shields.io/badge/Security-Gitleaks%20%2B%20Trivy-blue?logo=github)](https://github.com/OneCareSystems/onecare-frontend/actions/workflows/ci.yml)

## 1. Project Description
**OneCare Clinic Integrated Pharmacy Management System** is a web-based platform that digitises the operations of a single-doctor private clinic with an in-house pharmacy: patient records, appointments, queue management, consultations, prescriptions, pharmacy dispensing, inventory, billing, reporting and a patient chatbot.

This repository (`onecare-frontend`) is the **React single-page application** of the system. It covers two areas:

- **Public patient portal** – home, login, password reset and self-service appointment booking (no login required), plus a bilingual chat widget.

- **Staff workspace** – role-based dashboards and screens behind a login for four roles: Super Admin, Admin, Doctor and Pharmacist. All roles share the same shell (sidebar, top bar, breadcrumbs) with navigation filtered by role.

The interface is bilingual (English and Tamil).

### Link to the broader project
This repository is part of the **OneCareSystems** GitHub Organisation (SENG 34213 – System Development Project, University of Kelaniya).

| Part | Location |
| ---- | -------- |
| GitHub Organization | [Github]https://github.com/OneCareSystems |
| Backend (Spring Boot) | https://github.com/OneCareSystems/onecare-backend |
| Chatbot (django)| https://github.com/OneCareSystems/onecare-chatbot |
| Infrastructure (Docker Compose, deployment) | https://github.com/OneCareSystems/onecare-infra |
| Tests (Postman / integration) | https://github.com/OneCareSystems/onecare-testing |
| Documents (SRS, SDS, ADRs) | [onecare-documents](https://github.com/OneCareSystems/onecare-documents) |
| GitHub Project board | [Project Board](https://github.com/orgs/OneCareSystems/projects/4) |

## 2. Deployed Application
| Environment | URL |
| ----------- | --- |
| Staging | `<STAGING_URL>` |

Demo user credentials are supplied to the supervisor with the submission and are never committed to this repository.

## 3. Built Using
- React 19 + Vite

- Redux Toolkit + redux-persist

- React Router

- Tailwind CSS

- i18next / react-i18next

- Vitest + Testing Library + MSW, Playwright

- ESLint, Prettier, Husky

- GitHub Actions

- Docker + nginx

## 4. Prerequisites
**Runtime and tools**

- Git

- Node.js **22** (see `.nvmrc`; `package.json` `engines` requires >= 22)

- npm (bundled with Node.js)

- A running OneCare backend (see [`onecare-backend`](https://github.com/OneCareSystems/onecare-backend) or the Compose stack in [`onecare-infra`](https://github.com/OneCareSystems/onecare-infra)); default `http://localhost:8080`

- Optional, for the container workflow: Docker with Compose

**Environment variables**

All variables are optional for local development; `.env.example` lists them with defaults.

| Variable | Required | Default | Purpose |
| -------- | -------- | ------- | ------- |
| `VITE_API_BASE_URL` | No | `/api` | Base URL of the backend API, including the `/api` prefix |
| `VITE_DEV_PROXY_TARGET` | No | `http://localhost:8080` | Backend target the Vite dev server proxies `/api` to |
| `VITE_CLINIC_PHONE` | No | built-in default | Clinic phone shown in footer/contact block |
| `VITE_CLINIC_EMAIL` | No | built-in default | Clinic email shown in footer/contact block |
| `VITE_CLINIC_ADDRESS` | No | built-in default | Clinic address shown in footer/contact block |
| `VITE_CLINIC_HOURS` | No | built-in default | Opening-hours text on the Home page |

For the smoke tests only: `SMOKE_BASE_URL`, `SMOKE_STAFF_USERNAME`, `SMOKE_STAFF_PASSWORD` (never committed).

> Nothing secret may be placed in any `VITE_*` variable or in `/config.json`; these are baked into or served with the public bundle.

## 5. Installation and Running (step by step)
These steps work on a fresh machine.

1. **Install Node.js 22** (for example with [nvm](https://github.com/nvm-sh/nvm)):

   ```bash

   nvm install 22

   nvm use 22

   ```

2. **Clone the repository:**

   ```bash

   git clone https://github.com/OneCareSystems/onecare-frontend

   cd onecare-frontend

   ```

3. **Install dependencies:**

   ```bash

   npm install

   ```

4. **Create your environment file from the template:**

   ```bash

   cp .env.example .env

   ```

   (On Windows PowerShell: `Copy-Item .env.example .env`.)

5. **Start the backend** on `http://localhost:8080` (see the `onecare-infra` README for the one-command Compose setup).

6. **Start the development server:**

   ```bash

   npm run dev

   ```

   Open the URL printed in the terminal (Vite default: `http://localhost:5173`).

7. **Build and preview a production bundle (optional):**

   ```bash

   npm run build

   npm run preview

   ```

### How the API URL is resolved
`VITE_API_BASE_URL` is read once in `src/services/config.js` and used by the central Axios client. If missing or blank it defaults to `/api`. In development Vite proxies `/api` to `VITE_DEV_PROXY_TARGET` (default `http://localhost:8080`) without rewriting the path, so `/api/auth/login` reaches `http://localhost:8080/api/auth/login`. Service paths such as `/auth/login` must not add another `/api` prefix. Restart Vite after changing environment variables or proxy configuration.

For direct backend requests, set `VITE_API_BASE_URL=http://localhost:8080/api` and allow the frontend origin in the backend CORS configuration.

## 6. Scripts
| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint |
| `npm run format` / `npm run format:check` | Prettier write / check |
| `npm run check:i18n` | Every user-facing string exists in both locales |
| `npm run test` | Unit tests |
| `npm run test:coverage` | Unit tests with coverage |
| `npm run test:e2e` | Playwright (starts dev server, Chromium at 360 px) |
| `npm run test:smoke` | Playwright against a deployed environment |

## 7. Testing
Tests live in the top-level `test/` directory, which mirrors `src/` (for example `src/services/apiClient.js` → `test/services/apiClient.test.js`). Shared infrastructure (`setup.js`, MSW handlers/server) is in `test/` as well. No test files are kept inside `src/`.

```bash

npm run test            # unit suite

npm run test:coverage   # with coverage thresholds

npm run test:public     # public portal pages

npm run test:chatbot    # chat widget

```

**Coverage thresholds** (declared in `vite.config.js`, failing the run when unmet): 80% statements/lines/functions, 70% branches.

**End-to-end (Playwright)** – specs live in `e2e/`:

```bash

npm run test:e2e        # local dev server

npm run test:smoke      # already-deployed environment

```

`test:smoke` needs `SMOKE_BASE_URL`, `SMOKE_STAFF_USERNAME` and `SMOKE_STAFF_PASSWORD`; it never runs against a local dev server.

## 8. CI Pipeline
Workflow: `.github/workflows/ci.yml` (status badge at the top of this file).

**Job `build-test`** – install → translation parity check → colour contrast check → lint → tests with coverage thresholds → `npm audit` (production dependencies) → build.

**Job `docker`** (needs `build-test`) – hadolint → Docker image build → bundle secret scan (gitleaks over the image's `dist/`) → image vulnerability scan (trivy, fails on fixable HIGH/CRITICAL) → push.

Pull requests build and scan but never push. Merges to `develop` / `main` push the image to GHCR tagged `sha-<commit>`; no `latest` tag is ever pushed, and deployments promote the same SHA from staging to production.

## 9. Docker
### Production image
`Dockerfile.prod` is a two-stage build:

1. **build** – pinned `node:<version>-alpine`, `npm ci`, `vite build` with `VITE_API_BASE_URL=/api` (same-origin; no hostname in the bundle)

2. **serve** – pinned `nginxinc/nginx-unprivileged` on port **8080** as the non-root `nginx` user (uid 101); only `dist/` ships (no Node, source, `.env` or secrets in any layer)

```bash

docker build -f Dockerfile.prod -t onecare-frontend .

docker run --rm -p 3000:8080 -e BACKEND_URL=http://host.docker.internal:8080 onecare-frontend

```

Then open `http://localhost:3000`. (Port 3000 is used on the host to avoid clashing with a backend on 8080.) Image size: ~94 MB.

At start, `docker/entrypoint.sh` exports nginx template defaults and writes `/config.json` from `RUNTIME_API_BASE_URL` (default `/api`). Base images are pinned and `hadolint` fails CI on unpinned or `latest` tags (`.hadolint.yaml`).

### Runtime configuration
`VITE_*` variables are baked in at build time, so the image never carries an environment-specific URL. `src/services/config.js` resolves the API base URL in this order:

1. runtime `/config.json` value (`apiBaseUrl`)

2. build-time `VITE_API_BASE_URL`

3. default `/api`

A missing or broken runtime file silently falls back to build-time defaults. This lets **one image run in staging and production without a rebuild**.

### nginx behaviour
`nginx/default.conf.template` (rendered at container start):

- `location /` – SPA fallback to `index.html` so deep links survive a hard refresh

- `location /api` – proxied to `${BACKEND_URL}` with `X-Forwarded-For`, `X-Real-IP`, `X-Forwarded-Proto`; `Authorization` and `Cookie` pass through; unknown `/api` paths return the backend's real 404/502

- `location ^~ /assets/` – hashed bundles with `Cache-Control: immutable`

- `index.html` and `/config.json` – `Cache-Control: no-store`

- `location = /healthz` – served by nginx for health checks

- security headers on every response (nosniff, deny framing, referrer policy, CSP – `nginx/security-headers.conf`); `server_tokens off`; gzip on; body size (`CLIENT_MAX_BODY_SIZE`, default `25m`) and proxy timeouts (`PROXY_READ_TIMEOUT`, default `300s`) match the backend limits

**TLS:** HTTPS (TLS 1.2+) and HSTS are terminated at the production edge/ingress, not in this container.

### Compose
The full stack (frontend, backend, MySQL, Redis, chatbot) lives in [`onecare-infra`](https://github.com/OneCareSystems/onecare-infra); see its README for dev and prod-like modes.

## 10. Project Structure
```text

onecare-frontend/

├── public/                  # static assets served from the site root

├── src/

│   ├── app/store.js         # the single Redux store

│   ├── components/          # shared UI + feature folders (admin, doctor,

│   │                        #   Pharmacist, chatbot)

│   ├── constants/           # roles, permissions, route access, navigation

│   ├── features/            # Redux slices (auth, admin, doctor, queue,

│   │                        #   superAdmin)

│   ├── hooks/               # feature hooks (dashboard, queue polling, …)

│   ├── i18n.js              # i18next bootstrap

│   ├── layouts/             # Admin, Doctor, Pharmacist, Public, Staff,

│   │                        #   SuperAdmin shells

│   ├── locales/             # en.json, ta.json

│   ├── pages/               # route screens, grouped by module

│   ├── routes/              # AppRoutes.jsx, RequireAuth.jsx

│   ├── services/            # apiClient, config + one service per module

│   ├── theme/tokens.js      # colour / font / spacing tokens

│   ├── utils/               # validation, date and clinic helpers

│   ├── App.jsx

│   └── main.jsx

├── test/                    # unit tests mirroring src/ (+ setup, MSW handlers)

├── e2e/                     # Playwright specs (e2e/smoke → deployed env)

├── scripts/                 # contrast check, i18n check, chip export

├── docker/                  # container entrypoint

├── nginx/                   # site config + security header templates

├── Dockerfile               # local/dev container build

├── Dockerfile.prod          # two-stage production image

└── vite.config.js, tailwind.config.js, playwright.config.js

```

### Feature modules
| Module | Route prefix | Screens |
| ------ | ------------ | ------- |
| Public portal | `/` | Home, login, forgot/reset password, booking, booking confirmation, 404, styleguide |
| Super Admin | `/super-admin` | Dashboard, user management, access control, clinic configuration, system maintenance, audit logs, reports |
| Admin | `/admin` | Dashboard, register patient, patient search/edit, book appointment, appointment hub, billing, clinic reports, knowledge base |
| Doctor | `/doctor` | Dashboard, today's schedule, consultation, patient records/details, knowledge base |
| Pharmacist | `/pharmacist` | Dashboard, dispensing queue, inventory, add/update medicine, external dispensing, reports |
| Shared | `/queue` | Live queue view for Admin, Doctor and Super Admin |

### Routing and access control
- `src/routes/AppRoutes.jsx` declares every route; `src/routes/RequireAuth.jsx` guards the staff areas.

- `src/constants/roles.js`, `permissions.js` and `routeAccess.js` define the four roles (`SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `PHARMACIST`), what each may do and where each may go.

- Each layout renders only the navigation its role may see; login redirects to that role's dashboard.

- Never hard-code role strings or route paths – import them from `src/constants/`.

## 11. Architecture Notes
### API client and interceptors
All HTTP calls go through one Axios instance, `src/services/apiClient.js`:

```js

import apiClient from "../services/apiClient";

const { data } = await apiClient.get("/patients/1");

```

- **Request interceptor** – attaches `Authorization: Bearer <token>` in one place; pass `{ skipAuth: true }` for public endpoints.

- **401** – one shared, single-flight refresh (`POST /api/auth/refresh`); concurrent callers wait on it and the original calls are retried transparently.

- **Failed refresh** (including a 401 from the refresh endpoint, or a second 401 after retry) – auth state is cleared, `onecare:session-expired` is dispatched and the user is sent to `/login?reason=session-expired`. No retry loop.

- **403 / 429 / 500** – the `{success, message, data}` envelope is surfaced on the rejected error (`error.userMessage`, `error.status`, `error.data`); the user is never logged out.

- **Proactive refresh** – `startTokenRefreshScheduler({ isUserActive })` fires ~5 minutes before expiry (`expiresIn` 1800 s) and only while the user is active, so an idle session is never extended. It is wired up by `src/features/auth/SessionManager.jsx`.

Tokens, passwords and request bodies are never logged. Module services (`authService`, `patientService`, `appointmentService`, `medicineService`, `prescriptionService`, …) must call the central client.

### Session state (Redux)
Auth state lives in `src/features/auth/authSlice.js` (`accessToken`, `refreshToken`, `expiresAt`, `role`, `redirectUrl`).

- **Store** – the single store is `src/app/store.js`; register new reducers there.

- **Write** – `store.dispatch(setSession(payload))` / `clearSession()`.

- **Read** – selectors (`selectAccessToken`, `selectIsAuthenticated`, …) via `store.getState()` in services and `useSelector` in components.

- The app is wrapped in `<Provider>` and `<PersistGate>` in `src/main.jsx`.

Only the `auth` slice is persisted (redux-persist whitelist), so a signed-in session survives reload. Everything else, including `queue`, is in memory. Do not add ad-hoc `localStorage` / `sessionStorage` calls; go through the store.

### Branding and static assets
- `public/logo.svg` – OneCare mark and browser favicon (`/logo.svg` in `index.html`).

- `public/images/home/hero-clinic.webp` – locally hosted Home hero image; keep it in the repository so production does not depend on an external host.

- `public/fonts.css` and `public/fonts/` – self-hosted fonts.

## 12. Contributing
- Branch from `develop` using `feat/<ticket-id>/<slug>` or `fix/<ticket-id>/<slug>`; open PRs against `develop`.

- Use Conventional Commits and reference the issue (`Closes #XX`).

- Every PR needs at least one approving review, passing CI.
