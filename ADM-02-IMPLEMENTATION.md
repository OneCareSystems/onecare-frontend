# ADM-02 — Register Patient

Implemented against the supplied ADM-02 and common authentication contracts inspected 2026-10-18. No backend repository or live backend was available.

## Scope and routes

- `/admin/register-patient` and `/super-admin/register-patient` use the existing `RequireAuth` guard with ADMIN/SUPER_ADMIN access only.
- Each admin role has a Register Patient sidebar entry. Other role permissions are unchanged.
- The registration-only layout reuses Sidebar, TopBar, Input, Select, Button, the icon registry, and Tailwind theme tokens. Other page layouts are unchanged.
- The screenshot supplies the blue navigation, pale background, card, two-column desktop form, and opposite-end Reset/Save buttons. Mobile uses one column and horizontal navigation.
- Full Name replaces screenshot first/last fields because the backend accepts `full_name` only and name whitespace affects duplicate detection. Gender is optional. Optional Email is included; blood group is excluded as clinical data.
- Screenshot search, booking, appointment, billing, and reports links were not added: those screens are not implemented in this repository. This subtask does not introduce dummy links or other Admin workflows. Existing dashboard, registration, queue, and logout remain available.

## API

`createPatient` uses the existing authenticated Axios client to POST `/patients` relative to `VITE_API_BASE_URL`, which must include `/api` (see `.env.example`). The resulting endpoint is `POST /api/patients`.

Only `full_name`, `dateOfBirth`, `contactNo`, `address`, `email`, and `gender` are sent. Blank optional fields become null. Name and phone are not normalized on the client; server phone normalization and duplicate behavior remain authoritative. The result adapter retains only patient ID, full name, and duplicateSuspected. No clinical data is displayed, logged, or persisted by this workflow.

The existing client supplies bearer authentication, refresh, and session-expiry handling. Validation follows required fields and length limits, date validity, email shape, and enum values. There is no phone format, age, or future-DOB restriction. Backend field-validation errors appear inline without clearing input. Unexpected raw backend errors are not rendered.

201 with duplicateSuspected=true is still a successful save. The confirmation shows the generated ID and warns against registering again. Successful forms cannot resubmit; users can explicitly register another patient. Save, Reset, and inputs are disabled during submission, with an additional in-flight guard. Uncertain network/server outcomes advise checking the records before another submission because idempotency is unavailable.

## Verification

- Added contract validation unit tests, authenticated service tests, route/form/API integration tests, and Playwright checks at 360px and 1280px.
- Ten dependency-free Node validation smoke checks passed: required fields, field lengths, invalid dates, leap date, optional fields, synthetic phone, future DOB, email and gender.
- `git diff --check` passed.
- Vitest, build, lint, formatting, and Playwright execution remain unverified. The checkout lacked usable dependency executables. `npm ci --no-audit --no-fund` failed with ENOSPC (no space left on device); the resulting dependency tree is incomplete.
- After disk space is available, run `npm ci`, `npx vitest run test/pages/admin test/services/patientRegistration.test.js test/services/patientService.test.js test/routes/navigation.test.js test/routes/appRoutes.integration.test.jsx`, `npm run lint`, `npm run build`, and `npx playwright test e2e/adm02-register-patient.spec.js`. Playwright requires its Chromium installation.

## Acceptance status and dependencies

Repository inspection, scoped implementation, documented endpoint integration, validation, loading/success/error states, input preservation, duplicate/shared-phone behavior, role restriction, and clinical-field omission are implemented. Unit/integration/browser tests are authored; their full execution and browser visual comparison are blocked by the environment. Live backend integration is unverified.

Continue booking is unavailable until an actual booking screen and its handoff contract exist; no route is invented here. Backend gaps remain: no duplicate preflight/candidate API, no idempotency, no stricter phone/DOB checks, and PatientResponse still includes bloodGroup. Frontend omission does not fix that backend exposure. Deployment requires the real backend base URL, configured CORS origin, database, and provisioned authenticated user. A separate formal acceptance checklist was not supplied.
