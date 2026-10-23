import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Button from "../../components/Button";
import Icon from "../../components/Icon";
import StatCard from "../../components/StatCard";
import ErrorMessage from "../../components/ErrorMessage";
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
import { getDoctorSchedule } from "../../services/doctorScheduleService";
import { getCurrentUser } from "../../services/authService";
import { DAY_LABELS, WORKING_DAYS } from "../../constants/schedule";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const normalizeWeek = (days = []) =>
  WORKING_DAYS.map((dayOfWeek) => ({
    dayOfWeek,
    timeSlots: (
      days.find((d) => d.dayOfWeek === dayOfWeek)?.timeSlots ?? []
    ).map((s) => ({ start: s.start, end: s.end })),
  }));

const getAccent = (status) =>
  ({
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
  })[status] ?? {
    dot: "bg-neutral-400",
    bg: "bg-neutral-100",
    text: "text-neutral-600",
    icon: "circle",
  };

/* ------------------------------------------------------------------ */
/* Read-only week strip (no edit affordance)                           */
/* ------------------------------------------------------------------ */

const DoctorScheduleGrid = ({ days, loading }) => {
  if (loading) {
    return (
      <div className="grid animate-pulse grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-neutral-100" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {days.map((day) => {
        const isWorking = day.timeSlots.length > 0;
        return (
          <div
            key={day.dayOfWeek}
            className={`rounded-lg border p-2 ${
              isWorking
                ? "border-primary-200 bg-primary-50/60"
                : "border-neutral-200 bg-neutral-50/60"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              {DAY_LABELS[day.dayOfWeek]?.slice(0, 3) ?? day.dayOfWeek}
            </p>
            {isWorking ? (
              <div className="mt-1 space-y-0.5">
                {day.timeSlots.map((s, i) => (
                  <p key={i} className="font-mono text-[11px] text-primary-800">
                    {s.start}–{s.end}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-neutral-400">Off</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

const DoctorDashboardPage = () => {
  const dispatch = useDispatch();
  const queue = useSelector(selectQueueRecords);
  const queueStatus = useSelector(selectQueueStatus);
  const currentUser = useSelector((s) => s.auth?.user);

  const loading = queueStatus === "idle" || queueStatus === "loading";
  const error = queueStatus === "failed";
  const initialLoading = loading && queue.length === 0;
  const refreshing = loading && queue.length > 0;

  /* ---- today's queue ---- */
  const handleRefresh = useCallback(() => {
    dispatch(fetchTodayQueue());
  }, [dispatch]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  /* ---- my schedule ---- */
  const [schedule, setSchedule] = useState({
    status: "loading",
    days: normalizeWeek([]),
  });
  const [scheduleReload, setScheduleReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSchedule({ status: "loading", days: normalizeWeek([]) });
      try {
        // Login may only provide a username. Resolve the authenticated profile
        // first so the schedule request always uses the backend's doctor ID.
        const profileResponse = await getCurrentUser();
        const profile = profileResponse.data?.data ?? profileResponse.data;
        const doctorId = profile?.userId ?? profile?.id ?? currentUser?.userId;
        if (doctorId == null || String(doctorId).trim() === "") {
          throw new Error("The current user response did not include an ID");
        }
        const res = await getDoctorSchedule(doctorId);
        if (cancelled) return;
        setSchedule({
          status: "ready",
          days: normalizeWeek(res.days),
        });
      } catch {
        if (!cancelled) setSchedule({ status: "failed", days: normalizeWeek([]) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.userId, scheduleReload]);

  /* ---- derived queue stats ---- */
  const statusCounts = useMemo(
    () => calculateQueueStatusCounts(queue),
    [queue],
  );

  const activeCount = useMemo(
    () =>
      queue.filter(
        (r) => r.status !== "COMPLETED" && r.status !== "CANCELLED",
      ).length,
    [queue],
  );

  const completedCount = useMemo(
    () => queue.filter((r) => r.status === "COMPLETED").length,
    [queue],
  );

  // "Today's patients" = distinct patients in today's queue
  const todayPatients = useMemo(() => {
    const map = new Map();
    for (const r of queue) {
      const key = r.patientId ?? r.patientFullName ?? r.appointmentId;
      if (!map.has(key)) map.set(key, r);
    }
    return Array.from(map.values());
  }, [queue]);

  /* ---- quick navigation tiles ---- */
  const quickActions = [
    {
      title: "Today's Schedule",
      desc: "Timeline view of every appointment booked for today.",
      icon: "calendar",
      to: "/doctor/today-schedule",
      color: "bg-primary-50 text-primary-700",
    },
    {
      title: "Patient Records",
      desc: "Browse patients, medical history, and prior consultations.",
      icon: "users",
      to: "/doctor/patient-records",
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      title: "Knowledge Base",
      desc: "Clinical guidelines, reference notes, and saved articles.",
      icon: "book",
      to: "/doctor/knowledge-base",
      color: "bg-violet-50 text-violet-700",
    },
  ];

  return (
    <PageShell>
      {/* Hero */}
      <PageHeader
        title={"Today\u2019s Overview"}
        description="Your live queue, today's patients, and weekly working hours — all in one place."
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                loading ? "bg-amber-400" : "bg-emerald-500"
              } ${!loading ? "motion-safe:animate-pulse" : ""}`}
            />
            {loading ? "Syncing…" : "Live"}
          </span>
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
              className={`h-4 w-4 ${
                loading ? "text-primary-600 motion-safe:animate-spin" : ""
              }`}
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      {error && (
        <ErrorMessage
          title="Queue data unavailable"
          message="Please check your connection and try refreshing."
        />
      )}

      {/* ---- Overview Stats ---- */}
      <section aria-labelledby="overview-heading">
        <SectionTitle id="overview-heading">Overview</SectionTitle>
        {initialLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl bg-neutral-100"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Today's Appointments"
              value={queue.length}
              chip={`${activeCount} active`}
              icon="calendar"
              iconClass="bg-primary-50 text-primary-700"
              chipClass="bg-primary-100 text-primary-800"
            />
            <StatCard
              label="Today's Patients"
              value={todayPatients.length}
              chip="Unique"
              icon="users"
              iconClass="bg-emerald-50 text-emerald-700"
              chipClass="bg-emerald-100 text-emerald-800"
            />
            <StatCard
              label="Completed"
              value={completedCount}
              chip="Consultations"
              icon="check-circle"
              iconClass="bg-violet-50 text-violet-700"
              chipClass="bg-violet-100 text-violet-800"
            />
            <StatCard
              label="Still Pending"
              value={activeCount}
              chip="To see"
              icon="clock"
              iconClass="bg-amber-50 text-amber-700"
              chipClass="bg-amber-100 text-amber-800"
            />
          </div>
        )}
      </section>

      {/* ---- Quick navigation tiles ---- */}
      <section className="space-y-3" aria-labelledby="quick-actions-heading">
        <h2
          id="quick-actions-heading"
          className="text-sm font-semibold text-neutral-900"
        >
          My Workspace
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition hover:border-neutral-300 hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}
                  >
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                  <Icon
                    name="arrow-right"
                    className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-700"
                  />
                </div>
                <h3 className="mt-3 text-base font-semibold text-neutral-900 group-hover:text-primary-700">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  {item.desc}
                </p>
              </div>
              <div className="mt-4 border-t border-neutral-100 pt-3">
                <span className="text-xs font-semibold text-primary-600 group-hover:underline">
                  Open &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- Weekly schedule (read-only) ---- */}
      <Panel
        icon="calendar"
        title="My Weekly Schedule"
        titleId="my-schedule-heading"
        aside={
          <span className="text-xs text-neutral-500">
            Read-only · contact super-admin to change
          </span>
        }
      >
        {schedule.status === "failed" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 py-2">
            <p className="text-sm text-neutral-500">
              Could not load your schedule. Please try again.
            </p>
            <Button
              variant="secondary"
              onClick={() => setScheduleReload((value) => value + 1)}
            >
              Retry
            </Button>
          </div>
        ) : (
          <DoctorScheduleGrid
            days={schedule.days}
            loading={schedule.status === "loading"}
          />
        )}
      </Panel>

      {/* ---- Today's queue preview ---- */}
      <Panel
        icon="users"
        title="Today's Queue"
        titleId="today-queue-heading"
        padded={false}
        aside={
          queue.length > 0 ? (
            <Link
              to="/doctor/today-schedule"
              className="text-xs font-semibold text-primary-600 hover:underline"
            >
              View full schedule &rarr;
            </Link>
          ) : null
        }
      >
        {initialLoading ? (
          <SkeletonBlock label="Loading today's queue…" rows={3} />
        ) : queue.length === 0 ? (
          <div className="px-6 py-10">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                <Icon name="check-circle" className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold text-neutral-800">
                Your queue is clear
              </p>
              <p className="text-sm text-neutral-500">
                No appointments are scheduled for today. New bookings will
                appear here automatically.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {queue.slice(0, 6).map((record) => {
              const accent = getAccent(record.status);
              const timeLabel = record.timeSlot
                ? formatTimeSlot(record.timeSlot)
                : record.appointmentTime || "Scheduled today";
              return (
                <li
                  key={record.appointmentId}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-neutral-50/80 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-11 min-w-11 shrink-0 flex-col items-center justify-center rounded-xl ${accent.bg} px-2 text-xs font-bold leading-tight ${accent.text} ring-1 ring-inset ring-black/5`}
                    >
                      <span className="text-[10px] font-medium uppercase opacity-70">
                        ID
                      </span>
                      <span className="tabular-nums">
                        #{record.appointmentId}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-neutral-900">
                        {record.patientFullName ||
                          `Appointment #${record.appointmentId}`}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500">
                        <Icon
                          name="clock"
                          className="h-3.5 w-3.5 text-neutral-400"
                        />
                        {timeLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={record.status}>
                      {record.status}
                    </StatusBadge>
                    <Link
                      to={`/doctor/consultation/${record.appointmentId}`}
                      className="text-xs font-semibold text-primary-600 hover:underline"
                    >
                      Open &rarr;
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </PageShell>
  );
};

export default DoctorDashboardPage;
