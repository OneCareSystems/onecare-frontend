import { http, HttpResponse } from "msw";

import {
  PERMISSION_CODES,
  PERMISSION_MATRIX,
} from "../../src/constants/permissions";
import {
  WORKING_DAYS,
  findConflictingSlots,
  isValidTime,
} from "../../src/constants/schedule";
import { ROLE_DASHBOARDS, ROLES } from "../../src/constants/roles";

/** An all-days-off week in the `{ dayOfWeek, timeSlots[] }` wire shape. */
const emptyWeek = () =>
  WORKING_DAYS.map((dayOfWeek) => ({ dayOfWeek, timeSlots: [] }));

/** FR009/UC4 — seeded from the spec example; "5" has no schedule yet. */
const defaultDoctorSchedules = () =>
  JSON.parse(
    JSON.stringify({
      4: {
        days: emptyWeek().map((day) =>
          ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(
            day.dayOfWeek,
          )
            ? {
                ...day,
                timeSlots: [
                  { start: "09:00", end: "12:00" },
                  { start: "13:00", end: "17:00" },
                ],
              }
            : day,
        ),
      },
      5: { days: emptyWeek() },
    }),
  );

/** Audit trail seed mirroring the real /api/audit-logs Page response. */
const defaultAuditLogs = () => [
  {
    logId: 2,
    userId: 1,
    username: "superadmin",
    actionType: "LOGIN",
    entityType: "AUTH",
    entityId: null,
    description: "LOGIN outcome=SUCCESS target=AuthServiceImpl.login",
    ipAddress: "0:0:0:0:0:0:0:1",
    timestamp: "2026-10-20T10:54:46",
  },
  {
    logId: 1,
    userId: 1,
    username: "superadmin",
    actionType: "TOKEN_REFRESH",
    entityType: "AUTH",
    entityId: null,
    description: "TOKEN_REFRESH outcome=SUCCESS target=AuthServiceImpl.refresh",
    ipAddress: "0:0:0:0:0:0:0:1",
    timestamp: "2026-10-20T10:52:21",
  },
];

/** FR010/UC5 — seeded backup metadata; backupId 2 is the newest. */
const defaultSystemBackups = () => [
  {
    backupId: 2,
    createdAt: "2026-10-19T10:15:30.123",
    filename: "onecare-backup-20261019T101530.backup",
    sizeBytes: 48213,
  },
  {
    backupId: 1,
    createdAt: "2026-10-12T03:00:08.902",
    filename: "onecare-backup-20261012T030008.backup",
    sizeBytes: 46880,
  },
];

/** Mock backend state seeded from the factory defaults (permissions.js). */
const defaultRolePermissions = () =>
  Object.fromEntries(
    Object.values(ROLES).map((role) => [
      role,
      PERMISSION_MATRIX.filter((entry) => entry.granted.includes(role)).map(
        (entry) => entry.code,
      ),
    ]),
  );

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
  patientErrorMode: null,
  appointmentsHits: [],
  appointmentsResponses: [],
  appointmentsErrorMode: null,
  appointmentByIdResponses: {},
  appointmentByIdHits: [],
  appointmentByIdErrorMode: null,
  appointmentUpdateHits: [],
  appointmentUpdateErrorMode: null,
  clinicalNotesHits: [],
  clinicalNotesResponses: [],
  clinicalNotesErrorMode: null,
  historyHits: [],
  historyResponses: [],
  historyErrorMode: null,
  prescriptionCreateHits: [],
  prescriptionCreateResponses: [],
  prescriptionCreateErrorMode: null,
  usersHits: [],
  usersResponses: [],
  usersErrorMode: null,
  userCreateHits: [],
  userCreateErrorMode: null,
  userEmailUpdateHits: [],
  userRoleUpdateHits: [],
  userUnlockHits: [],
  userDeactivateHits: [],
  userResetHits: [],
  userResetErrorMode: null,
  auditLogs: defaultAuditLogs(),
  auditLogsHits: [],
  auditLogsErrorMode: null,
  rolePermissions: defaultRolePermissions(),
  rolePermissionReadHits: [],
  rolePermissionWriteHits: [],
  rolePermissionsErrorMode: null,
  doctorSchedules: defaultDoctorSchedules(),
  doctorScheduleHits: [],
  doctorScheduleWriteHits: [],
  doctorScheduleErrorMode: null,
  systemBackups: defaultSystemBackups(),
  systemBackupHits: [],
  systemBackupCreateHits: [],
  systemBackupDownloadHits: [],
  systemBackupsErrorMode: null,
  systemRestoreHits: [],
  systemRestoreErrorMode: null,
  consultationFee: 75,
  consultationFeeHits: [],
  consultationFeeUpdateHits: [],
  consultationFeeErrorMode: null,
  backupSchedule: { dayOfMonth: 28, executionTime: "23:59" },
  backupScheduleHits: [],
  backupScheduleUpdateHits: [],
  backupScheduleErrorMode: null,
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
  mswState.patientErrorMode = null;
  mswState.appointmentsHits = [];
  mswState.appointmentsResponses = [];
  mswState.appointmentsErrorMode = null;
  mswState.appointmentByIdResponses = {};
  mswState.appointmentByIdHits = [];
  mswState.appointmentByIdErrorMode = null;
  mswState.appointmentUpdateHits = [];
  mswState.appointmentUpdateErrorMode = null;
  mswState.clinicalNotesHits = [];
  mswState.clinicalNotesResponses = [];
  mswState.clinicalNotesErrorMode = null;
  mswState.historyHits = [];
  mswState.historyResponses = [];
  mswState.historyErrorMode = null;
  mswState.prescriptionCreateHits = [];
  mswState.prescriptionCreateResponses = [];
  mswState.prescriptionCreateErrorMode = null;
  mswState.usersHits = [];
  mswState.usersResponses = [];
  mswState.usersErrorMode = null;
  mswState.userCreateHits = [];
  mswState.userCreateErrorMode = null;
  mswState.userEmailUpdateHits = [];
  mswState.userRoleUpdateHits = [];
  mswState.userUnlockHits = [];
  mswState.userDeactivateHits = [];
  mswState.userResetHits = [];
  mswState.userResetErrorMode = null;
  mswState.auditLogs = defaultAuditLogs();
  mswState.auditLogsHits = [];
  mswState.auditLogsErrorMode = null;
  mswState.rolePermissions = defaultRolePermissions();
  mswState.rolePermissionReadHits = [];
  mswState.rolePermissionWriteHits = [];
  mswState.rolePermissionsErrorMode = null;
  mswState.doctorSchedules = defaultDoctorSchedules();
  mswState.doctorScheduleHits = [];
  mswState.doctorScheduleWriteHits = [];
  mswState.doctorScheduleErrorMode = null;
  mswState.systemBackups = defaultSystemBackups();
  mswState.systemBackupHits = [];
  mswState.systemBackupCreateHits = [];
  mswState.systemBackupDownloadHits = [];
  mswState.systemBackupsErrorMode = null;
  mswState.systemRestoreHits = [];
  mswState.systemRestoreErrorMode = null;
  mswState.consultationFee = 75;
  mswState.consultationFeeHits = [];
  mswState.consultationFeeUpdateHits = [];
  mswState.consultationFeeErrorMode = null;
  mswState.backupSchedule = { dayOfMonth: 28, executionTime: "23:59" };
  mswState.backupScheduleHits = [];
  mswState.backupScheduleUpdateHits = [];
  mswState.backupScheduleErrorMode = null;
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
  // Single patient (doctor holds PATIENT_READ). Verified `PatientResponse`
  // shape is `patientId`/`fullName`; the legacy `id`/`name` fields are kept
  // for the apiClient integration probe that reads `data.name`.
  http.get("*/patients/:id", ({ request, params }) => {
    mswState.protectedHits.push({
      id: params.id,
      authorization: request.headers.get("Authorization"),
    });
    if (!mswState.tokenValid) return fail(401, "Access token expired");
    // Optional failure modes so callers can test best-effort enrichment
    // without tripping the 401 refresh flow.
    if (mswState.patientErrorMode === "not-found") {
      return fail(404, "Patient not found");
    }
    if (mswState.patientErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.patientErrorMode === "network-error") {
      return HttpResponse.error();
    }
    return ok({
      id: params.id,
      name: "Jane Doe",
      patientId: Number(params.id),
      fullName: "Jane Doe",
    });
  }),
  // `GET /api/appointments` returns the doctor's list; a single appointment
  // is read through the dedicated `GET /api/appointments/{id}` below.
  http.get("*/appointments", async ({ request }) => {
    mswState.appointmentsHits.push({
      url: request.url,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.appointmentsErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.appointmentsErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.appointmentsErrorMode === "delay") {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return ok(mswState.appointmentsResponses.shift() ?? []);
  }),
  // Clinical notes live on the appointment (unmerged backend branch
  // `fix/44/align-clinical-notes`): PUT accepts only { clinicalNotes }.
  http.put("*/appointments/:id", async ({ request, params }) => {
    const body = await request.json().catch(() => ({}));
    mswState.appointmentUpdateHits.push({
      id: params.id,
      body,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.appointmentUpdateErrorMode === "cancelled") {
      return fail(
        400,
        "Clinical notes cannot be added to a cancelled appointment",
      );
    }
    if (mswState.appointmentUpdateErrorMode === "forbidden") {
      return fail(403, "Access denied");
    }
    if (mswState.appointmentUpdateErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.appointmentUpdateErrorMode === "network-error") {
      return HttpResponse.error();
    }
    return ok({
      appointmentId: Number(params.id),
      status: "SCHEDULED",
      clinicalNotes: body?.clinicalNotes ?? null,
    });
  }),
  http.get("*/appointments/:id/clinical-notes", async ({ params }) => {
    mswState.clinicalNotesHits.push({ id: params.id });
    if (mswState.clinicalNotesErrorMode === "not-found") {
      return fail(404, "Appointment not found");
    }
    if (mswState.clinicalNotesErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.clinicalNotesErrorMode === "network-error") {
      return HttpResponse.error();
    }
    return ok(
      mswState.clinicalNotesResponses.shift() ?? {
        appointmentId: Number(params.id),
        patientId: null,
        doctorId: null,
        clinicalNotes: "",
      },
    );
  }),
  // `GET /appointments/{id}` — the consultation screen resolves a single
  // appointment directly. Seeded per-id through `appointmentByIdResponses`;
  // unseeded ids answer with a minimal SCHEDULED record so callers that only
  // need the id keep working.
  http.get("*/appointments/:id", async ({ request, params }) => {
    mswState.appointmentByIdHits.push({
      id: params.id,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.appointmentByIdErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.appointmentByIdErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.appointmentByIdErrorMode === "not-found") {
      return fail(404, "Appointment not found");
    }
    const stored = mswState.appointmentByIdResponses[params.id];
    if (stored) return ok(stored);
    return ok({
      appointmentId: Number(params.id),
      patientId: null,
      doctorId: null,
      appointmentDate: null,
      timeSlot: null,
      status: "SCHEDULED",
      clinicalNotes: "",
    });
  }),
  http.get("*/patients/:patientId/history", async ({ params }) => {
    mswState.historyHits.push({ patientId: params.patientId });
    if (mswState.historyErrorMode === "not-found") {
      return fail(404, "Patient not found");
    }
    if (mswState.historyErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.historyErrorMode === "network-error") {
      return HttpResponse.error();
    }
    return ok(
      mswState.historyResponses.shift() ?? {
        patient: {
          patientId: Number(params.patientId),
          fullName: `Patient ${params.patientId}`,
        },
        patientId: Number(params.patientId),
        appointments: [],
        prescriptions: [],
      },
    );
  }),
  http.post("*/prescriptions", async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    mswState.prescriptionCreateHits.push({
      body,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.prescriptionCreateErrorMode === "validation") {
      return fail(400, "Invalid prescription");
    }
    if (mswState.prescriptionCreateErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.prescriptionCreateErrorMode === "network-error") {
      return HttpResponse.error();
    }
    return ok(
      mswState.prescriptionCreateResponses.shift() ?? {
        prescriptionId: 9001,
        patientId: body?.patientId ?? null,
        doctorId: 3,
        appointmentId: body?.appointmentId ?? null,
        date: "2026-10-14",
        status: "ISSUED",
        items: body?.items ?? [],
        createdAt: "2026-10-14T09:00:00",
      },
    );
  }),
  // Super-admin user management (access governance): list, provision,
  // update email/role, unlock the failed-login lockout, admin reset and
  // deactivate. Account state (isActive + lockedUntil) is backend-
  // managed — the mutation handlers echo the accepted change only.
  http.get("*/users", ({ request }) => {
    mswState.usersHits.push({
      url: request.url,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.usersErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.usersErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    return ok(mswState.usersResponses.shift() ?? []);
  }),
  http.post("*/users", async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    mswState.userCreateHits.push({
      body,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.userCreateErrorMode === "validation") {
      return fail(400, "Username already exists");
    }
    if (mswState.userCreateErrorMode === "forbidden") {
      return fail(403, "Access denied");
    }
    if (mswState.userCreateErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    return ok({
      userId: 9001,
      ...body,
      isActive: true,
    });
  }),
  http.put("*/users/:id/role", async ({ request, params }) => {
    const body = await request.json().catch(() => ({}));
    mswState.userRoleUpdateHits.push({
      id: params.id,
      body,
      authorization: request.headers.get("Authorization"),
    });
    if (!Object.values(ROLES).includes(body?.role)) {
      return fail(400, "Unknown role");
    }
    return ok({ userId: Number(params.id), role: body.role });
  }),
  http.put("*/users/:id/unlock", ({ request, params }) => {
    mswState.userUnlockHits.push({
      id: params.id,
      authorization: request.headers.get("Authorization"),
    });
    return ok({ userId: Number(params.id), isActive: true, lockedUntil: null });
  }),
  http.put("*/users/:id", async ({ request, params }) => {
    const body = await request.json().catch(() => ({}));
    mswState.userEmailUpdateHits.push({
      id: params.id,
      body,
      authorization: request.headers.get("Authorization"),
    });
    if (typeof body?.email !== "string" || !body.email.trim()) {
      return fail(400, "Email is required");
    }
    return ok({ userId: Number(params.id), email: body.email });
  }),
  http.delete("*/users/:id", ({ request, params }) => {
    mswState.userDeactivateHits.push({
      id: params.id,
      authorization: request.headers.get("Authorization"),
    });
    return ok({ userId: Number(params.id), isActive: false });
  }),
  http.post("*/users/:id/reset-password", ({ request, params }) => {
    mswState.userResetHits.push({
      id: params.id,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.userResetErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    return ok(null, "Password reset instructions sent");
  }),
  // FR010/UC5 — system backup & restore (Super Admin, AC1/AC4). The
  // mock stores backup metadata only; downloads stream fake encrypted
  // bytes and restore mirrors the confirm-first / checksum rules.
  http.get("*/system/backups", ({ request }) => {
    mswState.systemBackupHits.push({
      url: request.url,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.systemBackupsErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.systemBackupsErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.systemBackupsErrorMode === "forbidden") {
      return fail(403, "Access denied");
    }
    return ok(
      [...mswState.systemBackups].sort((a, b) => b.backupId - a.backupId),
      "Backups retrieved successfully",
    );
  }),
  http.post("*/system/backups", ({ request }) => {
    mswState.systemBackupCreateHits.push({
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.systemBackupsErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.systemBackupsErrorMode === "forbidden") {
      return fail(403, "Access denied");
    }
    const lastId = mswState.systemBackups.reduce(
      (max, backup) => Math.max(max, backup.backupId),
      0,
    );
    const createdAt = new Date().toISOString();
    const compactStamp = createdAt.replace(/[-:]/g, "").replace(/\..+$/, "");
    const record = {
      backupId: lastId + 1,
      createdAt,
      filename: `onecare-backup-${compactStamp}.backup`,
      sizeBytes: 45000 + (lastId + 1) * 1137,
    };
    mswState.systemBackups = [record, ...mswState.systemBackups];
    return HttpResponse.json(
      {
        success: true,
        message: "Backup created successfully",
        data: record,
      },
      { status: 201 },
    );
  }),
  http.get("*/system/backups/:backupId/download", ({ request, params }) => {
    mswState.systemBackupDownloadHits.push({
      id: params.backupId,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.systemBackupsErrorMode === "forbidden") {
      return fail(403, "Access denied");
    }
    const backup = mswState.systemBackups.find(
      (item) => String(item.backupId) === String(params.backupId),
    );
    if (!backup) {
      return fail(404, "Backup not found");
    }
    return new HttpResponse(
      `MOCK-ENCRYPTED-BACKUP ${backup.filename} ${backup.sizeBytes}`,
      {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${backup.filename}"`,
        },
      },
    );
  }),
  http.post("*/system/restore", async ({ request }) => {
    const form = await request.formData().catch(() => null);
    const uploaded = form?.get("file");
    mswState.systemRestoreHits.push({
      backupId: form?.get("backupId") ?? null,
      fileName: uploaded && typeof uploaded === "object" ? uploaded.name : null,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.systemRestoreErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.systemRestoreErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.systemRestoreErrorMode === "forbidden") {
      return fail(403, "Access denied");
    }
    if (!form) {
      return fail(400, "Multipart form data required");
    }
    if (form.get("confirm") !== "true") {
      return fail(400, "Explicit confirmation required");
    }
    const backupId = form.get("backupId");
    const hasFile = Boolean(uploaded && typeof uploaded === "object");
    if (!backupId && !hasFile) {
      return fail(
        400,
        "Provide a backupId or an uploaded backup file to restore",
      );
    }
    if (backupId) {
      const known = mswState.systemBackups.some(
        (item) => String(item.backupId) === String(backupId),
      );
      if (!known) return fail(404, "Unknown backupId");
    }
    if (mswState.systemRestoreErrorMode === "corrupt") {
      return fail(400, "Checksum mismatch — the backup payload is corrupted");
    }
    return ok(
      { users: 12, patients: 340, appointments: 1250 },
      "Restore completed successfully",
    );
  }),
  // Clinic-wide consultation fee (Clinic Configuration + dashboard).
  // GET returns the active amount; PUT validates and stores a finite,
  // non-negative number. The envelope carries `{ consultationFee }`.
  http.get("*/system/settings/consultation-fee", ({ request }) => {
    mswState.consultationFeeHits.push({
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.consultationFeeErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.consultationFeeErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.consultationFeeErrorMode === "forbidden") {
      return fail(403, "Access denied");
    }
    return ok(
      { consultationFee: mswState.consultationFee },
      "Consultation fee retrieved successfully",
    );
  }),
  http.put("*/system/settings/consultation-fee", async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    mswState.consultationFeeUpdateHits.push({
      body,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.consultationFeeErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.consultationFeeErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.consultationFeeErrorMode === "forbidden") {
      return fail(403, "Access denied");
    }
    const amount = Number(body?.consultationFee);
    if (!Number.isFinite(amount) || amount < 0) {
      return fail(400, "Consultation fee must be a non-negative number");
    }
    mswState.consultationFee = amount;
    return ok(
      { consultationFee: amount },
      "Consultation fee updated successfully",
    );
  }),
  // Automatic monthly backup schedule (System Maintenance). The backend
  // owns the execution time; only the day of month is writable (1–31).
  http.get("*/system/backup/schedule", ({ request }) => {
    mswState.backupScheduleHits.push({
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.backupScheduleErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.backupScheduleErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.backupScheduleErrorMode === "forbidden") {
      return fail(403, "Access denied");
    }
    return ok(
      { ...mswState.backupSchedule },
      "Backup schedule retrieved successfully",
    );
  }),
  http.put("*/system/backup/schedule", async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    mswState.backupScheduleUpdateHits.push({
      body,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.backupScheduleErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.backupScheduleErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.backupScheduleErrorMode === "forbidden") {
      return fail(403, "Access denied");
    }
    const dayOfMonth = Number(body?.dayOfMonth);
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      return fail(400, "dayOfMonth must be an integer between 1 and 31");
    }
    mswState.backupSchedule = {
      ...mswState.backupSchedule,
      dayOfMonth,
    };
    return ok(
      { ...mswState.backupSchedule },
      "Backup schedule updated successfully",
    );
  }),
  // Audit trail — Spring `Page` contract (GET /api/audit-logs). Newest
  // first; `?page=` (0-based) and `?size=` slice the seeded trail and
  // the envelope mirrors the real pageable/total* metadata.
  http.get("*/audit-logs", ({ request }) => {
    mswState.auditLogsHits.push({
      url: request.url,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.auditLogsErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.auditLogsErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    const url = new URL(request.url);
    const requestedPage = Number(url.searchParams.get("page") ?? 0);
    const requestedSize = Number(url.searchParams.get("size") ?? 20);
    const page =
      Number.isFinite(requestedPage) && requestedPage >= 0 ? requestedPage : 0;
    const size =
      Number.isFinite(requestedSize) && requestedSize > 0 ? requestedSize : 20;
    const sorted = [...mswState.auditLogs].sort((a, b) => b.logId - a.logId);
    const totalElements = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));
    const content = sorted.slice(page * size, page * size + size);
    const pageSort = { empty: false, unsorted: false, sorted: true };
    return ok(
      {
        content,
        pageable: {
          pageNumber: page,
          pageSize: size,
          sort: pageSort,
          offset: page * size,
          unpaged: false,
          paged: true,
        },
        last: page >= totalPages - 1,
        totalPages,
        totalElements,
        size,
        number: page,
        sort: pageSort,
        numberOfElements: content.length,
        first: page === 0,
        empty: content.length === 0,
      },
      "Audit logs retrieved successfully",
    );
  }),
  // FR003/UC3 — configurable role permissions (super-admin governance).
  // PUT replaces the full set atomically: every policy rule must pass or
  // the stored set stays untouched (AC5). The mock enforces BR004-006
  // like the backend; the error mode lets tests force any single rule.
  http.get("*/roles/:role/permissions", ({ request, params }) => {
    mswState.rolePermissionReadHits.push({
      role: params.role,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.rolePermissionsErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.rolePermissionsErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (
      !(params.role in mswState.rolePermissions) ||
      mswState.rolePermissionsErrorMode === "not-found"
    ) {
      return fail(404, "Unknown role");
    }
    return ok(
      {
        role: params.role,
        permissions: [...mswState.rolePermissions[params.role]],
      },
      "Permissions retrieved successfully",
    );
  }),
  http.put("*/roles/:role/permissions", async ({ request, params }) => {
    const body = await request.json().catch(() => ({}));
    const permissions = Array.isArray(body?.permissions)
      ? body.permissions
      : null;
    mswState.rolePermissionWriteHits.push({
      role: params.role,
      permissions,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.rolePermissionsErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.rolePermissionsErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.rolePermissionsErrorMode === "forbidden") {
      return fail(403, "Access denied");
    }
    if (!(params.role in mswState.rolePermissions)) {
      return fail(404, "Unknown role");
    }
    if (!permissions) {
      return fail(400, "Request body must include a permissions array");
    }
    const unknown = permissions.filter(
      (code) => !PERMISSION_CODES.includes(code),
    );
    if (unknown.length > 0) {
      return fail(400, `Unknown permission(s): ${unknown.join(", ")}`);
    }
    if (mswState.rolePermissionsErrorMode === "br004") {
      return fail(
        422,
        "BR004: SYSTEM_BACKUP is a privileged permission that only the SUPER_ADMIN role may hold",
      );
    }
    if (mswState.rolePermissionsErrorMode === "br005") {
      return fail(
        422,
        "BR005: the SUPER_ADMIN role's own permission set cannot be modified",
      );
    }
    if (mswState.rolePermissionsErrorMode === "br006") {
      return fail(422, "BR006: a role's permission set cannot be empty");
    }
    if (params.role === ROLES.SUPER_ADMIN) {
      return fail(
        422,
        "BR005: the SUPER_ADMIN role's own permission set cannot be modified",
      );
    }
    if (permissions.length === 0) {
      return fail(422, "BR006: a role's permission set cannot be empty");
    }
    if (permissions.includes("SYSTEM_BACKUP")) {
      return fail(
        422,
        "BR004: SYSTEM_BACKUP is a privileged permission that only the SUPER_ADMIN role may hold",
      );
    }
    mswState.rolePermissions[params.role] = [...permissions];
    return ok(
      { role: params.role, permissions: [...permissions] },
      "Permissions updated successfully",
    );
  }),
  // FR009/UC4 — doctor working schedules (booking availability). The
  // wire shape is the 7-entry `days: [{ dayOfWeek, timeSlots }]` week
  // the backend returns (see doctorScheduleService.adaptDoctorScheduleResponse).
  // PUT replaces the whole schedule and mirrors the backend's atomic
  // rules: malformed HH:mm, end ≤ start, overlapping slots within a day
  // (400 "Time slot conflict" carrying data.conflictingSlots), and an
  // all-days-off week.
  http.get("*/doctors/:doctorId/schedule", ({ request, params }) => {
    mswState.doctorScheduleHits.push({
      id: params.doctorId,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.doctorScheduleErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.doctorScheduleErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.doctorScheduleErrorMode === "forbidden") {
      return fail(403, "Access denied");
    }
    const stored = mswState.doctorSchedules[params.doctorId];
    if (!stored) {
      return fail(404, "Doctor not found");
    }
    return ok(
      {
        doctorId: Number(params.doctorId),
        days: stored.days.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          timeSlots: day.timeSlots.map((slot) => ({ ...slot })),
        })),
      },
      "Schedule retrieved successfully",
    );
  }),
  http.put("*/doctors/:doctorId/schedule", async ({ request, params }) => {
    const body = await request.json().catch(() => ({}));
    mswState.doctorScheduleWriteHits.push({
      id: params.doctorId,
      body,
      authorization: request.headers.get("Authorization"),
    });
    if (mswState.doctorScheduleErrorMode === "network-error") {
      return HttpResponse.error();
    }
    if (mswState.doctorScheduleErrorMode === "server-error") {
      return fail(500, "Internal server error");
    }
    if (mswState.doctorScheduleErrorMode === "forbidden") {
      return fail(403, "Access denied");
    }
    if (!(params.doctorId in mswState.doctorSchedules)) {
      return fail(404, "Doctor not found");
    }
    const days = Array.isArray(body?.days) ? body.days : null;
    if (!days) {
      return fail(400, "days must be an array");
    }
    if (days.length !== 7) {
      return fail(400, "Provide a schedule entry for every weekday");
    }
    const seenDays = new Set();
    for (const day of days) {
      const dayOfWeek = String(day?.dayOfWeek ?? "")
        .trim()
        .toUpperCase();
      if (!dayOfWeek || seenDays.has(dayOfWeek)) {
        return fail(400, "Each weekday must appear exactly once");
      }
      seenDays.add(dayOfWeek);
      if (!Array.isArray(day.timeSlots)) {
        return fail(400, "Every weekday must have a timeSlots array");
      }
      const slots = day.timeSlots.map((slot) => ({
        start: String(slot?.start ?? ""),
        end: String(slot?.end ?? ""),
      }));
      if (
        slots.some((slot) => !isValidTime(slot.start) || !isValidTime(slot.end))
      ) {
        return fail(400, "Time slots must use HH:mm");
      }
      if (slots.some((slot) => slot.end <= slot.start)) {
        return fail(400, "A time slot must end after it starts");
      }
      const conflicts = findConflictingSlots(slots);
      if (conflicts.length > 0) {
        return HttpResponse.json(
          {
            success: false,
            message: "Time slot conflict",
            data: { conflictingSlots: conflicts },
          },
          { status: 400 },
        );
      }
    }
    if (days.every((day) => day.timeSlots.length === 0)) {
      return fail(400, "Working days and time slots cannot be empty");
    }
    mswState.doctorSchedules[params.doctorId] = {
      days: days.map((day) => ({
        dayOfWeek: String(day.dayOfWeek).trim().toUpperCase(),
        timeSlots: day.timeSlots.map((slot) => ({
          start: String(slot.start),
          end: String(slot.end),
        })),
      })),
    };
    return ok(
      {
        doctorId: Number(params.doctorId),
        days: mswState.doctorSchedules[params.doctorId].days.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          timeSlots: day.timeSlots.map((slot) => ({ ...slot })),
        })),
      },
      "Schedule saved successfully",
    );
  }),
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
