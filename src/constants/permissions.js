import { ROLES } from "./roles";

/**
 * CFG-03 — permission matrix (SDS §2.5.2, permission matrix Table 9).
 *
 * Frontend mirror of the backend policy classes
 * `com.onecare.backend.security.Permission` and `RolePermission`.
 * There is no access-control endpoint (and none is planned yet), so the
 * matrix lives here as static data — the Java `RolePermission` switch is
 * the source of truth: when it changes, update this file to match.
 *
 * Every permission string in `code` exists verbatim in the Java
 * `Permission` class; `granted` mirrors exactly which roles
 * `RolePermission.getPermissions(role)` returns it for. Permissions
 * defined but granted to no role (USER_READ_OWN, AUDIT_READ,
 * REPORT_GENERATE) stay visible so the matrix never hides a scope.
 */

/** Human-readable domains, in display order. */
export const PERMISSION_CATEGORIES = Object.freeze([
  "Clinical EMR",
  "Pharmacy & Dispensary",
  "Financial & Billing",
  "Security & Infrastructure",
]);

/**
 * One entry per `Permission` constant.
 * `granted` lists the roles `RolePermission` hands the scope to.
 */
export const PERMISSION_MATRIX = Object.freeze([
  // — Clinical EMR — patients ——————————————————————————————————
  Object.freeze({
    code: "PATIENT_CREATE",
    category: "Clinical EMR",
    name: "Register new patients",
    description: "Create patient identities with demographics and contacts",
    granted: Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR]),
  }),
  Object.freeze({
    code: "PATIENT_READ_ALL",
    category: "Clinical EMR",
    name: "View every patient record",
    description:
      "Read any patient chart, history and diagnosis record clinic-wide",
    granted: Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR]),
  }),
  Object.freeze({
    code: "PATIENT_READ",
    category: "Clinical EMR",
    name: "View assigned patient record",
    description: "Read a single patient chart the principal is linked to",
    granted: Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR]),
  }),
  Object.freeze({
    code: "PATIENT_UPDATE",
    category: "Clinical EMR",
    name: "Amend patient records",
    description: "Edit demographics, vitals and medical history entries",
    granted: Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR]),
  }),
  Object.freeze({
    code: "PATIENT_DELETE",
    category: "Clinical EMR",
    name: "Delete patient records",
    description: "Permanently remove a patient identity from the EMR",
    granted: Object.freeze([ROLES.SUPER_ADMIN]),
  }),

  // — Clinical EMR — appointments ——————————————————————————————
  Object.freeze({
    code: "APPOINTMENT_CREATE",
    category: "Clinical EMR",
    name: "Book appointments",
    description: "Schedule new consultations and reserve time slots",
    granted: Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR]),
  }),
  Object.freeze({
    code: "APPOINTMENT_READ_ALL",
    category: "Clinical EMR",
    name: "View all appointments",
    description: "Read the schedule of every clinician across the clinic",
    granted: Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR]),
  }),
  Object.freeze({
    code: "APPOINTMENT_READ",
    category: "Clinical EMR",
    name: "View appointment details",
    description: "Read a single appointment record and its queue state",
    granted: Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR]),
  }),
  Object.freeze({
    code: "APPOINTMENT_UPDATE",
    category: "Clinical EMR",
    name: "Reschedule appointments",
    description: "Move, confirm or cancel existing bookings",
    granted: Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DOCTOR]),
  }),
  Object.freeze({
    code: "APPOINTMENT_READ_CLINICAL_NOTES",
    category: "Clinical EMR",
    name: "Read consultation clinical notes",
    description:
      "Open the PHI consultation notes attached to an appointment",
    granted: Object.freeze([ROLES.DOCTOR, ROLES.PHARMACIST]),
  }),
  Object.freeze({
    code: "APPOINTMENT_WRITE_CLINICAL_NOTES",
    category: "Clinical EMR",
    name: "Write consultation clinical notes",
    description: "Author and amend clinical notes during consultations",
    granted: Object.freeze([ROLES.DOCTOR]),
  }),

  // — Pharmacy & Dispensary — medicines ——————————————————————————
  Object.freeze({
    code: "MEDICINE_CREATE",
    category: "Pharmacy & Dispensary",
    name: "Add medicine to formulary",
    description: "Register new drugs with dosage and interaction data",
    granted: Object.freeze([
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.PHARMACIST,
    ]),
  }),
  Object.freeze({
    code: "MEDICINE_READ_ALL",
    category: "Pharmacy & Dispensary",
    name: "View full medicine catalog",
    description: "Browse the entire formulary including stock levels",
    granted: Object.freeze([
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.PHARMACIST,
    ]),
  }),
  Object.freeze({
    code: "MEDICINE_READ",
    category: "Pharmacy & Dispensary",
    name: "View medicine details",
    description: "Read one drug record, its lots and expiry data",
    granted: Object.freeze([
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.PHARMACIST,
    ]),
  }),
  Object.freeze({
    code: "MEDICINE_UPDATE",
    category: "Pharmacy & Dispensary",
    name: "Update medicine details",
    description: "Edit pricing, strength, storage and reorder thresholds",
    granted: Object.freeze([
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.PHARMACIST,
    ]),
  }),
  Object.freeze({
    code: "MEDICINE_DELETE",
    category: "Pharmacy & Dispensary",
    name: "Remove medicine from formulary",
    description: "Retire a drug and log expired or recalled lots",
    granted: Object.freeze([ROLES.SUPER_ADMIN, ROLES.PHARMACIST]),
  }),

  // — Pharmacy & Dispensary — prescriptions ————————————————————————
  Object.freeze({
    code: "PRESCRIPTION_CREATE",
    category: "Pharmacy & Dispensary",
    name: "Issue e-prescriptions",
    description: "Sign and transmit legal e-prescriptions to the queue",
    granted: Object.freeze([ROLES.DOCTOR]),
  }),
  Object.freeze({
    code: "PRESCRIPTION_READ_ALL",
    category: "Pharmacy & Dispensary",
    name: "View all prescriptions",
    description: "Read every prescription issued across the clinic",
    granted: Object.freeze([
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.DOCTOR,
      ROLES.PHARMACIST,
    ]),
  }),
  Object.freeze({
    code: "PRESCRIPTION_READ",
    category: "Pharmacy & Dispensary",
    name: "View prescription details",
    description: "Read a single prescription and its dispense history",
    granted: Object.freeze([
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.DOCTOR,
      ROLES.PHARMACIST,
    ]),
  }),
  Object.freeze({
    code: "PRESCRIPTION_UPDATE",
    category: "Pharmacy & Dispensary",
    name: "Amend prescriptions",
    description: "Change dosage lines before the prescription is dispensed",
    granted: Object.freeze([ROLES.DOCTOR]),
  }),
  Object.freeze({
    code: "PRESCRIPTION_DISPENSE",
    category: "Pharmacy & Dispensary",
    name: "Verify & dispense medications",
    description:
      "Run interaction checks, label bottles and deduct inventory",
    granted: Object.freeze([ROLES.PHARMACIST]),
  }),
  Object.freeze({
    code: "PRESCRIPTION_STATUS_UPDATE",
    category: "Pharmacy & Dispensary",
    name: "Update prescription status",
    description: "Mark prescriptions pending, dispensed or rejected",
    granted: Object.freeze([ROLES.ADMIN, ROLES.PHARMACIST]),
  }),

  // — Financial & Billing ————————————————————————————————————
  Object.freeze({
    code: "INVOICE_CREATE",
    category: "Financial & Billing",
    name: "Create invoices",
    description: "Raise invoices for consultations, drugs and procedures",
    granted: Object.freeze([
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.PHARMACIST,
    ]),
  }),
  Object.freeze({
    code: "INVOICE_READ",
    category: "Financial & Billing",
    name: "View invoices",
    description: "Read invoice lines, payment status and AR balances",
    granted: Object.freeze([
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.PHARMACIST,
    ]),
  }),
  Object.freeze({
    code: "INVOICE_UPDATE",
    category: "Financial & Billing",
    name: "Edit invoices",
    description: "Adjust line items, apply discounts and void invoices",
    granted: Object.freeze([
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.PHARMACIST,
    ]),
  }),
  Object.freeze({
    code: "INVOICE_PAY",
    category: "Financial & Billing",
    name: "Take payments",
    description: "Collect cash/card tenders and adjudicate insurance claims",
    granted: Object.freeze([
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.PHARMACIST,
    ]),
  }),

  // — Security & Infrastructure — users ————————————————————————————
  Object.freeze({
    code: "USER_CREATE",
    category: "Security & Infrastructure",
    name: "Create staff accounts",
    description: "Provision staff identity credentials and usernames",
    granted: Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  }),
  Object.freeze({
    code: "USER_READ_ALL",
    category: "Security & Infrastructure",
    name: "View all staff accounts",
    description: "List every staff identity, role and account status",
    granted: Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  }),
  Object.freeze({
    code: "USER_READ_OWN",
    category: "Security & Infrastructure",
    name: "View own staff profile",
    description:
      "Read your own account record (defined, granted to no role yet)",
    granted: Object.freeze([]),
  }),
  Object.freeze({
    code: "USER_UPDATE",
    category: "Security & Infrastructure",
    name: "Edit staff accounts",
    description: "Change contact details, departments and account status",
    granted: Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  }),
  Object.freeze({
    code: "USER_DELETE",
    category: "Security & Infrastructure",
    name: "Delete staff accounts",
    description: "Permanently remove a staff identity and its credentials",
    granted: Object.freeze([ROLES.SUPER_ADMIN]),
  }),
  Object.freeze({
    code: "USER_ROLE_ASSIGN",
    category: "Security & Infrastructure",
    name: "Assign role clearance",
    description: "Grant or demote RBAC role groups across the clinic",
    granted: Object.freeze([ROLES.SUPER_ADMIN]),
  }),

  // — Security & Infrastructure — audit & reporting ————————————————
  Object.freeze({
    code: "AUDIT_READ",
    category: "Security & Infrastructure",
    name: "Read own audit activity",
    description:
      "Review audit entries of your own actions (granted to no role yet)",
    granted: Object.freeze([]),
  }),
  Object.freeze({
    code: "AUDIT_READ_ALL",
    category: "Security & Infrastructure",
    name: "Read full audit trail",
    description: "Open the immutable security trail for every principal",
    granted: Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  }),
  Object.freeze({
    code: "REPORT_GENERATE",
    category: "Security & Infrastructure",
    name: "Generate reports",
    description:
      "Compile scheduled exports (defined, granted to no role yet)",
    granted: Object.freeze([]),
  }),
]);

/** Every permission code, for validation and tests. */
export const PERMISSION_CODES = Object.freeze(
  PERMISSION_MATRIX.map((entry) => entry.code),
);

/** True when `role` holds `code` in the static backend mirror. */
export const hasPermission = (granted, role) =>
  Array.isArray(granted) && granted.includes(role);
