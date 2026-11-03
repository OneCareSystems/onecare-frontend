import StatusBadge from "../StatusBadge";
import { statusLabel } from "../../utils/adminWorkflows";

export function WorkflowPage({ title, subtitle, children }) {
  return (
    <section className="min-w-0 space-y-4" aria-label={title}>
      <div>
        <h1 className="text-xl font-bold text-primary-950">{title}</h1>
        <p className="text-sm text-primary-800">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
export function WorkflowCard({ title, children, className = "" }) {
  return (
    <section
      className={`min-w-0 space-y-4 rounded-xl border border-primary-100 bg-neutral-0/80 p-4 shadow-sm ${className}`}
      aria-label={title}
    >
      {title && (
        <h2 className="text-lg font-semibold text-primary-950">{title}</h2>
      )}
      {children}
    </section>
  );
}
export function WorkflowStatus({ status }) {
  return (
    <StatusBadge
      status={
        status === "UNPAID"
          ? "pending"
          : status.toLowerCase().replaceAll("_", "-")
      }
    >
      {statusLabel(status)}
    </StatusBadge>
  );
}
