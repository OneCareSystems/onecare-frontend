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

/** Maps appointment status to a visual accent (dot, soft bg, text). */
const STATUS_ACCENTS = {
  SCHEDULED: {
    dot: "bg-primary-500",
    bg: "bg-primary-50",
    text: "text-primary-700",
    icon: "calendar",
  },
  IN_PROGRESS: {
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: "clock",
  },
  COMPLETED: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    icon: "check-circle",
  },
  CANCELLED: {
    dot: "bg-rose-500",
    bg: "bg-rose-50",
    text: "text-rose-700",
    icon: "x-circle",
  },
};

const getAccent = (status) =>
  STATUS_ACCENTS[status] ?? {
    dot: "bg-neutral-400",
    bg: "bg-neutral-100",
    text: "text-neutral-600",
    icon: "circle",
  };

const QueueItem = memo(function QueueItem({ record }) {
  const timeLabel = record.timeSlot
    ? formatTimeSlot(record.timeSlot)
    : record.appointmentTime || "Scheduled today";

  const accent = getAccent(record.status);

  return (
    <li className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-neutral-50/80 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-11 min-w-11 shrink-0 flex-col items-center justify-center rounded-xl ${accent.bg} px-2 text-xs font-bold leading-tight ${accent.text} ring-1 ring-inset ring-black/5`}
        >
          <span className="text-[10px] font-medium uppercase opacity-70">
            ID
          </span>
          <span className="tabular-nums">#{record.appointmentId}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-neutral-900">
            {record.patientFullName || `Appointment #${record.appointmentId}`}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500">
            <Icon name="clock" className="h-3.5 w-3.5 text-neutral-400" />
            {timeLabel}
          </p>
        </div>
      </div>
      <StatusBadge status={record.status}>{record.status}</StatusBadge>
    </li>
  );
});

const StatCard = memo(function StatCard({
  header,
  value,
  accent,
  sublabel,
  loading,
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
      {/* Accent bar */}
      <span
        className={`absolute inset-x-0 top-0 h-0.5 ${accent?.dot ?? "bg-neutral-200"}`}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-2">{header}</div>

      {loading ? (
        <div className="mt-4 h-9 w-16 rounded-lg bg-neutral-100 motion-safe:animate-pulse" />
      ) : (
        <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-neutral-950">
          {value}
        </p>
      )}

      {sublabel && (
        <p className="mt-1 text-xs text-neutral-400">{sublabel}</p>
      )}
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
  const refreshing = loading && queue.length > 0;

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

  // Count how many are still "active" (not completed/cancelled)
  const activeCount = useMemo(
    () =>
      queue.filter(
        (r) => r.status !== "COMPLETED" && r.status !== "CANCELLED",
      ).length,
    [queue],
  );

  return (
    <PageShell>
      <PageHeader
        title={"Today\u2019s Appointments"}
        description="Monitor and manage your active clinical queue in real time."
        meta={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
              <span
                className={`h-1.5 w-1.5 rounded-full ${loading ? "bg-amber-400" : "bg-emerald-500"} ${!loading ? "motion-safe:animate-pulse" : ""}`}
              />
              {loading ? "Syncing…" : "Live"}
            </span>
          </div>
        }
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
            {refreshing ? "Refreshing…" : "Refresh Queue"}
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
            <SectionTitle id="queue-summary-heading">
              Overview Statistics
            </SectionTitle>
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
                  sublabel={`${activeCount} still active`}
                  accent={getAccent("SCHEDULED")}
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
                {statusCounts.map(({ status, count }) => {
                  const accent = getAccent(status);
                  return (
                    <StatCard
                      key={status}
                      value={count}
                      accent={accent}
                      header={
                        <>
                          <StatusBadge status={status}>{status}</StatusBadge>
                          <div
                            className={`rounded-xl ${accent.bg} p-2.5 ${accent.text}`}
                          >
                            <Icon name={accent.icon} className="h-4 w-4" />
                          </div>
                        </>
                      }
                    />
                  );
                })}
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
                    <span className="font-semibold tabular-nums text-neutral-800">
                      {queue.length}
                    </span>{" "}
                    {queue.length === 1 ? "consultation" : "consultations"}{" "}
                    today
                  </p>
                ) : null
              }
            >
              {queue.length === 0 ? (
                <div className="px-6 py-10">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                      <Icon name="check-circle" className="h-6 w-6" />
                    </div>
                    <p className="text-base font-semibold text-neutral-800">
                      Your queue is clear
                    </p>
                    <p className="text-sm text-neutral-500">
                      No appointments are scheduled for today. New bookings
                      will appear here automatically.
                    </p>
                  </div>
                </div>
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