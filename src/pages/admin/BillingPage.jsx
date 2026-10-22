import { useRef, useState } from "react";
import PatientSearch from "../../components/PatientSearch";
import Input from "../../components/Input";
import Select from "../../components/Select";
import Button from "../../components/Button";
import Table from "../../components/Table";
import ErrorMessage from "../../components/ErrorMessage";
import InvoiceDetail from "../../components/admin/InvoiceDetail";
import {
  WorkflowPage,
  WorkflowCard,
  WorkflowStatus,
} from "../../components/admin/WorkflowUI";
import useWorkflowResource from "../../hooks/useWorkflowResource";
import {
  generateConsultationInvoice,
  listAdminAppointments,
  listInvoices,
} from "../../services/adminWorkflowService";
import {
  dateRangeError,
  displayMoney,
  workflowError,
} from "../../utils/adminWorkflows";

export default function BillingPage() {
  const [patientId, setPatientId] = useState(""),
    [draft, setDraft] = useState({
      invoiceNumber: "",
      status: "",
      dateFrom: "",
      dateTo: "",
    });
  const [filters, setFilters] = useState({ page: 0, size: 20 }),
    [revision, setRevision] = useState(0);
  const invoices = useWorkflowResource(listInvoices, filters, revision);
  const [selectedId, setSelectedId] = useState(null),
    [error, setError] = useState(""),
    [showFallback, setShowFallback] = useState(false),
    [showPatientSearch, setShowPatientSearch] = useState(false);
  const change = ({ target: { name, value } }) =>
    setDraft((previous) => ({ ...previous, [name]: value }));
  return (
    <WorkflowPage
      title="Billing & Payments"
      subtitle="View invoices and record cash payments"
    >
      <div
        className={`grid items-start gap-4 ${selectedId ? "xl:grid-cols-[minmax(0,1fr)_24rem]" : ""}`}
      >
        <div className="print:hidden space-y-4">
          <Button
            variant="outline"
            aria-expanded={showPatientSearch}
            onClick={() => setShowPatientSearch((previous) => !previous)}
          >
            Filter by patient
          </Button>
          {showPatientSearch && (
            <PatientSearch
              actionLabel="Select"
              onSelect={(id) => {
                setPatientId(id);
                setShowPatientSearch(false);
              }}
              selectedId={patientId}
              onSearchChange={() => setPatientId("")}
            />
          )}
          {patientId && (
            <div className="flex gap-3">
              <p>Selected patient ID: {patientId}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPatientId("")}
              >
                Clear patient filter
              </Button>
            </div>
          )}
          <WorkflowCard title="Invoice history">
            <form
              className={`grid items-end gap-3 sm:grid-cols-2 ${selectedId ? "" : "lg:grid-cols-5"}`}
              onSubmit={(event) => {
                event.preventDefault();
                const validation = dateRangeError(draft.dateFrom, draft.dateTo);
                setError(validation);
                if (!validation) {
                  setSelectedId(null);
                  setFilters({ ...draft, patientId, page: 0, size: 20 });
                }
              }}
            >
              <Input
                name="invoiceNumber"
                label="Invoice number"
                value={draft.invoiceNumber}
                onChange={change}
              />
              <Select
                name="status"
                label="Invoice status"
                placeholder="All statuses"
                value={draft.status}
                onChange={change}
                options={[
                  { value: "UNPAID", label: "Pending" },
                  { value: "PAID", label: "Paid" },
                ]}
              />
              <Input
                name="dateFrom"
                label="Invoice from date"
                type="date"
                value={draft.dateFrom}
                onChange={change}
              />
              <Input
                name="dateTo"
                label="Invoice to date"
                type="date"
                value={draft.dateTo}
                onChange={change}
              />
              <Button type="submit">Find invoices</Button>
            </form>
            <p className="text-xs text-neutral-600">
              Date filters use invoice creation date, not payment date.
            </p>
          </WorkflowCard>
          <ErrorMessage
            message={
              error ||
              (invoices.error
                ? workflowError(invoices.error, "load invoices")
                : "")
            }
          />
          {invoices.loading && <p role="status">Loading invoices…</p>}
          <WorkflowCard>
            {invoices.data && (
              <Table
                label="Invoices"
                emptyTitle="No invoices found"
                data={invoices.data?.content ?? []}
                getRowKey={(invoice) => invoice.invoiceId}
                columns={[
                  { key: "invoiceNumber", header: "Invoice #" },
                  { key: "patientId", header: "Patient ID" },
                  { key: "createdAt", header: "Date" },
                  {
                    key: "total",
                    header: "Amount",
                    render: (invoice) => displayMoney(invoice.total),
                  },
                  {
                    key: "outstandingBalance",
                    header: "Outstanding",
                    render: (invoice) =>
                      displayMoney(invoice.outstandingBalance),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (invoice) => (
                      <WorkflowStatus status={invoice.status} />
                    ),
                  },
                  {
                    key: "action",
                    header: "Actions",
                    render: (invoice) => (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedId(invoice.invoiceId)}
                        aria-label={`View invoice ${invoice.invoiceNumber}`}
                      >
                        {invoice.status === "PAID" ? "View" : "View / Pay"}
                      </Button>
                    ),
                  },
                ]}
              />
            )}
            <nav
              aria-label="Invoice pages"
              className="flex items-center justify-between gap-3"
            >
              <Button
                variant="outline"
                disabled={invoices.loading || filters.page === 0}
                onClick={() =>
                  setFilters((previous) => ({
                    ...previous,
                    page: previous.page - 1,
                  }))
                }
              >
                Previous invoices
              </Button>
              <span>Page {filters.page + 1}</span>
              <Button
                variant="outline"
                disabled={
                  invoices.loading ||
                  !invoices.data ||
                  filters.page + 1 >= invoices.data.totalPages
                }
                onClick={() =>
                  setFilters((previous) => ({
                    ...previous,
                    page: previous.page + 1,
                  }))
                }
              >
                Next invoices
              </Button>
            </nav>
          </WorkflowCard>
          <Button
            variant="outline"
            onClick={() => setShowFallback((previous) => !previous)}
          >
            Find missing consultation invoice
          </Button>
          {showFallback && (
            <MissingInvoice
              onGenerated={(invoice) => {
                setSelectedId(invoice.invoiceId);
                setRevision((key) => key + 1);
              }}
            />
          )}
        </div>
        {selectedId && (
          <InvoiceDetail
            key={selectedId}
            invoiceId={selectedId}
            onUpdated={() => setRevision((key) => key + 1)}
          />
        )}
      </div>
    </WorkflowPage>
  );
}

function MissingInvoice({ onGenerated }) {
  const resource = useWorkflowResource(listAdminAppointments);
  const [selected, setSelected] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const appointments = (resource.data ?? []).filter(
    (row) => row.status === "COMPLETED",
  );
  const generate = async () => {
    if (lock.current) return;
    const appointment = appointments.find(
      (row) => String(row.appointmentId) === selected,
    );
    if (!appointment) {
      setError("Select a completed consultation.");
      return;
    }
    lock.current = true;
    setPending(true);
    setError("");
    try {
      onGenerated(await generateConsultationInvoice(appointment));
    } catch (failure) {
      setError(workflowError(failure, "find or generate the invoice"));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  return (
    <WorkflowCard title="Completed consultation invoice">
      <p>
        Consultation invoices are normally created automatically. Existing
        invoices will be opened; a missing invoice will be generated only for a
        completed consultation.
      </p>
      <ErrorMessage
        message={
          error ||
          (resource.error
            ? workflowError(resource.error, "load completed consultations")
            : "")
        }
      />
      {resource.loading && (
        <p role="status">Loading completed consultations…</p>
      )}
      <Select
        name="completed-appointment"
        label="Completed consultation"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        options={appointments.map((row) => ({
          value: String(row.appointmentId),
          label: `${row.appointmentId} · ${row.patientFullName} · ${row.appointmentDate}`,
        }))}
      />
      <Button
        loading={pending}
        disabled={resource.loading || Boolean(resource.error)}
        onClick={generate}
      >
        Find or generate invoice
      </Button>
    </WorkflowCard>
  );
}
