import { useRef, useState } from "react";
import Button from "../Button";
import ErrorMessage from "../ErrorMessage";
import Modal from "../Modal";
import InvoiceDetail from "../admin/InvoiceDetail";
import { findOrGenerateDispensingInvoice } from "../../services/adminWorkflowService";

export default function DispensingBilling({
  dispenseId,
  appointmentId,
  prescriptionId,
  patientId,
}) {
  const [pending, setPending] = useState(false);
  const [invoiceId, setInvoiceId] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const button = useRef(null);
  const bill = async () => {
    if (lock.current) return;
    if (invoiceId != null) {
      setOpen(true);
      return;
    }
    lock.current = true;
    setPending(true);
    setError("");
    try {
      const invoice = await findOrGenerateDispensingInvoice({
        dispenseId,
        appointmentId,
        prescriptionId,
        patientId,
      });
      setInvoiceId(invoice.invoiceId);
      setOpen(true);
    } catch (failure) {
      setError(
        `Dispensing is completed. Billing could not be opened: ${failure.userMessage || failure.message || "Please try again."} Retry billing here or from Dispensing History; do not repeat dispensing.`,
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  if (dispenseId == null && appointmentId == null) return null;
  return (
    <>
      <div className="space-y-2">
        <Button ref={button} size="sm" onClick={bill} loading={pending}>
          {invoiceId != null ? "View Invoice" : "View / Generate Invoice"}
        </Button>
        <ErrorMessage message={error} />
      </div>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Medicine invoice"
        trapFocus
        returnFocusRef={button}
        className="max-w-4xl max-h-[90dvh] overflow-y-auto"
      >
        {invoiceId != null && (
          <InvoiceDetail key={invoiceId} invoiceId={invoiceId} readOnly />
        )}
      </Modal>
    </>
  );
}
