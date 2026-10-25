import { Link } from "react-router-dom";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import StatCard from "../../components/StatCard";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import {
  WorkflowCard,
  WorkflowPage,
  WorkflowStatus,
} from "../../components/admin/WorkflowUI";
import useAdminDashboard from "../../hooks/useAdminDashboard";
import { statusLabel, workflowError } from "../../utils/adminWorkflows";

const metrics = [
  ["SCHEDULED", "calendar", "bg-primary-50 text-primary-700"],
  ["ARRIVED", "users", "bg-secondary-50 text-secondary-800"],
  ["COMPLETED", "circle-check", "bg-success-100 text-success-800"],
  ["NO_SHOW", "clock", "bg-warning-100 text-warning-900"],
];
const actions = [
  [
    "Register Patient",
    "/admin/register-patient",
    "user",
    "Create a new patient record",
  ],
  [
    "Book Appointment",
    "/admin/appointments?booking=new",
    "calendar",
    "Find a slot and book a visit",
  ],
  ["Queue Management", "/queue", "users", "Manage arrivals and today's queue"],
  [
    "Billing",
    "/admin/billing",
    "file-text",
    "Review invoices and record payments",
  ],
];
const linkStyle =
  "rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";

function LoadingCards({ count, label }) {
  return (
    <div role="status" aria-label={label} className="contents">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-32 animate-pulse rounded-2xl border border-primary-100 bg-primary-50 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

function ResourceError({ title, error, retry }) {
  const status = error?.status ?? error?.response?.status;
  const message =
    status === 429
      ? "Too many requests. Please wait a moment before retrying."
      : [401, 403].includes(status)
        ? workflowError(error)
        : "The summary could not be loaded. Please try again.";
  return (
    <div className="space-y-3">
      <ErrorMessage title={title} message={message} />
      <Button variant="outline" size="sm" onClick={retry}>
        Retry {title.toLowerCase()}
      </Button>
    </div>
  );
}

export default function AdminDashboardPage() {
  const {
    date,
    appointments,
    invoices,
    refresh,
    retryAppointments,
    retryInvoices,
  } = useAdminDashboard();
  const counts =
    !appointments.loading && !appointments.error ? appointments.data : null;
  const dateLabel = new Intl.DateTimeFormat("en-LK", {
    dateStyle: "full",
    timeZone: "Asia/Colombo",
  }).format(new Date(`${date}T12:00:00+05:30`));
  return (
    <WorkflowPage
      title="Admin Dashboard"
      subtitle="Overview of today's clinic activity"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-primary-800">
          <time dateTime={date}>{dateLabel}</time>
          <span className="ml-2 text-xs text-neutral-600">Asia/Colombo</span>
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={appointments.loading || invoices.loading}
        >
          <Icon name="refresh" size={16} />
          Refresh dashboard
        </Button>
      </div>
      <section
        aria-label="Today's appointment summary"
        aria-busy={appointments.loading}
        className="space-y-3"
      >
        {appointments.error ? (
          <ResourceError
            title="Appointments"
            error={appointments.error}
            retry={retryAppointments}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {appointments.loading ? (
              <LoadingCards count={5} label="Loading appointment summary" />
            ) : (
              <>
                <StatCard
                  label="Today's Appointments"
                  value={counts.total}
                  icon="calendar"
                  chip="All statuses"
                />
                {metrics.map(([status, icon, iconClass]) => (
                  <StatCard
                    key={status}
                    label={statusLabel(status)}
                    value={counts.byStatus[status]}
                    icon={icon}
                    iconClass={iconClass}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </section>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <WorkflowCard title="Today's Queue Summary" className="lg:col-span-2">
          <p className="text-sm text-neutral-600">
            Appointment statuses for the clinic date shown above.
          </p>
          {appointments.loading ? (
            <p role="status">Loading queue summary…</p>
          ) : appointments.error ? (
            <p className="text-sm text-neutral-600">
              Queue summary unavailable. Retry the appointments summary above.
            </p>
          ) : (
            <>
              {counts.total === 0 ? (
                <EmptyState
                  title="No appointments today"
                  message="Today's activity will appear here when appointments are booked."
                />
              ) : null}
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {metrics.map(([status]) => (
                  <div
                    key={status}
                    className="min-w-0 rounded-lg border border-primary-100 bg-primary-50/40 p-3"
                  >
                    <dt>
                      <WorkflowStatus status={status} />
                    </dt>
                    <dd className="mt-2 text-2xl font-bold text-primary-950">
                      {counts.byStatus[status]}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-neutral-600">
                Cancelled: <strong>{counts.byStatus.CANCELLED}</strong>.
                Included in today's appointment total; excluded from the active
                queue.
              </p>
            </>
          )}
          <Link
            className={`${linkStyle} inline-flex items-center gap-2 text-sm font-semibold text-primary-700`}
            to="/queue"
          >
            Open Queue Management <Icon name="arrow-right" size={16} />
          </Link>
        </WorkflowCard>
        <WorkflowCard title="Billing Overview">
          <p className="text-sm text-neutral-600">
            Unpaid and partially paid invoices across all dates.
          </p>
          <div aria-busy={invoices.loading}>
            {invoices.loading ? (
              <LoadingCards count={1} label="Loading pending invoices" />
            ) : invoices.error ? (
              <ResourceError
                title="Pending invoices"
                error={invoices.error}
                retry={retryInvoices}
              />
            ) : (
              <>
                <StatCard
                  label="Pending Invoices"
                  value={invoices.data}
                  icon="file-text"
                  iconClass="bg-warning-100 text-warning-900"
                />
                {invoices.data === 0 ? (
                  <p className="mt-3 text-sm text-neutral-600">
                    No pending invoices.
                  </p>
                ) : null}
              </>
            )}
          </div>
          <Link
            className={`${linkStyle} inline-flex items-center gap-2 text-sm font-semibold text-primary-700`}
            to="/admin/billing"
          >
            Open Billing <Icon name="arrow-right" size={16} />
          </Link>
        </WorkflowCard>
      </div>
      <WorkflowCard title="Quick Actions">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map(([label, to, icon, description]) => (
            <Link
              key={to}
              to={to}
              className={`${linkStyle} group flex min-w-0 items-start gap-3 border border-primary-100 bg-neutral-0 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50`}
            >
              <span className="rounded-lg bg-primary-50 p-2 text-primary-700">
                <Icon name={icon} size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-primary-900">
                  {label}
                </span>
                <span className="mt-1 block text-xs text-neutral-600">
                  {description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </WorkflowCard>
    </WorkflowPage>
  );
}
