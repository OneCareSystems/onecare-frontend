import { useState } from "react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import Table from "../../components/Table";
import ErrorMessage from "../../components/ErrorMessage";
import StatusBadge from "../../components/StatusBadge";
import DispensingBilling from "../../components/Pharmacist/DispensingBilling";
import useWorkflowResource from "../../hooks/useWorkflowResource";
import { getPrescriptionsByStatus } from "../../services/prescriptionService";
import { listExternalDispensing } from "../../services/externalDispensingService";
import { mergeDispensingHistory } from "../../utils/dispensingHistory";
import { dateRangeError } from "../../utils/adminWorkflows";

const loadHistory = async ({ signal }) => {
  const [full, partial, external] = await Promise.all([
    getPrescriptionsByStatus("DISPENSED", { signal }),
    getPrescriptionsByStatus("PARTIALLY_DISPENSED", { signal }),
    listExternalDispensing({ signal }),
  ]);
  return mergeDispensingHistory([...full, ...partial], external);
};

export default function DispensingHistoryPage() {
  const [revision, setRevision] = useState(0);
  const [filters, setFilters] = useState({
    type: "",
    patientId: "",
    prescriptionId: "",
    from: "",
    to: "",
    status: "",
  });
  const history = useWorkflowResource(loadHistory, {}, revision);
  const change = (event) =>
    setFilters((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  const validation = dateRangeError(filters.from, filters.to);
  const rows = (history.data ?? []).filter((record) => {
    const date = record.dispensedAt?.slice(0, 10);
    return (
      (!filters.type || record.type === filters.type) &&
      (!filters.patientId ||
        String(record.patientId ?? "") === filters.patientId.trim()) &&
      (!filters.prescriptionId ||
        String(record.prescriptionId ?? "") ===
          filters.prescriptionId.trim()) &&
      (!filters.status || record.status === filters.status) &&
      (!filters.from || (date && date >= filters.from)) &&
      (!filters.to || (date && date <= filters.to))
    );
  });
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">
          Dispensing History
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          In-house and external medicine handovers, newest first.
        </p>
      </header>
      <section
        aria-label="History filters"
        className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Select
          name="type"
          label="Dispensing type"
          placeholder="All types"
          value={filters.type}
          onChange={change}
          options={[
            { value: "In-house", label: "In-house" },
            { value: "External", label: "External" },
          ]}
        />
        <Input
          name="patientId"
          label="Patient ID"
          value={filters.patientId}
          onChange={change}
        />
        <Input
          name="prescriptionId"
          label="Prescription ID"
          value={filters.prescriptionId}
          onChange={change}
        />
        <Select
          name="status"
          label="Status"
          placeholder="All statuses"
          value={filters.status}
          onChange={change}
          options={[
            { value: "DISPENSED", label: "Dispensed" },
            { value: "PARTIALLY_DISPENSED", label: "Partially dispensed" },
          ]}
        />
        <Input
          name="from"
          label="From date"
          type="date"
          value={filters.from}
          onChange={change}
        />
        <Input
          name="to"
          label="To date"
          type="date"
          value={filters.to}
          onChange={change}
        />
        <Button
          className="self-end justify-self-start"
          disabled={history.loading}
          onClick={() => setRevision((key) => key + 1)}
        >
          Refresh history
        </Button>
      </section>
      <ErrorMessage
        message={
          validation ||
          (history.error
            ? "Unable to load dispensing history. Check your connection and permissions, then refresh."
            : "")
        }
      />
      {history.loading && <p role="status">Loading dispensing history…</p>}
      {history.data && !validation && (
        <Table
          label="Dispensing history"
          data={rows}
          getRowKey={(record) => record.id}
          emptyTitle="No dispensing records found"
          columns={[
            {
              key: "dispensedAt",
              header: "Dispensed at",
              render: (record) =>
                record.dispensedAt?.replace("T", " ") ?? "Not recorded",
            },
            { key: "type", header: "Dispensing type" },
            {
              key: "patient",
              header: "Patient",
              render: (record) =>
                record.patientId == null
                  ? "Walk-in"
                  : `Patient ${record.patientId}`,
            },
            {
              key: "patientId",
              header: "Patient ID",
              render: (record) => record.patientId ?? "—",
            },
            {
              key: "prescriptionId",
              header: "Prescription ID",
              render: (record) => record.prescriptionId ?? "Not linked",
            },
            {
              key: "items",
              header: "Medicines",
              render: (record) =>
                record.items.map((item) => item.name).join(", ") ||
                "Not recorded",
            },
            {
              key: "quantity",
              header: "Quantity dispensed",
              render: (record) =>
                record.items.length &&
                record.items.every((item) => item.quantity != null)
                  ? record.items.reduce(
                      (total, item) => total + item.quantity,
                      0,
                    )
                  : "Not recorded",
            },
            {
              key: "status",
              header: "Status",
              render: (record) => <StatusBadge status={record.status} />,
            },
            {
              key: "billing",
              header: "Invoice / Billing",
              render: (record) =>
                (record.dispenseId != null || record.appointmentId != null) &&
                (record.items.some((item) => item.quantity > 0) ||
                  record.appointmentId != null) ? (
                  <DispensingBilling
                    key={record.id}
                    dispenseId={record.dispenseId}
                    prescriptionId={record.prescriptionId}
                    appointmentId={record.appointmentId}
                    patientId={record.patientId}
                  />
                ) : (
                  "No billing source recorded"
                ),
            },
          ]}
        />
      )}
      <p className="text-xs text-neutral-600">
        Older prescriptions may not have a recorded handover time or billing
        source. Dates filter recorded handover times only.
      </p>
    </main>
  );
}
