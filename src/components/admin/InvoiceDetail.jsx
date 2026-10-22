import { useRef, useState } from "react";
import "../../styles/invoice-print.css";
import Button from "../Button";
import Input from "../Input";
import Table from "../Table";
import ErrorMessage from "../ErrorMessage";
import ConfirmDialog from "../ConfirmDialog";
import { WorkflowCard, WorkflowStatus } from "./WorkflowUI";
import useWorkflowResource from "../../hooks/useWorkflowResource";
import {
  correctInvoice,
  getInvoice,
  payInvoice,
} from "../../services/adminWorkflowService";
import {
  displayMoney,
  moneyCents,
  paymentError,
  workflowError,
} from "../../utils/adminWorkflows";

const loadInvoice = ({ id, signal }) => getInvoice(id, { signal });
function InvoiceEditor({ invoice, onChanged, onRecover, busy }) {
  const [quantities, setQuantities] = useState({}),
    [amount, setAmount] = useState("");
  const [confirm, setConfirm] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const medicineLines = invoice.items.filter(
    (item) => item.medicineId !== null,
  );
  const paid = invoice.status === "PAID";
  const execute = async (kind) => {
    if (lock.current || paid || busy) return;
    let items;
    if (kind === "payment") {
      const validation = paymentError(amount, invoice.outstandingBalance);
      if (validation) {
        setError(validation);
        setConfirm(false);
        return;
      }
    } else {
      items = medicineLines.map((item) => ({
        invoiceItemId: item.invoiceItemId,
        quantity: quantities[item.invoiceItemId] ?? String(item.quantity),
      }));
      if (
        items.some(
          (item) =>
            !/^[1-9]\d*$/.test(item.quantity) ||
            BigInt(item.quantity) > 2147483647n,
        )
      ) {
        setError(
          "Medicine quantities must be positive whole numbers (maximum 2147483647).",
        );
        return;
      }
      items = items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
      }));
    }
    lock.current = true;
    setPending(true);
    setError("");
    try {
      const result =
        kind === "payment"
          ? await payInvoice(invoice.invoiceId, amount)
          : await correctInvoice(invoice.invoiceId, items);
      setAmount("");
      setQuantities({});
      onChanged(
        result,
        kind === "payment"
          ? "Cash payment recorded."
          : "Invoice quantities updated.",
      );
    } catch (failure) {
      const status = failure.status ?? failure.response?.status;
      setError(
        kind === "payment" &&
          (status == null || status === 409 || status >= 500)
          ? "Payment could not be confirmed. Review the refreshed payment history and outstanding balance before recording another payment."
          : workflowError(
              failure,
              kind === "payment"
                ? "record cash payment"
                : "correct invoice quantities",
            ),
      );
      onRecover();
    } finally {
      lock.current = false;
      setPending(false);
      setConfirm(false);
    }
  };
  return (
    <div className="space-y-4">
      <ErrorMessage message={error} />
      <fieldset disabled={pending || busy || paid} className="space-y-4">
        <legend className="sr-only">
          Invoice adjustments and cash payment
        </legend>
        {!paid && medicineLines.length > 0 && (
          <WorkflowCard title="Correct medicine quantities">
            {medicineLines.map((item) => (
              <Input
                key={item.invoiceItemId}
                name={`quantity-${item.invoiceItemId}`}
                label={`Quantity — ${item.description}`}
                type="text"
                inputMode="numeric"
                value={quantities[item.invoiceItemId] ?? String(item.quantity)}
                onChange={(event) =>
                  setQuantities((previous) => ({
                    ...previous,
                    [item.invoiceItemId]: event.target.value,
                  }))
                }
              />
            ))}
            <p className="text-xs">
              All existing medicine lines are retained. Consultation charges and
              prices are managed by the clinic.
            </p>
            <Button
              variant="outline"
              loading={pending}
              onClick={() => execute("quantities")}
            >
              Save medicine quantities
            </Button>
          </WorkflowCard>
        )}
        {!paid && moneyCents(invoice.outstandingBalance) > 0n && (
          <WorkflowCard title="Record Payment">
            <p>
              Payment method: <strong>CASH</strong>
            </p>
            <p>Amount due: {displayMoney(invoice.outstandingBalance)}</p>
            <Input
              name="cash-amount"
              label="Cash amount (LKR)"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            {medicineLines.length > 0 && (
              <p className="text-sm text-warning-900">
                Recording payment does not confirm medicine collection. Check
                with the pharmacy when needed.
              </p>
            )}
            <Button
              onClick={() => {
                const validation = paymentError(
                  amount,
                  invoice.outstandingBalance,
                );
                setError(validation);
                if (!validation) setConfirm(true);
              }}
            >
              Review cash payment
            </Button>
          </WorkflowCard>
        )}
      </fieldset>
      {paid && (
        <p role="status">Paid invoice: line items and payments are locked.</p>
      )}
      {!paid && moneyCents(invoice.outstandingBalance) === 0n && (
        <p role="status">
          No balance is due. The backend still reports Pending; no further
          payment can be recorded.
        </p>
      )}
      <ConfirmDialog
        isOpen={confirm}
        title="Record cash payment?"
        message={`Record LKR ${amount} for invoice ${invoice.invoiceNumber}?`}
        confirmLabel="Record cash payment"
        variant="primary"
        loading={pending}
        onConfirm={() => execute("payment")}
        onClose={() => {
          if (!pending) setConfirm(false);
        }}
      />
    </div>
  );
}

export default function InvoiceDetail({ invoiceId, onUpdated }) {
  const [revision, setRevision] = useState(0),
    [confirmed, setConfirmed] = useState(null),
    [message, setMessage] = useState("");
  const resource = useWorkflowResource(
    loadInvoice,
    { id: invoiceId },
    revision,
  );
  const invoice = confirmed ?? resource.data;
  const recover = () => {
    setConfirmed(null);
    setRevision((key) => key + 1);
  };
  return (
    <WorkflowCard title="Invoice details">
      {resource.loading && <p role="status">Loading invoice details…</p>}
      <ErrorMessage
        message={
          resource.error
            ? workflowError(resource.error, "load invoice details")
            : ""
        }
      />
      {resource.error && !invoice && (
        <Button variant="outline" onClick={recover}>
          Retry invoice
        </Button>
      )}
      {message && <p role="status">{message}</p>}
      {invoice && (
        <>
          <div id="invoice-print" className="space-y-3">
            <h3 className="font-bold">{invoice.invoiceNumber}</h3>
            <p>
              {invoice.createdAt} · Patient ID:{" "}
              {invoice.patientId ?? "Not recorded"} · Appointment ID:{" "}
              {invoice.appointmentId ?? "—"}
            </p>
            <WorkflowStatus status={invoice.status} />
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt>Total</dt>
                <dd>{displayMoney(invoice.total)}</dd>
              </div>
              <div>
                <dt>Amount paid</dt>
                <dd>{displayMoney(invoice.amountPaid)}</dd>
              </div>
              <div>
                <dt>Outstanding balance</dt>
                <dd>{displayMoney(invoice.outstandingBalance)}</dd>
              </div>
            </dl>
            <Table
              label="Invoice line items"
              data={invoice.items}
              getRowKey={(item) => item.invoiceItemId}
              columns={[
                { key: "description", header: "Description" },
                { key: "quantity", header: "Quantity" },
                {
                  key: "unitPrice",
                  header: "Unit price",
                  render: (item) => displayMoney(item.unitPrice),
                },
                {
                  key: "lineTotal",
                  header: "Line total",
                  render: (item) => displayMoney(item.lineTotal),
                },
              ]}
            />
            <Table
              label="Payment history"
              emptyTitle="No payments recorded"
              data={invoice.payments}
              getRowKey={(payment) => payment.paymentId}
              columns={[
                { key: "paymentId", header: "Payment ID" },
                { key: "paidAt", header: "Paid at" },
                {
                  key: "amount",
                  header: "Amount",
                  render: (payment) => displayMoney(payment.amount),
                },
                { key: "paymentMethod", header: "Method" },
              ]}
            />
          </div>
          <div className="flex gap-3 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              Print invoice
            </Button>
            <Button
              variant="outline"
              disabled={resource.loading}
              onClick={recover}
            >
              Refresh invoice
            </Button>
          </div>
          <div className="print:hidden">
            <InvoiceEditor
              invoice={invoice}
              busy={resource.loading || Boolean(resource.error)}
              onRecover={recover}
              onChanged={(result, text) => {
                setConfirmed(result);
                setMessage(text);
                onUpdated?.();
              }}
            />
          </div>
        </>
      )}
    </WorkflowCard>
  );
}
