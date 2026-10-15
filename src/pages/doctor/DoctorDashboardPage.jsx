import { memo, useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import StatusBadge from "../../components/StatusBadge";
import { PageHeader, PageShell } from "../../components/doctor/PageLayout";
import {
  ErrorPanel,
  Panel,
  SectionTitle,
  SkeletonBlock,
} from "../../components/doctor/Panel";
import {
  fetchTodayQueue,
  selectQueueRecords,
  selectQueueStatus,
} from "../../features/queue/queueSlice";
import { calculateQueueStatusCounts } from "../../utils/queueStatusCounts";
import { formatTimeSlot } from "../../utils/timeUtils";

const METRICS_LABEL = "Loading today\u2019s metrics...";

const QueueItem = memo(function QueueItem({ record }) {
  const timeLabel = record.timeSlot
    ? formatTimeSlot(record.timeSlot)
    : record.appointmentTime || "Scheduled today";

  return (
    <li className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 px-2 text-sm font-semibold text-primary-700">
          {`#${record.appointmentId}`}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-neutral-900">
            {record.patientFullName || `Appointment #${record.appointmentId}`}
          </p>
          <p className="mt-0.5 text-sm text-neutral-500">{timeLabel}</p>
        </div>
      </div>
      <StatusBadge status={record.status}>{record.status}</StatusBadge>
    </li>
  );
});

const StatCard = memo(function StatCard({ header, value }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2">{header}</div>
      <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-neutral-950">
        {value}
      </p>
    </article>
  );
});

const DoctorDashboardPage = () => {
  const dispatch = useDispatch();
  const queue = useSelector(selectQueueRecords);
  const queueStatus = useSelector(selectQueueStatus);

  const loading = queueStatus === "idle" || queueStatus === "loading";
  const error = queueStatus === "failed";
  const initialLoading = loading && queue.length === 0;

  const handleRefresh = useCallback(() => {
    dispatch(fetchTodayQueue());
  }, [dispatch]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const statusCounts = useMemo(() => calculateQueueStatusCounts(queue), [queue]);

  return (
    <PageShell>
      <PageHeader
        title={"Today\u2019s Appointments"}
        description="Monitor and manage your active clinical queue in real time."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-white"
          >
            <Icon
              name="refresh"
              className={`h-4 w-4 ${loading ? "text-primary-600 motion-safe:animate-spin" : ""}`}
            />
            Refresh Queue
          </Button>
        }
      />

      {error ? (
        <ErrorPanel
          title="Unable to load summary metrics"
          message="Please check your connection and try refreshing."
          actionLabel="Retry Connection"
          actionIcon="refresh"
          onAction={handleRefresh}
          actionLoading={loading}
        />
      ) : (
        <>
          <section aria-labelledby="queue-summary-heading">
            <SectionTitle id="queue-summary-heading">Overview Statistics</SectionTitle>
            {initialLoading ? (
              <div
                role="status"
                aria-label={METRICS_LABEL}
                aria-busy="true"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="h-28 rounded-2xl bg-neutral-100 motion-safe:animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  value={queue.length}
                  header={
                    <>
                      <p className="text-sm font-medium text-neutral-500">
                        Total Patients
                      </p>
                      <div className="rounded-xl bg-neutral-100 p-2.5 text-neutral-700">
                        <Icon name="users" className="h-4 w-4" />
                      </div>
                    </>
                  }
                />
                {statusCounts.map(({ status, count }) => (
                  <StatCard
                    key={status}
                    value={count}
                    header={<StatusBadge status={status}>{status}</StatusBadge>}
                  />
                ))}
              </div>
            )}
          </section>

          {initialLoading ? (
            <SkeletonBlock label="Loading active queue records..." rows={4} />
          ) : (
            <Panel
              icon="users"
              title="Active Patient Queue"
              titleId="today-queue-heading"
              padded={false}
              bodyClassName=""
              aside={
                queue.length > 0 ? (
                  <p className="text-sm text-neutral-500">
                    {queue.length} {queue.length === 1 ? "consultation" : "consultations"} today
                  </p>
                ) : null
              }
            >
              {queue.length === 0 ? (
                <EmptyState
                  title="No Appointments Scheduled"
                  message="Your queue is clear for today. New appointments appear here as they are booked."
                />
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {queue.map((record) => (
                    <QueueItem key={record.appointmentId} record={record} />
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </>
      )}
    </PageShell>
  );
};

export default DoctorDashboardPage;