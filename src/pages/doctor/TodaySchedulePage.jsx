import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button";
import DatePicker from "../../components/DatePicker";
import Icon from "../../components/Icon";
import StatusBadge from "../../components/StatusBadge";
import Table from "../../components/Table";
import { PageHeader, PageShell } from "../../components/doctor/PageLayout";
import {
  ErrorPanel,
  SectionTitle,
  SkeletonBlock,
} from "../../components/doctor/Panel";
import PatientAvatarCell from "../../features/doctor/PatientAvatarCell";

import { getAppointments } from "../../services/appointmentService";
import useQueuePolling from "../../hooks/useQueuePolling";
import usePageVisible from "../../hooks/usePageVisible";
import { formatDisplayDate, toLocalDateString } from "../../utils/dateUtils";
import { formatTimeSlot } from "../../utils/timeUtils";

const DASH = "\u2014";

/**
 * DOC - Doctor's Today Schedule / Consultation Queue.
 *
 * Server-authoritative order, scoped to the selected local date.
 * The queue refreshes approximately every 2 seconds while the tab is visible.
 *
 * This page is read-only. Starting a consultation opens DOC-04, where
 * notes, prescriptions and consultation completion are handled.
 */
const TodaySchedulePage = () => {
  const navigate = useNavigate();
  const pageVisible = usePageVisible();

  const [selectedDate, setSelectedDate] = useState(() => toLocalDateString());
  const [records, setRecords] = useState([]);
  const [queueStatus, setQueueStatus] = useState("idle");

  const requestIdRef = useRef(0);
  const wasHiddenRef = useRef(false);

  const loading = queueStatus === "loading";
  const firstLoad = loading && records.length === 0;
  const failed = queueStatus === "failed";
  const refreshing = loading && records.length > 0;

  /**
   * Refresh appointments manually or through polling.
   * Request IDs prevent older requests from overwriting newer results.
   */
  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setQueueStatus("loading");

    try {
      const appointments = await getAppointments({
        date: selectedDate,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setRecords(appointments);
      setQueueStatus("succeeded");
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setQueueStatus("failed");
    }
  }, [selectedDate]);

  /**
   * Initial fetch and re-fetch whenever the selected date changes.
   */
  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;

    const loadSchedule = async () => {
      setQueueStatus("loading");

      try {
        const appointments = await getAppointments({
          date: selectedDate,
        });

        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        setRecords(appointments);
        setQueueStatus("succeeded");
      } catch {
        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        setQueueStatus("failed");
      }
    };

    loadSchedule();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  /**
   * Poll only while the tab is visible.
   */
  useQueuePolling({
    enabled: pageVisible,
    onTick: refresh,
  });

  /**
   * Refresh immediately when the user returns to the tab.
   */
  useEffect(() => {
    if (!pageVisible) {
      wasHiddenRef.current = true;
      return;
    }

    if (wasHiddenRef.current) {
      wasHiddenRef.current = false;
      refresh();
    }
  }, [pageVisible, refresh]);

  const handleDateChange = useCallback((event) => {
    setSelectedDate(event.target.value || toLocalDateString());
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "queuePosition",
        header: "#",
        render: (row) => (
          <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-xs font-medium text-neutral-700">
            {row.appointmentId ?? DASH}
          </span>
        ),
      },
      {
        key: "patientFullName",
        header: "Patient",
        render: (row) => (
          <PatientAvatarCell name={row.patientFullName} avatarSize="sm" />
        ),
      },
      {
        key: "timeSlot",
        header: "Time",
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 text-sm text-neutral-700">
            <Icon name="clock" className="h-3.5 w-3.5 text-neutral-400" />
            {formatTimeSlot(row.timeSlot)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) =>
          row.status === "CANCELLED" ? (
            <span className="text-sm text-neutral-400">{DASH}</span>
          ) : (
            <Button
              size="sm"
              variant={row.status === "COMPLETED" ? "outline" : "primary"}
              onClick={() =>
                navigate(`/doctor/consultation/${row.appointmentId}`)
              }
              className="inline-flex items-center gap-1.5"
            >
              {row.status === "COMPLETED"
                ? "View Consultation"
                : "Start Consultation"}
              <Icon name="arrow-right" className="h-3.5 w-3.5" />
            </Button>
          ),
      },
    ],
    [navigate],
  );

  // Simple live status counts, purely derived.
  const counts = useMemo(() => {
    let scheduled = 0;
    let inProgress = 0;
    let completed = 0;
    for (const row of records) {
      if (row.status === "SCHEDULED") scheduled += 1;
      else if (row.status === "IN_PROGRESS") inProgress += 1;
      else if (row.status === "COMPLETED") completed += 1;
    }
    return { scheduled, inProgress, completed };
  }, [records]);

  return (
    <PageShell>
      <PageHeader
        title={"Today\u2019s schedule"}
        description="Review appointments for the selected date and open the consultation screen to treat patients and complete appointments."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
              <Icon name="calendar" className="h-3 w-3 text-neutral-500" />
              {formatDisplayDate(selectedDate)}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                pageVisible
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${
                  pageVisible
                    ? "bg-emerald-500 motion-safe:animate-pulse"
                    : "bg-amber-500"
                }`}
              />
              {pageVisible ? "Live" : "Paused"}
            </span>
          </>
        }
        actions={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            <DatePicker
              id="schedule-date"
              name="scheduleDate"
              label="Date"
              value={selectedDate}
              onChange={handleDateChange}
              className="w-full min-w-40 sm:w-48"
            />

            <Button
              variant="outline"
              onClick={refresh}
              disabled={firstLoad}
              className="h-[38px] shrink-0 self-end inline-flex items-center gap-2 sm:self-auto"
            >
              <Icon
                name="refresh"
                className={`h-4 w-4 ${
                  refreshing ? "text-primary-600 motion-safe:animate-spin" : ""
                }`}
              />
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        }
      />

      <section aria-labelledby="schedule-queue-heading">
        <SectionTitle
          id="schedule-queue-heading"
          aside={
            !firstLoad && !failed && records.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 font-medium tabular-nums text-neutral-700">
                  {records.length} total
                </span>
                {counts.scheduled > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 font-medium tabular-nums text-primary-700 ring-1 ring-primary-100">
                    {counts.scheduled} scheduled
                  </span>
                )}
                {counts.inProgress > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-medium tabular-nums text-amber-700 ring-1 ring-amber-100">
                    {counts.inProgress} in progress
                  </span>
                )}
                {counts.completed > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium tabular-nums text-emerald-700 ring-1 ring-emerald-100">
                    {counts.completed} completed
                  </span>
                )}
              </div>
            ) : null
          }
        >
          Appointment queue
        </SectionTitle>

        {firstLoad ? (
          <SkeletonBlock label="Loading appointment queue" rows={5} />
        ) : failed ? (
          <ErrorPanel
            title="Unable to load the schedule"
            message="Please check your connection and try again."
            actionLabel="Retry"
            onAction={refresh}
            actionLoading={loading}
          />
        ) : (
          <Table
            columns={columns}
            data={records}
            getRowKey={(row) => row.appointmentId}
            emptyTitle="No appointments scheduled"
            emptyMessage="Pick another date or refresh to check again."
            label="Appointment queue for the selected date"
          />
        )}
      </section>
    </PageShell>
  );
};

export default TodaySchedulePage;
