import { useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

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
    <div className="mx-auto max-w-6xl py-4 sm:py-6">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary-700">
            Doctor workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
            Today’s appointments
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Your current appointment queue and status overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2"
          >
            <Icon
              name="refresh"
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Link
            to="/queue"
            className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <Icon name="list-checks" className="h-4 w-4" />
            Open queue
          </Link>
        </div>
      </header>

      {/* Queue Summary Section */}
      <section aria-labelledby="queue-summary-heading" className="mb-8">
        <h2
          id="queue-summary-heading"
          className="mb-3 text-lg font-semibold text-neutral-900"
        >
          Queue summary
        </h2>
        {loading && queue.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <LoadingSpinner label="Loading today’s appointments" />
          </div>
        ) : error ? (
          <div className="space-y-3">
            <ErrorMessage
              title="Unable to load today’s appointments"
              message="Please check your connection and try again."
            />
            <Button onClick={handleRefresh} loading={loading}>
              <Icon name="refresh" className="h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-neutral-600">Appointments today</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-950">
                {queue.length}
              </p>
            </article>
            {statusCounts.map(({ status, count }) => (
              <article
                key={status}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <p className="mb-2 text-sm text-neutral-600">By status</p>
                <StatusBadge status={status}>{status}</StatusBadge>
                <p className="mt-2 text-xl font-bold tabular-nums text-neutral-950">
                  {count}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Today's Queue Section */}
      <section aria-labelledby="today-queue-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2
              id="today-queue-heading"
              className="text-lg font-semibold text-neutral-900"
            >
              Today’s queue
            </h2>
            {!loading && !error && queue.length > 0 && (
              <p className="mt-1 text-sm text-neutral-600">
                {queue.length}{" "}
                {queue.length === 1 ? "appointment" : "appointments"}
              </p>
            )}
          </div>
        </div>

        {loading && queue.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <LoadingSpinner label="Loading today’s queue" />
          </div>
        ) : error ? (
          <p className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
            Queue details will appear here when the service is available.
          </p>
        ) : queue.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white">
            <EmptyState
              title="No appointments scheduled for today."
              message="Your queue is empty. You can still open the shared queue from the navigation above."
            />
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {queue.map((record) => (
              <li
                key={record.appointmentId}
                className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-neutral-50 sm:px-5"
              >
                <div>
                  <p className="font-semibold text-neutral-900">
                    Appointment {record.appointmentId}
                  </p>
                </div>
                <StatusBadge status={record.status}>
                  {record.status}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default DoctorDashboardPage;
