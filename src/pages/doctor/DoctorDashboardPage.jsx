import { useEffect, useMemo, useCallback, memo } from "react";
import { useDispatch, useSelector } from "react-redux";

import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import Icon from "../../components/Icon";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import {
  fetchTodayQueue,
  selectQueueRecords,
  selectQueueStatus,
} from "../../features/queue/queueSlice";
import { calculateQueueStatusCounts } from "../../utils/queueStatusCounts";

// Memoized individual queue row for high-performance re-renders
const QueueItem = memo(({ record }) => (
  <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:px-6 transition-all duration-150 hover:bg-neutral-50/80">
    <div className="flex items-center gap-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 font-semibold text-sm">
        #{record.appointmentId}
      </div>
      <div>
        <p className="font-semibold text-neutral-900">
          {record.patientFullName || `Appointment #${record.appointmentId}`}
        </p>
        <p className="text-xs text-neutral-500 mt-0.5">
          {record.appointmentTime || "Scheduled today"}
        </p>
      </div>
    </div>
    <div className="flex items-center justify-between sm:justify-end gap-3">
      <StatusBadge status={record.status}>{record.status}</StatusBadge>
    </div>
  </li>
));

QueueItem.displayName = "QueueItem";

const DoctorDashboardPage = () => {
  const dispatch = useDispatch();
  const queue = useSelector(selectQueueRecords);
  const queueStatus = useSelector(selectQueueStatus);

  const loading = queueStatus === "idle" || queueStatus === "loading";
  const error = queueStatus === "failed";

  const handleRefresh = useCallback(() => {
    dispatch(fetchTodayQueue());
  }, [dispatch]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const statusCounts = useMemo(
    () => calculateQueueStatusCounts(queue),
    [queue],
  );

  return (
    <div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-pulse"></span>
            Doctor Workspace
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
            Today’s Appointments
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Monitor and manage your active clinical queue in real time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-white shadow-sm"
          >
            <Icon
              name="refresh"
              className={`h-4 w-4 ${loading ? "animate-spin text-primary-600" : ""}`}
            />
            Refresh Queue
          </Button>
        </div>
      </header>

      {/* Queue Summary Section */}
      <section aria-labelledby="queue-summary-heading" className="mb-8">
        <h2
          id="queue-summary-heading"
          className="mb-4 text-base font-semibold text-neutral-900"
        >
          Overview Statistics
        </h2>
        {loading && queue.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-xs">
            <LoadingSpinner label="Loading today’s metrics..." />
          </div>
        ) : error ? (
          <div className="space-y-3">
            <ErrorMessage
              title="Unable to load summary metrics"
              message="Please check your connection and try refreshing."
            />
            <Button onClick={handleRefresh} loading={loading}>
              <Icon name="refresh" className="h-4 w-4" />
              Retry Connection
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-500">Total Patients</p>
                <div className="rounded-xl bg-neutral-100 p-2.5 text-neutral-700">
                  <Icon name="users" className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-extrabold tabular-nums tracking-tight text-neutral-950">
                {queue.length}
              </p>
            </article>
            {statusCounts.map(({ status, count }) => (
              <article
                key={status}
                className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-neutral-500">Status</span>
                  <StatusBadge status={status}>{status}</StatusBadge>
                </div>
                <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-neutral-950">
                  {count}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Today's Queue Section */}
      <section aria-labelledby="today-queue-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2
              id="today-queue-heading"
              className="text-base font-semibold text-neutral-900"
            >
              Active Patient Queue
            </h2>
            {!loading && !error && queue.length > 0 && (
              <p className="text-xs text-neutral-500 mt-0.5">
                Showing all {queue.length} scheduled {queue.length === 1 ? "consultation" : "consultations"} for today
              </p>
            )}
          </div>
        </div>

        {loading && queue.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-xs">
            <LoadingSpinner label="Loading active queue records..." />
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 shadow-xs">
            Queue records will appear here once the connection is restored.
          </p>
        ) : queue.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs">
            <EmptyState
              title="No Appointments Scheduled"
              message="Your queue is currently clear for today. You can open the full shared queue via the button above."
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xs">
            <ul className="divide-y divide-neutral-100">
              {queue.map((record) => (
                <QueueItem key={record.appointmentId} record={record} />
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
};

export default DoctorDashboardPage;