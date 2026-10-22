import apiClient from "./apiClient";
import {
  APPOINTMENT_STATUSES,
  decimalMoney,
  parseInvoiceJson,
  positiveId,
} from "../utils/adminWorkflows";

const unwrap = (response) => {
  if (response.data?.success !== true || response.data.data == null)
    throw new Error("Unexpected API response");
  return response.data.data;
};
export function appointmentView(raw) {
  positiveId(raw?.appointmentId);
  if (!APPOINTMENT_STATUSES.includes(raw.status))
    throw new Error("Unexpected appointment status");
  return {
    appointmentId: raw.appointmentId,
    patientId: raw.patientId,
    doctorId: raw.doctorId,
    patientFullName:
      typeof raw.patientFullName === "string"
        ? raw.patientFullName
        : `Patient ${raw.patientId}`,
    appointmentDate: String(raw.appointmentDate ?? ""),
    timeSlot: String(raw.timeSlot ?? ""),
    status: raw.status,
    queuePosition:
      Number.isInteger(raw.queuePosition) && raw.queuePosition > 0
        ? raw.queuePosition
        : null,
  };
}
const appointments = (raw) => {
  if (!Array.isArray(raw)) throw new Error("Unexpected appointment list");
  return raw.map(appointmentView);
};
export async function listDoctors({ signal } = {}) {
  const doctors = new Map();
  for (let page = 0; page < 1000; page++) {
    const data = unwrap(
      await apiClient.get("/users", { params: { page, size: 100 }, signal }),
    );
    if (
      !Array.isArray(data.content) ||
      !Number.isInteger(data.totalPages) ||
      data.totalPages < 0
    )
      throw new Error("Unexpected doctor directory page");
    for (const user of data.content) {
      if (user.role !== "DOCTOR" || user.isActive !== true) continue;
      const id = positiveId(user.userId);
      doctors.set(id, {
        userId: id,
        username:
          typeof user.username === "string" ? user.username : `Doctor ${id}`,
      });
    }
    if (data.last === true || page + 1 >= data.totalPages)
      return [...doctors.values()];
  }
  throw new Error("Doctor directory pagination exceeded limit");
}
export async function availableSlots(doctorId, date, { signal } = {}) {
  const data = unwrap(
    await apiClient.get("/appointments/available-slots", {
      params: { doctorId: positiveId(doctorId), date },
      signal,
    }),
  );
  if (
    !Array.isArray(data) ||
    data.some((s) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(s))
  )
    throw new Error("Unexpected available slots");
  return [...new Set(data)];
}
export async function bookAppointment(values) {
  const body = `{"doctorId":${positiveId(values.doctorId)},"patientId":${positiveId(values.patientId)},"appointmentDateTime":${JSON.stringify(`${values.date}T${values.slot}:00`)},"reason":${JSON.stringify(values.reason || null)}}`;
  return appointmentView(unwrap(await apiClient.post("/appointments", body)));
}
export async function listAdminAppointments({ signal, ...filters } = {}) {
  const params = Object.fromEntries(
    ["date", "from", "to", "search"]
      .filter((k) => filters[k])
      .map((k) => [k, filters[k]]),
  );
  return appointments(
    unwrap(await apiClient.get("/appointments", { params, signal })),
  );
}
export async function rescheduleAppointment(id, date, slot) {
  return appointmentView(
    unwrap(
      await apiClient.put(`/appointments/${positiveId(id)}`, {
        appointmentDateTime: `${date}T${slot}:00`,
      }),
    ),
  );
}
export async function cancelAppointment(id) {
  return appointmentView(
    unwrap(await apiClient.patch(`/appointments/${positiveId(id)}/cancel`)),
  );
}
export async function adminQueue({ signal } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  try {
    const [queue, today] = await Promise.all([
      apiClient.get("/queue/today", { signal: controller.signal }),
      apiClient.get("/appointments/today", { signal: controller.signal }),
    ]);
    // /queue/today excludes NO_SHOW; use the documented server-today list for that tab.
    const rows = appointments(unwrap(queue));
    const ids = new Set(rows.map((row) => String(row.appointmentId)));
    return [
      ...rows,
      ...appointments(unwrap(today))
        .filter(
          (row) =>
            row.status === "NO_SHOW" && !ids.has(String(row.appointmentId)),
        )
        .map((row) => ({ ...row, queuePosition: null })),
    ];
  } catch (error) {
    // A rejected GET must also stop its sibling before another poll starts.
    abort();
    throw error;
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}
export async function updateAdminQueue(id, status) {
  if (!["ARRIVED", "NO_SHOW"].includes(status))
    throw new Error("Unsupported Admin queue action");
  return appointmentView(
    unwrap(
      await apiClient.patch(`/queue/${positiveId(id)}/status`, { status }),
    ),
  );
}

const invoiceConfig = { transformResponse: [parseInvoiceJson] };
export function invoiceView(raw, detail = false) {
  positiveId(raw?.invoiceId);
  if (!["UNPAID", "PAID"].includes(raw.status))
    throw new Error("Unexpected invoice status");
  const result = {
    invoiceId: raw.invoiceId,
    invoiceNumber: String(raw.invoiceNumber),
    patientId: raw.patientId ?? null,
    appointmentId: raw.appointmentId ?? null,
    dispenseId: raw.dispenseId ?? null,
    status: raw.status,
    total: decimalMoney(raw.total),
    amountPaid: decimalMoney(raw.amountPaid),
    outstandingBalance: decimalMoney(raw.outstandingBalance),
    createdAt: String(raw.createdAt ?? ""),
  };
  if (detail) {
    if (!Array.isArray(raw.items) || !Array.isArray(raw.payments))
      throw new Error("Unexpected invoice detail");
    result.items = raw.items.map((item) => ({
      invoiceItemId: item.invoiceItemId,
      medicineId: item.medicineId ?? null,
      description: String(item.description ?? ""),
      quantity: item.quantity,
      unitPrice: decimalMoney(item.unitPrice),
      lineTotal: decimalMoney(item.lineTotal),
    }));
    result.payments = raw.payments.map((payment) => ({
      paymentId: payment.paymentId,
      amount: decimalMoney(payment.amount),
      paymentMethod: String(payment.paymentMethod),
      paidAt: String(payment.paidAt ?? ""),
    }));
  }
  return result;
}
export async function listInvoices({ signal, ...filters } = {}) {
  const params = Object.fromEntries(
    [
      "patientId",
      "invoiceNumber",
      "status",
      "dateFrom",
      "dateTo",
      "page",
      "size",
    ]
      .filter((k) => filters[k] !== undefined && filters[k] !== "")
      .map((k) => [k, filters[k]]),
  );
  const data = unwrap(
    await apiClient.get("/invoices", { ...invoiceConfig, params, signal }),
  );
  if (
    !Array.isArray(data.content) ||
    !Number.isInteger(data.totalPages) ||
    !Number.isInteger(data.number)
  )
    throw new Error("Unexpected invoice page");
  return {
    content: data.content.map((raw) => invoiceView(raw)),
    number: data.number,
    totalPages: data.totalPages,
  };
}
export async function getInvoice(id, { signal } = {}) {
  return invoiceView(
    unwrap(
      await apiClient.get(`/invoices/${positiveId(id)}`, {
        ...invoiceConfig,
        signal,
      }),
    ),
    true,
  );
}
export async function generateConsultationInvoice(appointment) {
  if (appointment.status !== "COMPLETED")
    throw new Error("Consultation must be completed");
  // Do not create a second invoice when the Doctor already generated one.
  for (let page = 0; page < 1000; page++) {
    const data = await listInvoices({
      patientId: positiveId(appointment.patientId),
      page,
      size: 100,
    });
    const existing = data.content.find(
      (invoice) =>
        String(invoice.appointmentId) === String(appointment.appointmentId),
    );
    if (existing) return getInvoice(existing.invoiceId);
    if (page + 1 >= data.totalPages)
      return invoiceView(
        unwrap(
          await apiClient.post(
            "/invoices",
            `{"appointmentId":${positiveId(appointment.appointmentId)}}`,
            invoiceConfig,
          ),
        ),
        true,
      );
  }
  throw new Error("Invoice pagination exceeded limit");
}
export async function correctInvoice(id, items) {
  const body = {
    items: items.map((item) => ({
      invoiceItemId: item.invoiceItemId,
      quantity: item.quantity,
    })),
  };
  return invoiceView(
    unwrap(
      await apiClient.put(`/invoices/${positiveId(id)}`, body, invoiceConfig),
    ),
    true,
  );
}
export async function payInvoice(id, amount) {
  const body = `{"amount":${decimalMoney(amount)},"paymentMethod":"CASH"}`;
  return invoiceView(
    unwrap(
      await apiClient.post(
        `/invoices/${positiveId(id)}/payments`,
        body,
        invoiceConfig,
      ),
    ),
    true,
  );
}
