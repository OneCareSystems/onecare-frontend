export const appointment = (changes = {}) => ({
  appointmentId: 201,
  patientId: 101,
  patientFullName: "Example Patient",
  doctorId: 301,
  appointmentDate: "2090-01-15",
  timeSlot: "16:00:00",
  status: "SCHEDULED",
  queuePosition: 1,
  clinicalNotes: "CLINICAL_SECRET",
  reason: "PRIVATE_REASON",
  ...changes,
});
export const invoice = (changes = {}) => ({
  invoiceId: 401,
  invoiceNumber: "INV-2090-000401",
  patientId: 101,
  appointmentId: 201,
  dispenseId: null,
  status: "UNPAID",
  total: "1000.00",
  amountPaid: "0.00",
  outstandingBalance: "1000.00",
  createdAt: "2090-01-15T16:00:00",
  items: [
    {
      invoiceItemId: 501,
      medicineId: null,
      description: "Consultation charge",
      quantity: 1,
      unitPrice: "500.00",
      lineTotal: "500.00",
    },
    {
      invoiceItemId: 502,
      medicineId: 601,
      description: "Example medicine",
      quantity: 5,
      unitPrice: "100.00",
      lineTotal: "500.00",
    },
  ],
  payments: [],
  clinicalNotes: "CLINICAL_SECRET",
  ...changes,
});
export const pageOf = (content, changes = {}) => ({
  content,
  number: 0,
  totalPages: 1,
  last: true,
  ...changes,
});
export const doctorPage = () =>
  pageOf([
    { userId: 301, username: "Example Doctor", role: "DOCTOR", isActive: true },
  ]);
