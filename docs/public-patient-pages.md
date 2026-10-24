# Public patient pages (PUB-01, PUB-02, PUB-03, PUB-05, PUB-06, PUB-07)

## Backend integration

Public calls use a separate Axios client without the staff bearer-token and 401 interceptors. The backend must expose these reads and booking without staff authentication. The paths are the existing placeholders; confirm them with the backend before release.

| Request                      | Default path                                          | Response                                                                    |
| ---------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| Doctor information and hours | GET /api/doctors                                      | Array of doctors, optionally wrapped in `data` or `content`                 |
| Availability                 | GET /api/doctors/{id}/available-slots?date=YYYY-MM-DD | Array of HH:mm or HH:mm:ss strings, or objects with time/startTime/slotTime |
| Public booking               | POST /api/appointments/public                         | Booking object, optionally wrapped in `data`                                |
| Chatbot                      | POST /api/chatbot/query                               | Existing chatbot response contract                                          |

Doctor fields are id/doctorId, name/fullName (or firstName + lastName), and workingHours/hours as display text. The frontend does not invent a doctor's hours. When unavailable, it displays translated clinic contact guidance and a retry for the live section.

Booking body: firstName, lastName, phone, dateOfBirth, doctorId, date, time, reason. Names permit Tamil letters and combining marks. The shared `sriLankanPhone.js` utility accepts a leading 0 or +94 followed by nine national digits; separators are normalized before submission. Confirm this rule with the backend's validator. Dates use the clinic timezone, Asia/Colombo.

409 reloads availability and keeps patient details. 429 displays translated guidance and keeps the entire form. Staff 401 redirects never run for these requests. Backend error text is never rendered. Patient input is not logged or written to local/session storage.

Successful booking navigates using router state. A random document instance ID invalidates retained history state after refresh and sends patients back to booking with the translated confirmation-message note. No patient fields are persisted to recover a confirmation. Book another starts an empty form.

Chat errors and chips follow the explicitly selected language. A retry belongs to its original question and never inserts another user bubble. 429 disables sending, chips and retry until Retry-After expires (delta seconds or HTTP date; 30 seconds if absent/invalid).

## Clinic contacts

`VITE_CLINIC_PHONE`, `VITE_CLINIC_EMAIL`, and `VITE_CLINIC_ADDRESS` configure contacts. Development defaults are examples requested for the demo, not verified clinic details. Replace them before release. Without an address override, the example address comes from the selected translation file.

## Checks

- `npm run check:i18n`: checks EN/TA keys including nested chatbot chips and public error pages.
- `npm run test:public -- --coverage`: MSW page/API integration, unit/negative tests, and >=80% statements, branches, functions and lines per covered public source file.
- `npx playwright test e2e/public-patient.spec.js`: EN/TA at 360, 768 and 1280 px; CTA in viewport; overflow; chatbot; confirmation refresh/direct entry; empty second booking.
- `npm run lint` and `npm run build`.

CI runs all of these checks. Local machines need Playwright Chromium (`npx playwright install chromium`) or an installed browser selected with PLAYWRIGHT_CHANNEL.

Release evidence still required: backend endpoint/phone-contract agreement, review by a Tamil reader and visual glyph inspection, real clinic contacts, PR to develop, peer approval, issue-linked commits and successful remote CI. The frontend does not add SMS delivery or backend rate limiting; those remain backend responsibilities.
